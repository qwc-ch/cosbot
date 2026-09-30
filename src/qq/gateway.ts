/**
 * QQ 开放平台 websocket 网关客户端。
 * 协议参考 qq-botpy 1.2.1 gateway.py：
 *  - 连上后服务端下发 op:10 Hello（含 heartbeat_interval）
 *  - 客户端发 op:2 Identify（token + intents + shard）
 *  - 心跳 op:1（d 为 last_seq），收到 op:11 ACK
 *  - op:0 Dispatch 推送业务事件
 *  - op:7 服务端要求重连、op:9 会话失效
 */
import { computeIntents, QQConfig } from './protocol';
import { getGatewayInfo } from './api';
import { getToken, invalidateToken } from './token';

export type GatewayStatus =
  | 'idle'
  | 'connecting'
  | 'identifying'
  | 'online'
  | 'reconnecting'
  | 'error';

export interface GatewayEvent {
  /** 事件名，如 GROUP_AT_MESSAGE_CREATE */
  type: string;
  data: any;
}

export interface GatewayCallbacks {
  onStatus: (status: GatewayStatus, detail?: string) => void;
  onEvent: (event: GatewayEvent) => void;
  onLog: (line: string) => void;
}

const OP = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
} as const;

/** 关闭码：鉴权失败 */
const AUTH_FAIL_CODES = [4004];
/** 关闭码：无法通过 resume 恢复，需要重新 identify */
const NO_RESUME_CODES = [4009, 4014, 9001, 9005];

export class QQGateway {
  private ws: WebSocket | null = null;
  private cfg: QQConfig;
  private cb: GatewayCallbacks;

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private wantRunning = false;
  private everOnline = false;

  private lastSeq = 0;
  private sessionId = '';
  private botName = '';
  private botId = '';

  constructor(cfg: QQConfig, cb: GatewayCallbacks) {
    this.cfg = cfg;
    this.cb = cb;
  }

  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  get identity(): { name: string; id: string } {
    return { name: this.botName, id: this.botId };
  }

  /** 更新配置（需要重连时由外部先 stop 再 start） */
  updateConfig(cfg: QQConfig): void {
    this.cfg = cfg;
  }

  start(): void {
    this.wantRunning = true;
    this.reconnectAttempt = 0;
    void this.open();
  }

