// 短網址 CRUD API
// 核心邏輯複製自 shorty.dev 並改寫

import { Hono } from 'hono';
import { createAuthMiddleware, getUserFromContext } from '../middleware/auth';
import type { Env, LinkData } from '../types';

const links = new Hono<{ Bindings: Env }>();

// 保護所有路由（需要登入）
links.use('*', async (c, next) => {
  const authMiddleware = createAuthMiddleware(c.env.JWT_SECRET);
  return authMiddleware(c, next);
});

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
  const user = getUserFromContext(c);
  const { url, title } = await c.req.json();

  // 驗證所有權
  const link = await c.env.DB.prepare(
    'SELECT * FROM links WHERE slug = ? AND user_id = ?'
  ).bind(slug, user.userId).first();

  if (!link) {
    return c.json({ error: 'Link not found or unauthorized' }, 404);
  }

  // 獲取舊數據
  const oldData = await c.env.LINKS.get(`link:${slug}`);
  if (!oldData) {
    return c.json({ error: 'Link data not found in KV' }, 500);
  }

  const linkData = JSON.parse(oldData) as LinkData;
  
  // 更新數據
  if (url) linkData.url = url;
  if (title) linkData.title = title;

  // 更新 KV
  await c.env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

  // 更新 D1
  await c.env.DB.prepare(
    'UPDATE links SET url = ?, title = ? WHERE slug = ? AND user_id = ?'
  ).bind(url || (link as any).url, title || (link as any).title, slug, user.userId).run();

  return c.json({
    slug,
    url: linkData.url,
    title: linkData.title,
    updatedAt: Date.now(),
  });
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


