// 短網址 CRUD API
// 核心邏輯複製自 shorty.dev 並改寫

import { Hono } from 'hono';
import { requireAuth, getUserFromContext } from '../middleware/auth';
import { fetchMetadata } from '../utils/fetch-metadata';
import type { Env, LinkData } from '../types';

const links = new Hono<{ Bindings: Env }>();

// 所有路由都需要認證
links.use('/*', requireAuth);

// 創建短網址
links.post('/', async (c) => {
  const { url, slug: customSlug, title } = await c.req.json();
  const user = getUserFromContext(c);

  if (!url) {
    return c.json({ error: 'URL is required' }, 400);
  }

  // URL 安全檢查（格式/協議/封鎖網域/Safe Browsing）
  const { checkUrlSafety } = await import('../utils/url-safety');
  const safety = await checkUrlSafety(c.env, url);
  if (!safety.safe) {
    return c.json({ error: safety.reason || 'URL not allowed' }, 400);
  }

  // slug 可省略：省略時自動生成（修掉「dashboard 不填自訂 slug 就 400」的 bug）
  let slug: string;
  if (customSlug) {
    if (!/^[a-zA-Z0-9-_]{1,50}$/.test(customSlug)) {
      return c.json({ error: 'Invalid slug format' }, 400);
    }
    const existing = await c.env.LINKS.get(`link:${customSlug}`);
    if (existing) {
      return c.json({ error: 'Slug already exists' }, 409);
    }
    slug = customSlug;
  } else {
    const { generateUniqueSlug } = await import('../utils/slug-generator');
    slug = await generateUniqueSlug(c.env);
  }

  const now = Date.now();
  const linkData: LinkData = {
    slug,
    url,
    userId: user.userId,
    createdAt: now,
    title: title || url,
  };

  // D1 先寫（source of truth；失敗就整個請求失敗，不會產生 KV 孤兒）
  await c.env.DB.prepare(
    `INSERT INTO links (slug, url, user_id, title, source, is_custom, created_at)
     VALUES (?, ?, ?, ?, 'web', ?, ?)`
  ).bind(slug, url, user.userId, title || url, customSlug ? 1 : 0, now).run();

  // KV 快取（重定向路徑用）；失敗回滾 D1，維持兩邊一致
  try {
    await c.env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));
  } catch (kvErr) {
    await c.env.DB.prepare('DELETE FROM links WHERE slug = ?').bind(slug).run();
    throw kvErr;
  }

  return c.json({
    slug,
    url,
    title: linkData.title,
    shortUrl: `https://oao.to/${slug}`,
    createdAt: linkData.createdAt,
  }, 201);
});

// 獲取用戶的所有短網址（D1 = source of truth；修掉舊 KV 全域 list 只回前 1000 條、
// 使用者連結因字母序被截掉的 bug）
links.get('/', async (c) => {
  const user = getUserFromContext(c);
  const limit = Math.min(parseInt(c.req.query('limit') || '200'), 500);
  const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0);

  try {
    const [rows, count] = await Promise.all([
      c.env.DB.prepare(
        `SELECT slug, url, title, created_at FROM links
         WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      ).bind(user.userId, limit, offset).all(),
      c.env.DB.prepare('SELECT COUNT(*) as n FROM links WHERE user_id = ?')
        .bind(user.userId).first(),
    ]);

    const baseUrl = c.req.header('host')?.includes('localhost')
      ? `http://${c.req.header('host')!.replace(':8788', ':8787')}`
      : 'https://oao.to';

    const links = (rows.results || []).map((link: any) => ({
      slug: link.slug,
      url: link.url,
      title: link.title || link.url,
      createdAt: link.created_at,
      shortUrl: `${baseUrl}/${link.slug}`,
    }));

    return c.json({
      links,
      total: (count?.n as number) || 0,
    });
  } catch (error) {
    console.error('Failed to fetch links from D1:', error);
    return c.json({ error: 'Failed to fetch links' }, 500);
  }
});

// 獲取單個短網址詳情
links.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const user = getUserFromContext(c);

  const link = await c.env.DB.prepare(
    'SELECT * FROM links WHERE slug = ? AND user_id = ?'
  ).bind(slug, user.userId).first() as any;

  if (!link) {
    return c.json({ error: 'Link not found' }, 404);
  }

  return c.json(link);
});

