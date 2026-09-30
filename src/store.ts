/**
 * 全局状态：配置、连接、会话列表、消息历史、发送逻辑。
 * 会话与消息持久化到 AsyncStorage。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AppState, AppStateStatus } from 'react-native';

import {
  attachmentsToText,
  DEFAULT_CONFIG,
  parseTs,
  PASSIVE_REPLY_WINDOW_MS,
  QQConfig,
  Scene,
  stripBotMention,
  uid,
} from './qq/protocol';
import {
  sendC2CText,
  sendChannelText,
  sendDmText,
  sendGroupText,
} from './qq/api';
import { GatewayStatus, QQGateway } from './qq/gateway';

export interface ChatMessage {
  id: string;
  /** incoming: 对方发来的；outgoing: 我以 bot 身份发出的 */
  dir: 'in' | 'out';
  text: string;
  ts: number;
  /** 入站消息的 QQ 消息 id，用于 5 分钟内被动回复 */
  remoteId?: string;
  /** 发送状态（出站） */
  state?: 'sending' | 'sent' | 'failed';
  error?: string;
}

export interface Session {
  key: string;
  scene: Scene;
  /** group: group_openid / c2c: openid / channel: channel_id / dm: guild_id */
  targetId: string;
  /** dm 场景发送用 guild_id（targetId 也存它）；channel 场景额外记 guild 便于展示 */
  guildId?: string;
  title: string;
  lastMsgId?: string;
  lastMsgAt?: number;
  unread: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface LogLine {
  id: string;
  ts: number;
  text: string;
}

interface State {
  config: QQConfig;
  status: GatewayStatus;
  statusDetail?: string;
  botName: string;
  botId: string;
  sessions: Record<string, Session>;
  logs: LogLine[];
  sending: boolean;

