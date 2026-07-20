// Rate Limiting 工具（固定窗口策略）

import type { Env } from '../types';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * 檢查 Rate Limit（固定窗口）
 * 
 * @param env Cloudflare 環境
 * @param key 限流 key（如 "apikey:{keyId}:minute"）
 * @param limit 限制數量
 * @param windowSeconds 時間窗口（秒）
 * @returns 是否允許請求
 */
export async function checkRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  
  // 計算當前窗口
  const windowKey = Math.floor(now / (windowSeconds * 1000));
  const kvKey = `ratelimit:${key}:${windowKey}`;
  
  // 計算重置時間
  const resetAt = (windowKey + 1) * windowSeconds * 1000;
  
  try {
    // 獲取當前計數
    const countStr = await env.LINKS.get(kvKey);
    const current = countStr ? parseInt(countStr) : 0;
    
    if (current >= limit) {
      // 超過限制
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit
      };
    }
    
    // 增加計數
    const newCount = current + 1;
    await env.LINKS.put(
      kvKey,
      newCount.toString(),
      { 
        expirationTtl: windowSeconds + 30  // 窗口時間 + 30 秒緩衝
      }
    );
    
    return {
      allowed: true,
      remaining: limit - newCount,
      resetAt,
      limit
    };
    
  } catch (error) {
    console.error('Rate limit check error:', error);
    // 出錯時允許請求（fail open）
    return {
      allowed: true,
      remaining: limit,
      resetAt,
      limit
    };
  }
}

/**
 * 檢查 API Key 的 Rate Limit — 透過 Durable Object 原子計數
 * 每個 apiKeyId 對應一個 DO 實例，並發請求序列化，無法繞過
 */
export async function checkApiKeyRateLimit(
  env: Env,
  apiKeyId: string,
  perMinute: number,
  perDay: number
): Promise<{ allowed: boolean; reason?: string; headers: Record<string, string> }> {
  try {
    const id = env.RATE_LIMITER.idFromName(`apikey:${apiKeyId}`);
    const stub = env.RATE_LIMITER.get(id);
    const res = await stub.fetch('https://rate-limiter/check', {
      method: 'POST',
      body: JSON.stringify({ perMinute, perDay }),
    });
    const r = await res.json() as {
      allowed: boolean; scope?: string;
      remainingMinute: number; remainingDay: number;
      minuteReset: number; dayReset: number;
    };

    const headers: Record<string, string> = {
      'X-RateLimit-Limit-Minute': perMinute.toString(),
      'X-RateLimit-Remaining-Minute': Math.max(0, r.remainingMinute).toString(),
      'X-RateLimit-Reset-Minute': Math.floor(r.minuteReset / 1000).toString(),
      'X-RateLimit-Limit-Day': perDay.toString(),
      'X-RateLimit-Remaining-Day': Math.max(0, r.remainingDay).toString(),
      'X-RateLimit-Reset-Day': Math.floor(r.dayReset / 1000).toString(),
    };

    if (!r.allowed) {
      return {
        allowed: false,
        reason: r.scope === 'day'
          ? `Rate limit exceeded: ${perDay} requests per day`
          : `Rate limit exceeded: ${perMinute} requests per minute`,
        headers,
      };
    }
    return { allowed: true, headers };
  } catch (error) {
    console.error('Rate limit DO error:', error);
    // DO 出錯時 fail open（不阻擋正常用戶），但記錄
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit-Minute': perMinute.toString(),
        'X-RateLimit-Limit-Day': perDay.toString(),
      },
    };
  }
}


