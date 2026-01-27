// 短網址 CRUD API
// 核心邏輯複製自 shorty.dev 並改寫

import { Hono } from 'hono';
import { requireAuth, getUserFromContext } from '../middleware/auth';
import { fetchMetadata } from '../utils/fetch-metadata';
import type { Env, LinkData } from '../types';

const links = new Hono<{ Bindings: Env }>();

// 創建短網址
links.post('/', async (c) => {
  const { url, slug, title } = await c.req.json();
  const user = getUserFromContext(c);

  // 驗證輸入
  if (!url || !slug) {
    return c.json({ error: 'URL and slug are required' }, 400);
  }

  // 驗證 slug 格式（只允許英數字和連字號）
  if (!/^[a-zA-Z0-9-_]+$/.test(slug)) {
    return c.json({ error: 'Invalid slug format' }, 400);
  }

  // 檢查 slug 是否已存在
  const existing = await c.env.LINKS.get(`link:${slug}`);
  if (existing) {
    return c.json({ error: 'Slug already exists' }, 409);
  }

  // 創建鏈接數據
  const linkData: LinkData = {
    slug,
    url,
    userId: user.userId,
    createdAt: Date.now(),
    title: title || url,
  };

  // 存入 KV
  await c.env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

  // 存入 D1（方便查詢）
  await c.env.DB.prepare(
    'INSERT INTO links (slug, url, user_id, title, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(slug, url, user.userId, title || url, Date.now()).run();

  return c.json({
    slug,
    url,
    title: linkData.title,
    shortUrl: `https://oao.to/${slug}`,
    createdAt: linkData.createdAt,
  }, 201);
});

// 獲取用戶的所有短網址
links.get('/', async (c) => {
  const user = getUserFromContext(c);
  
  const result = await c.env.DB.prepare(
    'SELECT slug, url, title, created_at FROM links WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.userId).all();

  return c.json({
    links: result.results || [],
    total: result.results?.length || 0,
  });
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

    // TODO: 生產環境需要驗證所有權
    // const user = getUserFromContext(c);
    // if (linkData.userId !== user.userId && linkData.userId !== 'anonymous') {
    //   return c.json({ error: '無權限編輯此短網址' }, 403);
    // }

    // 更新資料
    const updatedData: LinkData = {
      ...linkData,
      ...updates,
      updatedAt: Date.now(),
    };

    // 如果修改了 URL，驗證格式
    if (updates.url) {
      try {
        new URL(updates.url);
      } catch {
        return c.json({ error: 'URL 格式不正確' }, 400);
      }
    }

    // 寫回 KV
    await c.env.LINKS.put(`link:${slug}`, JSON.stringify(updatedData));

    // 同步更新 D1（基本欄位）
    await c.env.DB.prepare(
      `UPDATE links 
       SET title = ?, updated_at = ?, expires_at = ?, password = ?
       WHERE slug = ?`
    ).bind(
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

  try {
    // 從 KV 讀取現有資料
    const existingStr = await c.env.LINKS.get(`link:${slug}`);
    if (!existingStr) {
      return c.json({ error: '短網址不存在' }, 404);
    }

    const linkData: LinkData = JSON.parse(existingStr);

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

