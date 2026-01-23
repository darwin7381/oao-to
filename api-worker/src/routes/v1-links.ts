// V1 API 路由 - 供外部使用（需要 API Key）

import { Hono } from 'hono';
import type { Env, LinkData } from '../types';
import { verifyApiKey, requireScope } from '../middleware/api-key';
import { deductCredits, CREDIT_COSTS, trackApiUsage } from '../utils/credit-manager';
import { generateUniqueSlug } from '../utils/slug-generator';

const router = new Hono<{ Bindings: Env }>();

// 所有 V1 API 都需要 API Key
router.use('/*', verifyApiKey);

/**
 * 創建短網址
 * POST /v1/links
 */
router.post('/', requireScope('links:write'), async (c) => {
  const startTime = Date.now();
  const userId = c.get('userId');
  const apiKeyId = c.get('apiKeyId');
  
  try {
    const body = await c.req.json();
    const { url, customSlug, title, description, image, expiresAt, password, tags } = body;
    
    if (!url) {
      return c.json({ error: 'url is required' }, 400);
    }
    
    // 驗證 URL 格式
    try {
      new URL(url);
    } catch {
      return c.json({ error: 'Invalid URL format' }, 400);
    }
    
    // 扣除 Credits
    const deduction = await deductCredits(c.env, userId, CREDIT_COSTS.LINK_CREATE, {
      type: 'usage',
      resourceType: 'link',
      description: 'Create short link via API',
      apiKeyId,
    });
    
    if (!deduction.success) {
      return c.json({
        error: 'Insufficient credits',
        message: deduction.error,
        required: CREDIT_COSTS.LINK_CREATE,
        topUpUrl: `${c.env.FRONTEND_URL}/credits`
      }, 402);
    }
    
    // 生成或驗證 slug
    let slug: string;
    
    if (customSlug) {
      if (!/^[a-zA-Z0-9-_]{1,50}$/.test(customSlug)) {
        return c.json({ 
          error: 'Invalid slug format',
          message: 'Slug must be 1-50 characters, alphanumeric, hyphens, or underscores only'
        }, 400);
      }
      
      const existing = await c.env.LINKS.get(`link:${customSlug}`);
      if (existing) {
        return c.json({ 
          error: 'Slug already exists',
          message: 'Please choose a different slug'
        }, 409);
      }
      
      slug = customSlug;
    } else {
      slug = await generateUniqueSlug(c.env);
    }
    
    // 創建鏈接數據
    const linkData: LinkData = {
      slug,
      url,
      userId,
      createdAt: Date.now(),
      title: title || url,
      description,
      image,
      expiresAt,
      password,
      tags,
      isActive: true,
    };
    
    // 存入 KV
    await c.env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));
    
    // 存入 D1 索引
    await c.env.DB.prepare(`
      INSERT INTO link_index (slug, user_id, created_via, api_key_id, created_at)
      VALUES (?, ?, 'api', ?, ?)
    `).bind(slug, userId, apiKeyId, Date.now()).run();
    
    const baseUrl = c.req.header('host')?.includes('localhost')
      ? `http://${c.req.header('host')}`
      : 'https://oao.to';
    
    // 背景抓取元數據（如果沒有提供）
    if (!title || !description || !image) {
      c.executionCtx.waitUntil(
        (async () => {
          try {
            const { fetchMetadata } = await import('../utils/fetch-metadata');
            const metadata = await fetchMetadata(url);
            
            const updatedData: LinkData = {
              ...linkData,
              title: title || metadata.title,
              description: description || metadata.description,
              image: image || metadata.image,
              updatedAt: Date.now(),
            };
            
            await c.env.LINKS.put(`link:${slug}`, JSON.stringify(updatedData));
          } catch (error) {
            console.error(`Failed to fetch metadata for ${slug}:`, error);
          }
        })()
      );
    }
    
    // 記錄到 Analytics Engine
    const responseTime = Date.now() - startTime;
    c.executionCtx.waitUntil(
      trackApiUsage(c.env, {
        userId,
        apiKeyId,
        endpoint: '/v1/links',
        method: 'POST',
        statusCode: 201,
        creditsUsed: CREDIT_COSTS.LINK_CREATE,
        responseTime,
      })
    );
    
    return c.json({
      success: true,
      data: {
        slug,
        url,
        shortUrl: `${baseUrl}/${slug}`,
        title: linkData.title,
        description: linkData.description,
        image: linkData.image,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(baseUrl + '/' + slug)}`,
        createdAt: linkData.createdAt,
        expiresAt: linkData.expiresAt,
      },
      credits: {
        cost: CREDIT_COSTS.LINK_CREATE,
        balanceAfter: deduction.balanceAfter,
      }
    }, 201);
    
  } catch (error) {
    console.error('Create link error:', error);
    
    // 記錄失敗
    c.executionCtx.waitUntil(
      trackApiUsage(c.env, {
        userId: c.get('userId'),
        apiKeyId: c.get('apiKeyId'),
        endpoint: '/v1/links',
        method: 'POST',
        statusCode: 500,
        creditsUsed: 0,
        responseTime: Date.now() - startTime,
      })
    );
    
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * 獲取短網址列表
 * GET /v1/links
 */
router.get('/', requireScope('links:read'), async (c) => {
  const userId = c.get('userId');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  
  try {
    // 從 D1 索引查詢
    const result = await c.env.DB.prepare(`
      SELECT slug, created_at
      FROM link_index
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();
    
    // 從 KV 獲取完整數據
    const links = await Promise.all(
      result.results.map(async (row: any) => {
        const data = await c.env.LINKS.get(`link:${row.slug}`);
        return data ? JSON.parse(data) : null;
      })
    );
    
    const baseUrl = c.req.header('host')?.includes('localhost')
      ? `http://${c.req.header('host')}`
      : 'https://oao.to';
    
    return c.json({
      success: true,
      data: {
        links: links.filter(l => l !== null).map(link => ({
          ...link,
          shortUrl: `${baseUrl}/${link.slug}`,
        })),
        pagination: {
          limit,
          offset,
          total: links.length,
        }
      }
    });
    
  } catch (error) {
    console.error('List links error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * 獲取單個短網址詳情
 * GET /v1/links/:slug
 */
router.get('/:slug', requireScope('links:read'), async (c) => {
  const slug = c.req.param('slug');
  const userId = c.get('userId');
  
  try {
    const linkDataStr = await c.env.LINKS.get(`link:${slug}`);
    
    if (!linkDataStr) {
      return c.json({ error: 'Link not found' }, 404);
    }
    
    const linkData: LinkData = JSON.parse(linkDataStr);
    
    // 檢查權限（只能查看自己的）
    if (linkData.userId !== userId && c.get('userRole') !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    const baseUrl = c.req.header('host')?.includes('localhost')
      ? `http://${c.req.header('host')}`
      : 'https://oao.to';
    
    return c.json({
      success: true,
      data: {
        ...linkData,
        shortUrl: `${baseUrl}/${slug}`,
      }
    });
    
  } catch (error) {
    console.error('Get link error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default router;


