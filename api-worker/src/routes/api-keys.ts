// API Keys 管理路由

import { Hono } from 'hono';
import type { Env, ApiScope } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateApiKey } from '../utils/api-key';

const router = new Hono<{ Bindings: Env }>();

/**
 * 列出用戶的所有 API Keys
 * GET /api/account/keys
 */
router.get('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  
  const result = await c.env.DB.prepare(`
    SELECT 
      id,
      name,
      key_prefix,
      scopes,
      is_active,
      rate_limit_per_minute,
      rate_limit_per_day,
      last_used_at,
      total_requests,
      created_at,
      expires_at
    FROM api_keys
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).bind(userId).all();
  
  return c.json({
    success: true,
    data: {
      keys: result.results.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.key_prefix,
        scopes: (key.scopes as string).split(','),
        isActive: Boolean(key.is_active),
        rateLimit: {
          perMinute: key.rate_limit_per_minute,
          perDay: key.rate_limit_per_day,
        },
        lastUsedAt: key.last_used_at,
        totalRequests: key.total_requests,
        createdAt: key.created_at,
        expiresAt: key.expires_at,
      })),
      total: result.results.length
    }
  });
});

/**
 * 創建新的 API Key
 * POST /api/account/keys
 */
router.post('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  
  try {
    const body = await c.req.json();
    
    // 驗證輸入
    const { name, scopes, environment, rateLimit, expiresAt } = body;
    
    if (!name || typeof name !== 'string') {
      return c.json({ error: 'Name is required' }, 400);
    }
    
    if (name.length > 50) {
      return c.json({ error: 'Name must be less than 50 characters' }, 400);
    }
    
    // 驗證 scopes
    const validScopes: ApiScope[] = [
      'links:read', 'links:write', 'links:update', 'links:delete', 'analytics:read'
    ];
    
    const requestedScopes = scopes || ['links:read', 'links:write'];
    
    for (const scope of requestedScopes) {
      if (!validScopes.includes(scope)) {
        return c.json({ 
          error: `Invalid scope: ${scope}`,
          validScopes 
        }, 400);
      }
    }
    
    // 檢查用戶已有的 API Key 數量（根據方案限制）
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM api_keys
      WHERE user_id = ? AND is_active = 1
    `).bind(userId).first();
    
    const currentCount = countResult?.count as number || 0;
    
    // 獲取用戶方案
    const creditsResult = await c.env.DB.prepare(`
      SELECT plan_type FROM credits WHERE user_id = ?
    `).bind(userId).first();
    
    if (!creditsResult) {
      console.error(`[CreateAPIKey] User ${userId} missing credits record`);
      return c.json({ 
        error: 'Credits account not found',
        message: 'Please contact support to initialize your credits account'
      }, 500);
    }
    
    const planType = creditsResult.plan_type as string || 'free';
    
    // 方案限制（合理的額度，防機器人但不影響正常使用）
    const limits: Record<string, number> = {
      free: 5,          // 免費用戶 5 個（足夠正常使用）
      starter: 10,      // Starter 10 個
      pro: 25,          // Pro 25 個
      enterprise: 999,  // Enterprise 無限
    };
    
    if (currentCount >= limits[planType]) {
      console.warn(`[CreateAPIKey] User ${userId} reached limit: ${currentCount}/${limits[planType]}`);
      return c.json({
        error: 'API key limit reached',
        message: `Your ${planType} plan allows up to ${limits[planType]} active API keys`,
        current: currentCount,
        limit: limits[planType],
        upgradeUrl: `${c.env.FRONTEND_URL}/pricing`
      }, 403);
    }
    
    // 生成 API Key
    const env = environment === 'test' ? 'test' : 'live';
    const keyData = await generateApiKey(env);
    
    console.log(`[CreateAPIKey] Generated key for user ${userId}: ${keyData.keyPrefix}...`);
    
    // Rate Limit 配置（根據方案）
    const defaultRateLimits: Record<string, { perMinute: number; perDay: number }> = {
      free: { perMinute: 10, perDay: 1000 },
      starter: { perMinute: 60, perDay: 10000 },
      pro: { perMinute: 300, perDay: 100000 },
      enterprise: { perMinute: 1000, perDay: 999999 },
    };
    
    const rateLimitConfig = rateLimit || defaultRateLimits[planType];
    
    // 存入資料庫
    console.log(`[CreateAPIKey] Inserting into D1 for user ${userId}, name: ${name}`);
    
    const insertResult = await c.env.DB.prepare(`
      INSERT INTO api_keys (
        id, user_id, name, key_prefix, key_hash, scopes,
        is_active, rate_limit_per_minute, rate_limit_per_day,
        total_requests, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      keyData.id,
      userId,
      name,
      keyData.keyPrefix,
      keyData.keyHash,
      requestedScopes.join(','),
      1, // is_active
      rateLimitConfig.perMinute,
      rateLimitConfig.perDay,
      0, // total_requests
      Date.now(),
      expiresAt || null
    ).run();
    
    console.log(`[CreateAPIKey] ✅ API Key created successfully: ${keyData.id}, rows affected: ${insertResult.meta?.changes || 0}`);
    
    return c.json({
      success: true,
      data: {
        id: keyData.id,
        name,
        key: keyData.key,  // ⚠️ 只顯示這一次！
        keyPrefix: keyData.keyPrefix,
        scopes: requestedScopes,
        rateLimit: rateLimitConfig,
        createdAt: Date.now(),
        expiresAt: expiresAt || null,
      },
      warning: '⚠️ Please save this API key securely. It will not be shown again.'
    }, 201);
  } catch (error) {
    console.error(`[CreateAPIKey] ❌ Failed to create API key for user ${userId}:`, error);
    return c.json({ 
      error: 'Failed to create API key',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * 更新 API Key（名稱、scopes 等）
 * PUT /api/account/keys/:keyId
 */
router.put('/:keyId', requireAuth, async (c) => {
  const userId = c.get('userId');
  const keyId = c.req.param('keyId');
  const body = await c.req.json();
  
  // 確認 Key 屬於該用戶
  const existing = await c.env.DB.prepare(`
    SELECT id FROM api_keys WHERE id = ? AND user_id = ?
  `).bind(keyId, userId).first();
  
  if (!existing) {
    return c.json({ error: 'API key not found' }, 404);
  }
  
  const { name, isActive } = body;
  const updates: string[] = [];
  const values: any[] = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  
  if (isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(isActive ? 1 : 0);
  }
  
  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }
  
  values.push(keyId);
  
  await c.env.DB.prepare(`
    UPDATE api_keys
    SET ${updates.join(', ')}
    WHERE id = ?
  `).bind(...values).run();
  
  return c.json({
    success: true,
    message: 'API key updated'
  });
});

/**
 * 刪除 API Key
 * DELETE /api/account/keys/:keyId
 */
router.delete('/:keyId', requireAuth, async (c) => {
  const userId = c.get('userId');
  const keyId = c.req.param('keyId');
  
  // 確認 Key 屬於該用戶
  const existing = await c.env.DB.prepare(`
    SELECT id FROM api_keys WHERE id = ? AND user_id = ?
  `).bind(keyId, userId).first();
  
  if (!existing) {
    return c.json({ error: 'API key not found' }, 404);
  }
  
  // 刪除
  await c.env.DB.prepare(`
    DELETE FROM api_keys WHERE id = ?
  `).bind(keyId).run();
  
  return c.json({
    success: true,
    message: 'API key deleted'
  });
});

export default router;

