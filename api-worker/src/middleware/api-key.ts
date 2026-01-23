// API Key 驗證 Middleware

import { Context, Next } from 'hono';
import type { Env, ApiScope } from '../types';
import { hashApiKey, validateApiKeyFormat } from '../utils/api-key';
import { checkApiKeyRateLimit } from '../utils/rate-limiter';

/**
 * 驗證 API Key Middleware
 * 
 * 從 Authorization header 提取並驗證 API Key
 * 如果有效，將相關資訊設置到 context 中：
 * - apiKeyId
 * - userId
 * - userEmail
 * - userRole
 * - apiKeyScopes
 * - rateLimitPerMinute
 * - rateLimitPerDay
 * - creditBalance
 */
export async function verifyApiKey(c: Context<{ Bindings: Env }>, next: Next) {
  // 1. 提取 API Key
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ 
      error: 'Missing or invalid Authorization header',
      message: 'Please provide an API key in the format: Authorization: Bearer <your-api-key>'
    }, 401);
  }
  
  const apiKey = authHeader.substring(7); // 移除 "Bearer "
  
  // 2. 驗證格式
  if (!validateApiKeyFormat(apiKey)) {
    return c.json({ 
      error: 'Invalid API key format',
      message: 'API key must be in format: oao_{live|test}_{20 characters}'
    }, 401);
  }
  
  // 3. 計算雜湊
  const keyHash = await hashApiKey(apiKey);
  
  // 4. 先查 KV Cache（5 分鐘 TTL）
  const cacheKey = `apikey:cache:${keyHash}`;
  const cached = await c.env.LINKS.get(cacheKey);
  
  let result: any;
  
  if (cached) {
    // Cache Hit - 直接使用
    result = JSON.parse(cached);
    console.log(`API Key cache HIT: ${keyHash.substring(0, 8)}...`);
  } else {
    // Cache Miss - 查詢 D1
    console.log(`API Key cache MISS: ${keyHash.substring(0, 8)}...`);
    
    result = await c.env.DB.prepare(`
      SELECT 
        ak.id,
        ak.user_id,
        ak.name,
        ak.scopes,
        ak.is_active,
        ak.rate_limit_per_minute,
        ak.rate_limit_per_day,
        ak.expires_at,
        ak.total_requests,
        u.email,
        u.role,
        cr.balance as credit_balance,
        cr.plan_type
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      LEFT JOIN credits cr ON u.id = cr.user_id
      WHERE ak.key_hash = ?
    `).bind(keyHash).first();
    
    if (result) {
      // 寫入 KV Cache（5 分鐘 TTL）
      c.executionCtx.waitUntil(
        c.env.LINKS.put(cacheKey, JSON.stringify(result), {
          expirationTtl: 300  // 5 分鐘
        })
      );
    }
  }
  
  if (!result) {
    return c.json({ 
      error: 'Invalid API key',
      message: 'The provided API key does not exist or has been revoked'
    }, 401);
  }
  
  // 5. 檢查是否啟用
  if (!result.is_active) {
    return c.json({ 
      error: 'API key inactive',
      message: 'This API key has been deactivated'
    }, 401);
  }
  
  // 6. 檢查過期
  if (result.expires_at && Date.now() > result.expires_at) {
    return c.json({ 
      error: 'API key expired',
      message: 'This API key has expired'
    }, 401);
  }
  
  // 7. 檢查 Rate Limit
  const rateLimitCheck = await checkApiKeyRateLimit(
    c.env,
    result.id as string,
    result.rate_limit_per_minute as number,
    result.rate_limit_per_day as number
  );
  
  // 設置 Rate Limit headers
  Object.entries(rateLimitCheck.headers).forEach(([key, value]) => {
    c.header(key, value);
  });
  
  if (!rateLimitCheck.allowed) {
    return c.json({
      error: 'Rate limit exceeded',
      message: rateLimitCheck.reason,
      retryAfter: rateLimitCheck.headers['X-RateLimit-Reset-Minute']
    }, 429);
  }
  
  // 8. 設置上下文
  c.set('apiKeyId', result.id as string);
  c.set('userId', result.user_id as string);
  c.set('userEmail', result.email as string);
  c.set('userRole', result.role as string);
  c.set('apiKeyScopes', (result.scopes as string).split(','));
  c.set('rateLimitPerMinute', result.rate_limit_per_minute as number);
  c.set('rateLimitPerDay', result.rate_limit_per_day as number);
  c.set('creditBalance', result.credit_balance as number || 0);
  c.set('planType', result.plan_type as string || 'free');
  
  // 9. 背景更新最後使用時間和請求計數
  c.executionCtx.waitUntil(
    c.env.DB.prepare(`
      UPDATE api_keys 
      SET last_used_at = ?, 
          total_requests = total_requests + 1
      WHERE id = ?
    `).bind(Date.now(), result.id).run()
  );
  
  await next();
}

/**
 * 檢查 Scopes 權限 Middleware
 * 
 * @param requiredScopes 需要的權限範圍
 */
export function requireScope(...requiredScopes: ApiScope[]) {
  return async (c: Context, next: Next) => {
    const scopes = c.get('apiKeyScopes') as string[];
    
    // 檢查是否有任一所需權限
    const hasPermission = requiredScopes.some(scope => scopes.includes(scope));
    
    if (!hasPermission) {
      return c.json({
        error: 'Insufficient permissions',
        message: 'This API key does not have the required permissions',
        required: requiredScopes,
        current: scopes
      }, 403);
    }
    
    await next();
  };
}

/**
 * 檢查 Credits 是否足夠 Middleware
 * 
 * 注意：這只是預檢查，實際扣除在業務邏輯中進行
 * 
 * @param estimatedCost 預估成本
 */
export function requireCredits(estimatedCost: number) {
  return async (c: Context, next: Next) => {
    const currentBalance = c.get('creditBalance') as number;
    const planType = c.get('planType') as string;
    
    // Enterprise 用戶不檢查
    if (planType === 'enterprise') {
      await next();
      return;
    }
    
    // 檢查餘額（這裡是保守估計，實際可能用月配額）
    if (currentBalance < estimatedCost) {
      return c.json({
        error: 'Insufficient credits',
        message: 'Not enough credits to perform this operation',
        required: estimatedCost,
        current: currentBalance,
        topUpUrl: `${c.env.FRONTEND_URL}/credits`
      }, 402); // 402 Payment Required
    }
    
    await next();
  };
}