  stop(): void {
    this.wantRunning = false;
    this.clearTimers();
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      try {
        ws.close(1000, 'client stop');
      } catch {
        /* ignore */
      }
    }
    this.cb.onStatus('idle');
  }

  private setStatus(status: GatewayStatus, detail?: string): void {
    this.cb.onStatus(status, detail);
  }

  private log(line: string): void {
    this.cb.onLog(line);
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async open(): Promise<void> {
    if (!this.wantRunning) return;
    this.clearTimers();

    try {
      this.setStatus(this.everOnline ? 'reconnecting' : 'connecting');
      const token = await getToken(this.cfg);
      const info = await getGatewayInfo(this.cfg);
      if (!this.wantRunning) return;
      const url = info.url;
      if (!url) throw new Error('网关返回的 url 为空');
      this.log(`网关地址：${url}`);

      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => this.log('websocket 已连接，等待 Hello...');
      ws.onmessage = (msg) => this.handleMessage(msg.data);
      ws.onerror = () => this.log('websocket 发生错误');
      ws.onclose = (ev) => this.handleClose(ev.code, ev.reason);
    } catch (err: any) {
      this.log(`连接失败：${err?.message ?? err}`);
      this.setStatus('error', err?.message ?? String(err));
      this.scheduleReconnect();
    }
  }

  private handleClose(code: number, reason: string): void {
    this.clearTimers();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onopen = null;
      this.ws = null;
    }
    if (!this.wantRunning) {
      this.setStatus('idle');
      return;
    }
    this.log(`连接关闭：code=${code} ${reason || ''}`);
    if (AUTH_FAIL_CODES.includes(code)) {
      invalidateToken();
      this.log('鉴权失败，已废弃缓存 token');
    }
    if (NO_RESUME_CODES.includes(code)) {
      this.sessionId = '';
      this.lastSeq = 0;
    }
    this.setStatus('reconnecting', reason || `code=${code}`);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (!this.wantRunning || this.reconnectTimer) return;
    this.reconnectAttempt += 1;
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(this.reconnectAttempt, 5));
    this.log(`${Math.round(delay / 1000)}s 后重连（第 ${this.reconnectAttempt} 次）`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.open();
    }, delay);
  }

  private send(payload: unknown): boolean {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch (err: any) {
      this.log(`发送帧失败：${err?.message ?? err}`);
      return false;
    }
  }

  private handleMessage(raw: unknown): void {
    let text: string;
    if (typeof raw === 'string') {
      text = raw;
    } else if (raw instanceof ArrayBuffer) {
      // QQ 网关默认不压缩时为文本帧；收到二进制帧说明网关开了压缩，当前不支持
      this.log('收到未支持的二进制压缩帧，忽略');
      return;
    } else {
      text = String(raw);
    }

    let msg: any;
    try {
      msg = JSON.parse(text);
    } catch {
      this.log(`无法解析的帧：${text.slice(0, 120)}`);
      return;
    }

    const op: number = msg.op;
    const seq: number | undefined = msg.s;
    if (typeof seq === 'number' && seq > this.lastSeq) this.lastSeq = seq;

    switch (op) {
      case OP.HELLO: {
        const interval = Number(msg.d?.heartbeat_interval) || 30_000;
        this.log(`收到 Hello，心跳间隔 ${interval}ms`);
        this.startHeartbeat(interval);
        void this.identify();
        break;
      }
      case OP.HEARTBEAT_ACK:
        break;
      case OP.DISPATCH:
        this.handleDispatch(msg.t, msg.d);
        break;
      case OP.RECONNECT:
        this.log('服务端要求重连');
        this.ws?.close(4000, 'server reconnect');
        break;
      case OP.INVALID_SESSION:
        this.log('会话失效（Invalid Session）');
        this.sessionId = '';
        this.lastSeq = 0;
        this.ws?.close(4001, 'invalid session');
        break;
      default:
        this.log(`未处理的 op=${op}`);
    }
  }

  private async identify(): Promise<void> {
    this.setStatus('identifying');
    let token: string;
    try {
      token = await getToken(this.cfg);
    } catch (err: any) {
      this.log(`Identify 取 token 失败：${err?.message ?? err}`);
      this.setStatus('error', err?.message ?? String(err));
      this.ws?.close(4004, 'token unavailable');
      return;
    }
    const ok = this.send({
      op: OP.IDENTIFY,
      d: {
        shard: [0, 1],
        token: `QQBot ${token}`,
        intents: computeIntents(this.cfg),
      },
    });
    if (!ok) this.log('Identify 发送失败');
  }

  private startHeartbeat(intervalMs: number): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.send({ op: OP.HEARTBEAT, d: this.lastSeq || null });
    }, intervalMs);
    // 立即补一帧，减少冷启动等待
    this.send({ op: OP.HEARTBEAT, d: this.lastSeq || null });
  }

  private handleDispatch(type: string, data: any): void {
    if (type === 'READY') {
      this.everOnline = true;
      this.reconnectAttempt = 0;
      this.sessionId = String(data?.session_id ?? '');
      this.botName = String(data?.user?.username ?? '');
      this.botId = String(data?.user?.id ?? '');
      this.log(`机器人「${this.botName}」上线成功`);
      this.setStatus('online');
      return;
    }
    if (type === 'RESUMED') {
      this.reconnectAttempt = 0;
      this.log('会话已恢复（RESUMED）');
      this.setStatus('online');
      return;
    }
    if (type) {
      this.cb.onEvent({ type, data });
    }
  }
}
