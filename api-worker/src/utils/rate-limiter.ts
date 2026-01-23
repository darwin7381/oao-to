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
 * 檢查 API Key 的 Rate Limit
 * 同時檢查每分鐘和每天的限制
 */
export async function checkApiKeyRateLimit(
  env: Env,
  apiKeyId: string,
  perMinute: number,
  perDay: number
): Promise<{ allowed: boolean; reason?: string; headers: Record<string, string> }> {
  // 檢查每分鐘限制
  const minuteCheck = await checkRateLimit(
    env,
    `apikey:${apiKeyId}:minute`,
    perMinute,
    60  // 60 秒窗口
  );
  
  const headers: Record<string, string> = {
    'X-RateLimit-Limit-Minute': perMinute.toString(),
    'X-RateLimit-Remaining-Minute': minuteCheck.remaining.toString(),
    'X-RateLimit-Reset-Minute': Math.floor(minuteCheck.resetAt / 1000).toString(),
  };
  
  if (!minuteCheck.allowed) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${perMinute} requests per minute`,
      headers
    };
  }
  
  // 檢查每天限制
  const dayCheck = await checkRateLimit(
    env,
    `apikey:${apiKeyId}:day`,
    perDay,
    86400  // 24 小時窗口
  );
  
  headers['X-RateLimit-Limit-Day'] = perDay.toString();
  headers['X-RateLimit-Remaining-Day'] = dayCheck.remaining.toString();
  headers['X-RateLimit-Reset-Day'] = Math.floor(dayCheck.resetAt / 1000).toString();
  
  if (!dayCheck.allowed) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${perDay} requests per day`,
      headers
    };
  }
  
  return {
    allowed: true,
    headers
  };
}


