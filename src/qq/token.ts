/**
 * QQ 机器人 access_token 管理。
 * POST https://bots.qq.com/app/getAppAccessToken
 * body: { appId, clientSecret } -> { access_token, expires_in }
 */
import { QQConfig } from './protocol';

const TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken';

interface CachedToken {
  key: string;
  token: string;
  /** 过期时间（epoch ms） */
  expiresAt: number;
}

let cached: CachedToken | null = null;

/** 使缓存失效（鉴权失败时调用） */
export function invalidateToken(): void {
  cached = null;
}

/**
 * 获取 access_token，临过期（60s 内）自动刷新。
 * 同一套凭证复用缓存。
 */
export async function getToken(cfg: QQConfig): Promise<string> {
  const key = `${cfg.appid}|${cfg.secret}`;
  if (cached && cached.key === key && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: cfg.appid, clientSecret: cfg.secret }),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok || !data || typeof data !== 'object' || !data.access_token) {
    const msg =
      (data && typeof data === 'object' && (data.message || data.msg)) ||
      text ||
      `HTTP ${res.status}`;
    throw new Error(`获取 token 失败：${msg}`);
  }

  const expiresIn = Number(data.expires_in) || 7200;
  cached = {
    key,
    token: String(data.access_token),
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return cached.token;
}
