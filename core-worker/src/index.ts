// OAO.TO 核心轉址服務
// 職責：只處理短網址重定向，極致簡單，極致快速

import { Hono } from 'hono';

interface Env {
  LINKS: KVNamespace;
  TRACKER: AnalyticsEngineDataset;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
}

interface LinkData {
  slug: string;
  url: string;
  userId: string;
  createdAt: number;
  expiresAt?: number;
  password?: string;
}

const app = new Hono<{ Bindings: Env }>({ strict: false });

// 根路徑：自動跳轉到 app.oao.to
app.get('/', (c) => {
  return c.redirect('https://app.oao.to', 301);
});

// 健康檢查
app.get('/health', (c) => c.json({ 
  status: 'ok', 
  service: 'oao.to-core',
  timestamp: Date.now(),
}));

// 🔥 核心功能：短網址重定向
// 這是整個服務最重要的部分，必須極致快速
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  // 跳過特殊路徑
  if (slug === 'health' || slug === 'favicon.ico') {
    return c.notFound();
  }

  try {
    // 從 KV 獲取鏈接數據
    const linkDataStr = await c.env.LINKS.get(`link:${slug}`);
    
    if (!linkDataStr) {
      // 自訂 404 頁面
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>404 - 短網址不存在</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: system-ui; text-align: center; padding: 50px; }
            h1 { color: #ef4444; }
          </style>
        </head>
        <body>
          <h1>😢 找不到這個短網址</h1>
          <p>短網址 <code>/${slug}</code> 不存在</p>
          <a href="https://app.oao.to">前往首頁創建短網址</a>
        </body>
        </html>
      `, 404);
    }

    const linkData: LinkData = JSON.parse(linkDataStr);

    // 檢查是否過期
    if (linkData.expiresAt && Date.now() > linkData.expiresAt) {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head><title>410 - 短網址已過期</title></head>
        <body style="font-family: system-ui; text-align: center; padding: 50px;">
          <h1>⏰ 短網址已過期</h1>
          <p>這個短網址已經失效</p>
        </body>
        </html>
      `, 410);
    }

    // 檢查密碼保護
    if (linkData.password) {
      const password = c.req.query('p');
      if (password !== linkData.password) {
        return c.html(`
          <!DOCTYPE html>
          <html>
          <head><title>401 - 需要密碼</title></head>
          <body style="font-family: system-ui; text-align: center; padding: 50px;">
            <h1>🔒 此短網址受密碼保護</h1>
            <form method="GET">
              <input type="password" name="p" placeholder="請輸入密碼" required>
              <button type="submit">訪問</button>
            </form>
          </body>
          </html>
        `, 401);
      }
    }

    // 背景追蹤點擊（不阻塞重定向）
    if (c.env.TRACKER) {
      c.executionCtx.waitUntil(trackClick(c.env, slug, linkData, c.req.raw));
    }

    // 重定向到目標網址
    return c.redirect(linkData.url, 301);
  } catch (error) {
    console.error('Redirect error:', error);
    return c.text('Internal server error', 500);
  }
});

// 追蹤點擊
async function trackClick(
  env: Env,
  slug: string,
  linkData: LinkData,
  request: Request
): Promise<void> {
  try {
    const cfProperties = (request as any).cf;
    
    if (!cfProperties) {
      console.warn('CF properties not available');
      return;
    }

    await env.TRACKER.writeDataPoint({
      blobs: [
        slug,
        linkData.url,
        linkData.userId,
        cfProperties.country || 'Unknown',
        cfProperties.city || 'Unknown',
        cfProperties.continent || 'Unknown',
        cfProperties.timezone || 'Unknown',
        request.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'desktop',
      ],
      doubles: [
        Date.now(),
        cfProperties.longitude || 0,
        cfProperties.latitude || 0,
      ],
      indexes: [slug],  // 只使用 slug 作為 index（最多支援 1 個）
    });
  } catch (error) {
    console.error('Failed to track click:', error);
  }
}

// 404 處理
app.notFound((c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head><title>404 - Not Found</title></head>
    <body style="font-family: system-ui; text-align: center; padding: 50px;">
      <h1>404 - 頁面不存在</h1>
      <a href="https://app.oao.to">返回首頁</a>
    </body>
    </html>
  `, 404);
});

export default app;

