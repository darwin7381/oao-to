// 主入口
// 核心架構複製自 shorty.dev 並改寫

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trackClick } from './utils/analytics';
import authRouter from './routes/auth';
import linksRouter from './routes/links';
import analyticsRouter from './routes/analytics';
import adminRouter from './routes/admin';
import type { Env, LinkData } from './types';

const app = new Hono<{ Bindings: Env }>();

// CORS（允許前端調用）
app.use('*', cors({
  origin: [
    'https://app.oao.to',
    'https://28ad8abb.oao-to-app.pages.dev',  // Pages 預設網址
    'http://localhost:5173',  // 本地開發
    'http://localhost:3000'
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 健康檢查
app.get('/health', (c) => c.json({ status: 'ok', service: 'oao.to-api' }));

// 🌐 公開端點：快速創建短網址（無需登入）
app.post('/shorten', async (c) => {
  const { url, customSlug } = await c.req.json();
  
  if (!url) {
    return c.json({ error: 'url 是必填的' }, 400);
  }

  // 驗證 URL 格式
  try {
    new URL(url);
  } catch {
    return c.json({ error: 'URL 格式不正確' }, 400);
  }

  let slug: string;

  // 如果提供自訂 slug，使用它；否則生成隨機 slug
  if (customSlug) {
    // 驗證自訂 slug 格式
    if (!/^[a-zA-Z0-9-_]{1,50}$/.test(customSlug)) {
      return c.json({ error: 'slug 格式不正確（只允許英數字、連字號、底線）' }, 400);
    }

    // 檢查是否已存在
    const existing = await c.env.LINKS.get(`link:${customSlug}`);
    if (existing) {
      return c.json({ error: 'slug 已被使用，請換一個' }, 409);
    }

    slug = customSlug;
  } else {
    // 生成隨機 slug（確保唯一）
    const { generateUniqueSlug } = await import('./utils/slug-generator');
    slug = await generateUniqueSlug(c.env);
  }

  // 創建鏈接數據
  const linkData: LinkData = {
    slug,
    url,
    userId: 'anonymous',  // 公開創建的標記為 anonymous
    createdAt: Date.now(),
    title: url,
  };

  // 存入 KV
  await c.env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

  const baseUrl = c.req.header('host')?.includes('localhost') 
    ? `http://${c.req.header('host')}`
    : 'https://oao.to';

  return c.json({
    success: true,
    slug,
    url,
    shortUrl: `${baseUrl}/${slug}`,
    createdAt: linkData.createdAt,
  }, 201);
});

// 🧪 列出所有短網址（測試用）
app.get('/test-list', async (c) => {
  try {
    // 獲取所有以 link: 開頭的 key
    const list = await c.env.LINKS.list({ prefix: 'link:' });
    
    const links = await Promise.all(
      list.keys.map(async (key) => {
        const data = await c.env.LINKS.get(key.name);
        return data ? JSON.parse(data) : null;
      })
    );

    return c.json({
      links: links.filter(l => l !== null),
      total: links.length,
    });
  } catch (error) {
    console.error('List error:', error);
    return c.json({ error: 'Failed to list links' }, 500);
  }
});

// 🔥 核心功能：短網址重定向（最關鍵！）
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  // 跳過 API 路由
  if (slug === 'api' || slug === 'health') {
    return c.notFound();
  }

  try {
    // 從 KV 獲取鏈接數據
    const linkDataStr = await c.env.LINKS.get(`link:${slug}`);
    
    if (!linkDataStr) {
      return c.notFound();
    }

    const linkData: LinkData = JSON.parse(linkDataStr);

    // 檢查是否過期
    if (linkData.expiresAt && Date.now() > linkData.expiresAt) {
      return c.text('Link expired', 410);
    }

    // 檢查密碼保護
    if (linkData.password) {
      const password = c.req.query('p');
      if (password !== linkData.password) {
        return c.text('Password required', 401);
      }
    }

    // 背景追蹤點擊（不阻塞重定向）
    c.executionCtx.waitUntil(
      trackClick(c.env, slug, linkData.url, linkData.userId, c.req.raw)
    );

    // 重定向到目標網址
    return c.redirect(linkData.url, 301);
  } catch (error) {
    console.error('Redirect error:', error);
    return c.text('Internal server error', 500);
  }
});

// API 路由
app.route('/api/auth', authRouter);
app.route('/api/links', linksRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/admin', adminRouter);

// 404 處理
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// 錯誤處理
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;