// 更新短網址
links.put('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const user = getUserFromContext(c);
  const updates = await c.req.json<{
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    tags?: string[];
    expiresAt?: number;
    isActive?: boolean;
  }>();

  try {
    // 從 KV 讀取現有資料
    const existingStr = await c.env.LINKS.get(`link:${slug}`);
    if (!existingStr) {
      return c.json({ error: '短網址不存在' }, 404);
    }

    const linkData: LinkData = JSON.parse(existingStr);

    // 所有權驗證：只有連結擁有者或管理員可編輯
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (linkData.userId !== user.userId && !isAdmin) {
      return c.json({ error: '無權限編輯此短網址' }, 403);
    }

    // 更新資料
    const updatedData: LinkData = {
      ...linkData,
      ...updates,
      updatedAt: Date.now(),
    };

    // 如果修改了 URL，驗證格式 + 安全檢查（防止先建無害連結再改指向惡意站）
    if (updates.url) {
      const { checkUrlSafety } = await import('../utils/url-safety');
      const safety = await checkUrlSafety(c.env, updates.url);
      if (!safety.safe) {
        return c.json({ error: safety.reason || 'URL not allowed' }, 400);
      }
    }

    // 寫回 KV
    await c.env.LINKS.put(`link:${slug}`, JSON.stringify(updatedData));

    // 同步更新 D1（基本欄位）
    await c.env.DB.prepare(
      `UPDATE links
       SET url = ?, title = ?, updated_at = ?, expires_at = ?, password = ?
       WHERE slug = ?`
    ).bind(
      updatedData.url || null,
      updatedData.title || null,
      updatedData.updatedAt || null,
      updatedData.expiresAt || null,
      updatedData.password || null,
      slug
    ).run();

    // 清除快取
    const cache = caches.default;
    c.executionCtx.waitUntil(
      Promise.all([
        cache.delete(`https://cache.oao.to/${slug}/social`),
        cache.delete(`https://cache.oao.to/${slug}/user`),
      ])
    );

    return c.json({
      success: true,
      data: updatedData,
    });
  } catch (error) {
    console.error('Update link error:', error);
    return c.json({ error: '更新失敗' }, 500);
  }
});

// 重新抓取元數據
links.post('/:slug/refetch', async (c) => {
  const slug = c.req.param('slug');
  const user = getUserFromContext(c);

  try {
    // 從 KV 讀取現有資料
    const existingStr = await c.env.LINKS.get(`link:${slug}`);
    if (!existingStr) {
      return c.json({ error: '短網址不存在' }, 404);
    }

    const linkData: LinkData = JSON.parse(existingStr);

    // 所有權驗證：只有連結擁有者或管理員可操作
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (linkData.userId !== user.userId && !isAdmin) {
      return c.json({ error: '無權限操作此短網址' }, 403);
    }

    // 重新抓取元數據
    const metadata = await fetchMetadata(linkData.url);

    // 更新資料
    const updatedData: LinkData = {
      ...linkData,
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      updatedAt: Date.now(),
    };

    // 寫回 KV
    await c.env.LINKS.put(`link:${slug}`, JSON.stringify(updatedData));

    // 同步更新 D1
    await c.env.DB.prepare(
      `UPDATE links 
       SET title = ?, updated_at = ?
       WHERE slug = ?`
    ).bind(
      updatedData.title || null,
      updatedData.updatedAt || null,
      slug
    ).run();

    // 清除快取
    const cache = caches.default;
    c.executionCtx.waitUntil(
      Promise.all([
        cache.delete(`https://cache.oao.to/${slug}/social`),
        cache.delete(`https://cache.oao.to/${slug}/user`),
      ])
    );

    return c.json({
      success: true,
      data: updatedData,
      metadata,
    });
  } catch (error) {
    console.error('Refetch metadata error:', error);
    return c.json({ error: '重新抓取失敗' }, 500);
  }
});

// 刪除短網址
links.delete('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const user = getUserFromContext(c);

  // 驗證所有權
  const link = await c.env.DB.prepare(
    'SELECT * FROM links WHERE slug = ? AND user_id = ?'
  ).bind(slug, user.userId).first();

  if (!link) {
    return c.json({ error: 'Link not found or unauthorized' }, 404);
  }

  // 從 KV 刪除
  await c.env.LINKS.delete(`link:${slug}`);

  // 從 D1 刪除
  await c.env.DB.prepare(
    'DELETE FROM links WHERE slug = ? AND user_id = ?'
  ).bind(slug, user.userId).run();

  return c.json({ success: true, message: 'Link deleted' });
});

export default links;

