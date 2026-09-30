/**
 * QQ 开放平台 REST API 封装。
 * 鉴权头：Authorization: QQBot <access_token>，X-Union-Appid: <appid>
 */
import { apiHost, QQConfig, SeqTracker } from './protocol';
import { getToken } from './token';

export interface QQApiError {
  code: number | string | null;
  message: string;
  httpStatus: number;
}

export class QQRequestError extends Error {
  code: number | string | null;
  httpStatus: number;

  constructor(info: QQApiError) {
    super(info.message);
    this.name = 'QQRequestError';
    this.code = info.code;
    this.httpStatus = info.httpStatus;
  }
}

async function request<T>(
  cfg: QQConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken(cfg);
  const res = await fetch(`${apiHost(cfg)}${path}`, {
    method,
    headers: {
      Authorization: `QQBot ${token}`,
      'X-Union-Appid': cfg.appid,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && (data.message || data.msg)) ||
      (typeof data === 'string' ? data : JSON.stringify(data)) ||
      res.statusText;
    throw new QQRequestError({
      code: data && typeof data === 'object' ? data.code ?? null : null,
      message: msg,
      httpStatus: res.status,
    });
  }
  // 成功响应体里也可能带业务错误码
  if (data && typeof data === 'object' && typeof data.code === 'number' && data.code !== 0 && data.id == null) {
    throw new QQRequestError({
      code: data.code,
      message: data.message || data.msg || `业务错误 code=${data.code}`,
      httpStatus: res.status,
    });
  }
  return data as T;
}

/** 获取机器人信息（当前登录的 bot） */
export function getMe(cfg: QQConfig): Promise<{ id?: string; username?: string; avatar?: string }> {
  return request(cfg, 'GET', '/users/@me');
}

/** 获取 websocket 网关地址与分片信息 */
export function getGatewayInfo(cfg: QQConfig): Promise<{
  url: string;
  shards?: number;
  session_start_limit?: { max_concurrency?: number; remaining?: number };
}> {
  return request(cfg, 'GET', '/gateway/bot');
}

export interface SendTextResult {
  id?: string;
  timestamp?: string;
}

/** 全局 msg_seq 追踪器（每个目标会话一条回复序列） */
const seqTrackers = new Map<string, SeqTracker>();

/** 取某个目标（群/单聊）的 msg_seq 追踪器 */
function trackerFor(target: string): SeqTracker {
  let t = seqTrackers.get(target);
  if (!t) {
    t = new SeqTracker();
    seqTrackers.set(target, t);
  }
  return t;
}

/**
 * 发送群消息（QQ 群机器人 v2 接口）
 * @param passiveMsgId 被动回复时引用的消息 id（5 分钟内有效），不传即主动消息（有配额限制）
 */
export function sendGroupText(
  cfg: QQConfig,
  groupOpenid: string,
  content: string,
  passiveMsgId?: string,
): Promise<SendTextResult> {
  const body: Record<string, unknown> = {
    content,
    msg_type: 0,
    msg_seq: trackerFor(`group:${groupOpenid}`).next(passiveMsgId),
  };
  if (passiveMsgId) body.msg_id = passiveMsgId;
  return request(cfg, 'POST', `/v2/groups/${groupOpenid}/messages`, body);
}

/** 发送 C2C（好友单聊）消息 */
export function sendC2CText(
  cfg: QQConfig,
  openid: string,
  content: string,
  passiveMsgId?: string,
): Promise<SendTextResult> {
  const body: Record<string, unknown> = {
    content,
    msg_type: 0,
    msg_seq: trackerFor(`c2c:${openid}`).next(passiveMsgId),
  };
  if (passiveMsgId) body.msg_id = passiveMsgId;
  return request(cfg, 'POST', `/v2/users/${openid}/messages`, body);
}

/** 发送频道子频道消息（被动回复需 msg_id） */
export function sendChannelText(
  cfg: QQConfig,
  channelId: string,
  content: string,
  passiveMsgId?: string,
): Promise<SendTextResult> {
  const body: Record<string, unknown> = { content };
  if (passiveMsgId) body.msg_id = passiveMsgId;
  return request(cfg, 'POST', `/channels/${channelId}/messages`, body);
}

/** 发送频道私信（dms） */
export function sendDmText(
  cfg: QQConfig,
  guildId: string,
  content: string,
  passiveMsgId?: string,
): Promise<SendTextResult> {
  const body: Record<string, unknown> = { content };
  if (passiveMsgId) body.msg_id = passiveMsgId;
  return request(cfg, 'POST', `/dms/${guildId}/messages`, body);
}

/** 我加入的频道列表（用于手动挑选频道场景目标） */
export function listMyGuilds(
  cfg: QQConfig,
): Promise<Array<{ id: string; name: string; icon?: string }>> {
  return request(cfg, 'GET', '/users/@me/guilds?limit=200');
}

/** 频道下的子频道列表 */
export function listGuildChannels(
  cfg: QQConfig,
  guildId: string,
): Promise<Array<{ id: string; name: string; type?: number }>> {
  return request(cfg, 'GET', `/guilds/${guildId}/channels`);
}