  setConfig: (patch: Partial<QQConfig>) => void;
  connect: () => void;
  disconnect: () => void;
  restartGateway: () => void;
  setStatus: (s: GatewayStatus, detail?: string) => void;
  onGatewayEvent: (type: string, data: any) => void;
  pushLog: (text: string) => void;
  clearLogs: () => void;
  markRead: (key: string) => void;
  addManualSession: (scene: Scene, targetId: string, title: string, guildId?: string) => string;
  removeSession: (key: string) => void;
  sendText: (key: string, text: string) => Promise<void>;
}

const PERSIST_KEY = 'cosbot-state-v1';
const MAX_MESSAGES = 200;
const MAX_LOGS = 300;

let gateway: QQGateway | null = null;

function sessionKey(scene: Scene, targetId: string): string {
  return `${scene}:${targetId}`;
}

function trimSession(s: Session): Session {
  if (s.messages.length > MAX_MESSAGES) {
    return { ...s, messages: s.messages.slice(-MAX_MESSAGES) };
  }
  return s;
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** 统一处理入站消息事件 */
      const ingest = (
        scene: Scene,
        targetId: string,
        title: string,
        payload: any,
        guildId?: string,
      ) => {
        const rawContent: string = payload?.content ?? '';
        const text =
          [
            stripBotMention(rawContent, payload?.mentions),
            attachmentsToText(payload?.attachments),
          ]
            .filter(Boolean)
            .join('\n') || '（空消息）';

        const remoteId = String(payload?.id ?? '') || undefined;
        const ts = parseTs(payload?.timestamp);
        const key = sessionKey(scene, targetId);

        set((state) => {
          const prev =
            state.sessions[key] ??
            ({
              key,
              scene,
              targetId,
              guildId,
              title,
              lastMsgId: undefined,
              lastMsgAt: undefined,
              unread: 0,
              updatedAt: ts,
              messages: [],
            } as Session);

          // 同一条消息重复推送时去重
          if (
            remoteId &&
            prev.messages.some((m) => m.remoteId === remoteId && m.dir === 'in')
          ) {
            return state;
          }

          const next: Session = trimSession({
            ...prev,
            title: title || prev.title,
            guildId: guildId ?? prev.guildId,
            lastMsgId: remoteId ?? prev.lastMsgId,
            lastMsgAt: ts,
            unread: prev.unread + 1,
            updatedAt: Math.max(prev.updatedAt, ts),
            messages: [
              ...prev.messages,
              { id: uid(), dir: 'in', text, ts, remoteId },
            ],
          });
          return { sessions: { ...state.sessions, [key]: next } };
        });
      };

      return {
        config: DEFAULT_CONFIG,
        status: 'idle',
        statusDetail: undefined,
        botName: '',
        botId: '',
        sessions: {},
        logs: [],
        sending: false,

        setConfig: (patch) => {
          set((state) => ({ config: { ...state.config, ...patch } }));
        },

        pushLog: (text) => {
          set((state) => ({
            logs: [
              ...state.logs.slice(-(MAX_LOGS - 1)),
              { id: uid(), ts: Date.now(), text },
            ],
          }));
        },

        clearLogs: () => set({ logs: [] }),

        setStatus: (status, detail) => {
          set({ status, statusDetail: detail });
        },

        onGatewayEvent: (type, data) => {
          const t = type.toUpperCase();
          if (t === 'GROUP_AT_MESSAGE_CREATE' || t === 'GROUP_MESSAGE_CREATE') {
            ingest(
              'group',
              String(data?.group_openid ?? ''),
              String(data?.group_name ?? data?.group_openid ?? '群聊'),
              data,
            );
            return;
          }
          if (t === 'C2C_MESSAGE_CREATE') {
            const openid = String(
              data?.openid ?? data?.author?.user_openid ?? '',
            );
            ingest(
              'c2c',
              openid,
              String(data?.author?.username ?? openid ?? '单聊'),
              data,
            );
            return;
          }
          if (t === 'AT_MESSAGE_CREATE' || t === 'MESSAGE_CREATE') {
            const channelId = String(data?.channel_id ?? '');
            ingest(
              'channel',
              channelId,
              String(data?.channel_name ?? channelId ?? '子频道'),
              data,
              data?.guild_id ? String(data.guild_id) : undefined,
            );
            return;
          }
          if (t === 'DIRECT_MESSAGE_CREATE') {
            // 频道私信发送接口按 guild_id 走 /dms/{guild_id}
            const guildId = String(data?.guild_id ?? '');
            const srcGuild = String(data?.src_guild_id ?? guildId);
            ingest(
              'dm',
              guildId,
              String(data?.author?.username ?? '频道私信'),
              data,
              srcGuild,
            );
            return;
          }
          get().pushLog(`事件 ${type}`);
        },

        connect: () => {
          const { config, pushLog } = get();
          if (!config.appid || !config.secret) {
            pushLog('请先在「设置」里填写 AppID 和 AppSecret');
            set({ status: 'error', statusDetail: '缺少 AppID/AppSecret' });
            return;
          }
          if (gateway) {
            gateway.stop();
            gateway = null;
          }
          gateway = new QQGateway(config, {
            onStatus: (status, detail) => set({ status, statusDetail: detail }),
            onEvent: (ev) => get().onGatewayEvent(ev.type, ev.data),
            onLog: (line) => get().pushLog(line),
          });
          pushLog('开始连接 QQ 网关...');
          gateway.start();
        },

        disconnect: () => {
          if (gateway) {
            gateway.stop();
            gateway = null;
          }
          get().pushLog('已主动断开连接');
          set({ status: 'idle', statusDetail: undefined });
        },

        restartGateway: () => {
          get().disconnect();
          get().connect();
        },

        markRead: (key) => {
          set((state) => {
            const s = state.sessions[key];
            if (!s || s.unread === 0) return state;
            return {
              sessions: { ...state.sessions, [key]: { ...s, unread: 0 } },
            };
          });
        },

        addManualSession: (scene, targetId, title, guildId) => {
          const key = sessionKey(scene, targetId);
          set((state) => {
            if (state.sessions[key]) return state;
            return {
              sessions: {
                ...state.sessions,
                [key]: {
                  key,
                  scene,
                  targetId,
                  guildId,
                  title: title || targetId,
                  unread: 0,
                  updatedAt: Date.now(),
                  messages: [],
                },
              },
            };
          });
          return key;
        },

        removeSession: (key) => {
          set((state) => {
            const next = { ...state.sessions };
            delete next[key];
            return { sessions: next };
          });
        },

        sendText: async (key, text) => {
          const state = get();
          const session = state.sessions[key];
          if (!session) return;
          const content = text.trim();
          if (!content) return;

          if (state.status !== 'online') {
            get().pushLog('当前未连接网关，QQ 要求 bot 在线才能发消息');
          }

          // 被动回复：会话里最近一条入站消息在 5 分钟内
          const passive =
            session.lastMsgId &&
            session.lastMsgAt &&
            Date.now() - session.lastMsgAt < PASSIVE_REPLY_WINDOW_MS
              ? session.lastMsgId
              : undefined;

          const localId = uid();
          set((s) => ({
            sending: true,
            sessions: {
              ...s.sessions,
              [key]: trimSession({
                ...session,
                updatedAt: Date.now(),
                messages: [
                  ...session.messages,
                  {
                    id: localId,
                    dir: 'out',
                    text: content,
                    ts: Date.now(),
                    state: 'sending',
                  },
                ],
              }),
            },
          }));

          const patchMsg = (patch: Partial<ChatMessage>) => {
            set((s) => {
              const cur = s.sessions[key];
              if (!cur) return s;
              return {
                sessions: {
                  ...s.sessions,
                  [key]: {
                    ...cur,
                    messages: cur.messages.map((m) =>
                      m.id === localId ? { ...m, ...patch } : m,
                    ),
                  },
                },
              };
            });
          };

          try {
            const cfg = get().config;
            let res: { id?: string };
            switch (session.scene) {
              case 'group':
                res = await sendGroupText(cfg, session.targetId, content, passive);
                break;
              case 'c2c':
                res = await sendC2CText(cfg, session.targetId, content, passive);
                break;
              case 'channel':
                res = await sendChannelText(cfg, session.targetId, content, passive);
                break;
              case 'dm':
                res = await sendDmText(
                  cfg,
                  session.guildId ?? session.targetId,
                  content,
                  passive,
                );
                break;
              default:
                throw new Error(`不支持的场景：${session.scene}`);
            }
            patchMsg({ state: 'sent' });
            get().pushLog(
              passive
                ? `被动回复成功 → ${session.title}`
                : `主动发送成功 → ${session.title}`,
            );
            void res;
          } catch (err: any) {
            const msg = err?.message ?? String(err);
            patchMsg({ state: 'failed', error: msg });
            get().pushLog(`发送失败：${msg}`);
          } finally {
            set({ sending: false });
          }
        },
      };
    },
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        config: state.config,
        sessions: state.sessions,
        // logs 不持久化
      }),
    },
  ),
);

/** 供组件读取网关身份（不进持久化） */
export function getGatewayIdentity(): { name: string; id: string } {
  return gateway?.identity ?? { name: '', id: '' };
}

/**
 * 手机切到后台时系统通常会掐断 websocket，回到前台若没有在线则重连。
 * 返回取消订阅函数。
 */
export function installForegroundReconnect(): () => void {
  let wasActive: AppStateStatus = AppState.currentState;
  const sub = AppState.addEventListener('change', (next) => {
    const cameBack = wasActive !== 'active' && next === 'active';
    wasActive = next;
    if (!cameBack) return;
    const state = useStore.getState();
    const configured = Boolean(state.config.appid && state.config.secret);
    if (!configured) return;
    if (state.status === 'online' || state.status === 'connecting' || state.status === 'identifying') {
      return;
    }
    state.pushLog('回到前台，网关未在线，尝试重连...');
    state.connect();
  });
  return () => sub.remove();
}
