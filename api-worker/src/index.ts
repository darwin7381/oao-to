// 主入口
// 核心架構複製自 shorty.dev 並改寫

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trackClick } from './utils/analytics';
import authRouter from './routes/auth';
import linksRouter from './routes/links';
import analyticsRouter from './routes/analytics';
import adminRouter from './routes/admin';
import apiKeysRouter from './routes/api-keys';
import accountRouter from './routes/account';
import v1LinksRouter from './routes/v1-links';
import auditLogsRouter from './routes/audit-logs';
import supportRouter from './routes/support';
import plansRouter from './routes/plans';
import type { Env, LinkData } from './types';

const app = new Hono<{ Bindings: Env }>();

// CORS（允許前端調用）
app.use('*', cors({
  origin: [
    'https://app.oao.to',
    'https://44e055e8.oao-to-app.pages.dev',  // Pages 預設網址（最新）
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
    isActive: true,
  };

  // ✅ 存入 KV
  await c.env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

  const baseUrl = c.req.header('host')?.includes('localhost') 
    ? `http://${c.req.header('host')}`
    : 'https://oao.to';

  // 🚀 背景異步抓取元數據並更新（不阻塞響應）
  c.executionCtx.waitUntil(
    (async () => {
      try {
        const { fetchMetadata } = await import('./utils/fetch-metadata');
        const metadata = await fetchMetadata(url);
        
        const updatedData: LinkData = {
          ...linkData,
          title: metadata.title,
          description: metadata.description,
          image: metadata.image,
          updatedAt: Date.now(),
        };
        
        await c.env.LINKS.put(`link:${slug}`, JSON.stringify(updatedData));
        console.log(`✅ Metadata fetched for ${slug}:`, metadata);
      } catch (error) {
        console.error(`❌ Failed to fetch metadata for ${slug}:`, error);
      }
    })()
  );

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

// 社交媒體爬蟲列表
const SOCIAL_BOTS = [
  'facebookexternalhit',
  'Facebot',
  'twitterbot',
  'LinkedInBot',
  'Discordbot',
  'TelegramBot',
  'WhatsApp',
  'Slackbot',
  'Pinterest',
  'redditbot',
];

/**
 * HTML 轉義（防止 XSS）
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 🔥 核心功能：短網址重定向（混合策略 + Cache API）
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  // 跳過 API 路由
  if (slug === 'api' || slug === 'health') {
    return c.notFound();
  }

  try {
    const userAgent = c.req.header('user-agent') || '';
    
    // 檢測是否為社交媒體爬蟲
    const isSocialBot = SOCIAL_BOTS.some(bot => 
      userAgent.toLowerCase().includes(bot.toLowerCase())
    );

    // 🚀 Cache API：創建快取 key
    const cacheType = isSocialBot ? 'social' : 'user';
    const cacheKey = new Request(
      `https://cache.oao.to/${slug}/${cacheType}`,
      { method: 'GET' }
    );
    
    const cache = caches.default;
    
    // 嘗試從快取讀取
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      console.log(`Cache HIT: ${slug}/${cacheType}`);
      return cachedResponse;
    }
    
    console.log(`Cache MISS: ${slug}/${cacheType}`);

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

    // 檢查是否停用
    if (linkData.isActive === false) {
      return c.text('Link disabled', 403);
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

    let response: Response;

    // 🎯 混合策略：根據是否有自定義預覽決定返回內容
    if (isSocialBot && (linkData.title || linkData.description || linkData.image)) {
      // 有預覽內容：返回 HTML with Open Graph 標籤
      const previewTitle = linkData.title || linkData.url;
      const previewDescription = linkData.description || `通過 OAO.TO 訪問：${linkData.url}`;
      const previewImage = linkData.image || `https://oao.to/default-og.png`;
      
      const baseUrl = c.req.header('host')?.includes('localhost')
        ? `http://${c.req.header('host')}`
        : 'https://oao.to';

      const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(previewTitle)}</title>
  
  <!-- Open Graph (Facebook, LinkedIn, Discord, Telegram) -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}/${slug}">
  <meta property="og:title" content="${escapeHtml(previewTitle)}">
  <meta property="og:description" content="${escapeHtml(previewDescription)}">
  <meta property="og:image" content="${escapeHtml(previewImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="OAO.TO">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(previewTitle)}">
  <meta name="twitter:description" content="${escapeHtml(previewDescription)}">
  <meta name="twitter:image" content="${escapeHtml(previewImage)}">
  
  <!-- 自動重定向 -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(linkData.url)}">
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
    }
    a { color: #667eea; text-decoration: none; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔗 正在重定向...</h1>
    <p>如果沒有自動跳轉，請點擊以下連結：</p>
    <p><a href="${escapeHtml(linkData.url)}">${escapeHtml(linkData.url)}</a></p>
  </div>
  <script>
    setTimeout(() => {
      window.location.href = ${JSON.stringify(linkData.url)};
    }, 100);
  </script>
</body>
</html>`;

      response = new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600', // 快取 1 小時
        }
      });
    } else {
      // 無自定義預覽或非社交爬蟲：直接 301 重定向
      response = new Response(null, {
        status: 301,
        headers: {
          'Location': linkData.url,
          'Cache-Control': 'public, max-age=3600', // 快取 1 小時
        }
      });
    }

    // 🚀 異步存入快取（不阻塞響應）
    c.executionCtx.waitUntil(
      cache.put(cacheKey, response.clone())
    );

    return response;
    
  } catch (error) {
    console.error('Redirect error:', error);
    return c.text('Internal server error', 500);
  }
});

// API 路由（所有 CRUD 操作都在 linksRouter 中）
app.route('/api/auth', authRouter);
app.route('/api/links', linksRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/admin', adminRouter);
app.route('/api/admin/audit-logs', auditLogsRouter);
app.route('/api/admin/support', supportRouter);
app.route('/api/admin/plans', plansRouter);

// API 平台路由
app.route('/api/account/keys', apiKeysRouter);  // API Key 管理
app.route('/api/account', accountRouter);       // Credits 和使用統計

// V1 Public API（需要 API Key）
app.route('/v1/links', v1LinksRouter);          // 公開 API 端點

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

