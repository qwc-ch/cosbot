/**
 * QQ 开放平台（机器人）协议常量与类型定义。
 * 参考：AstrBot qqofficial 适配器 / qq-botpy 1.2.1
 */

/** 接入场景 */
export type Scene = 'group' | 'c2c' | 'channel' | 'dm';

/** 机器人凭证与开关配置（持久化） */
export interface QQConfig {
  appid: string;
  secret: string;
  /** 是否使用沙箱环境 */
  sandbox: boolean;
  /** 群 / C2C 消息事件（intents public_messages, 1<<25） */
  intentGroup: boolean;
  /** 频道 @ 机器人消息事件（intents public_guild_messages, 1<<30） */
  intentGuild: boolean;
  /** 频道私信事件（intents direct_message, 1<<12） */
  intentDM: boolean;
}

export const DEFAULT_CONFIG: QQConfig = {
  appid: '',
  secret: '',
  sandbox: false,
  intentGroup: true,
  intentGuild: true,
  intentDM: false,
};

/** botpy flags.Intents 位掩码 */
export const INTENT_BITS = {
  guilds: 1 << 0,
  directMessage: 1 << 12,
  publicMessages: 1 << 25,
  publicGuildMessages: 1 << 30,
} as const;

/** 根据配置计算 identify 时使用的 intents */
export function computeIntents(cfg: QQConfig): number {
  let intents = 0;
  if (cfg.intentGroup) intents |= INTENT_BITS.publicMessages;
  if (cfg.intentGuild) intents |= INTENT_BITS.publicGuildMessages;
  if (cfg.intentDM) intents |= INTENT_BITS.directMessage;
  // 一个都没勾时兜底，否则网关不会推送任何消息事件
  if (intents === 0) intents = INTENT_BITS.publicMessages;
  return intents;
}

/** 被动回复有效期（QQ 官方限制 5 分钟） */
export const PASSIVE_REPLY_WINDOW_MS = 5 * 60 * 1000;

/** API 基础域名 */
export function apiHost(cfg: QQConfig): string {
  return cfg.sandbox
    ? 'https://sandbox.api.sgroup.qq.com'
    : 'https://api.sgroup.qq.com';
}

/**
 * 记录 msg_seq。
 * QQ 要求「相同 msg_id + msg_seq 重复发送会失败」，
 * 因此被动回复同一条消息多次时 seq 必须递增；换新 msg_id 后可重置。
 */
export class SeqTracker {
  private lastMsgId: string | null = null;
  private seq = 0;

  next(msgId?: string): number {
    if (msgId && msgId !== this.lastMsgId) {
      this.lastMsgId = msgId;
      this.seq = 0;
    }
    this.seq += 1;
    return this.seq;
  }

  reset(): void {
    this.lastMsgId = null;
    this.seq = 0;
  }
}

/** 生成本地唯一 id */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

interface MentionLike {
  id?: string | number;
  is_you?: boolean;
}

/**
 * 去掉消息内容里 @机器人 的标记，如 `<@!123456>`。
 * QQ 推送的 content 中带 @ 标记，回复时通常需要保留，但展示时应去掉。
 */
export function stripBotMention(
  content: string | undefined | null,
  mentions?: MentionLike[] | null,
): string {
  let out = content ?? '';
  const botIds = (mentions ?? [])
    .filter((m) => m && m.is_you)
    .map((m) => String(m.id));
  for (const id of botIds) {
    out = out.split(`<@!${id}>`).join('');
    out = out.split(`<@${id}>`).join('');
  }
  // 没拿到 mentions 兜底：去掉开头的 @ 标记
  if (botIds.length === 0) {
    out = out.replace(/^<@!\d+>\s*/, '').replace(/^<@\d+>\s*/, '');
  }
  return out.trim();
}

/** 解析 QQ 推送里的时间戳（可能是毫秒、秒或 ISO 字符串） */
export function parseTs(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v < 1e12 ? v * 1000 : v;
  }
  if (typeof v === 'string') {
    if (/^\d+$/.test(v)) {
      const n = Number(v);
      return n < 1e12 ? n * 1000 : n;
    }
    const parsed = Date.parse(v);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

export interface AttachmentLike {
  url?: string;
  content_type?: string;
  filename?: string;
}

/** 附件渲染为文本（v1 只展示链接） */
export function attachmentsToText(list?: AttachmentLike[] | null): string {
  if (!list || list.length === 0) return '';
  return list
    .filter((a) => a && a.url)
    .map((a) => `[图片] ${a.url}`)
    .join('\n');
}
