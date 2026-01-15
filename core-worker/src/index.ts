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

const app = new Hono<{ Bindings: Env }>();

// 根路徑：Landing Page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OAO.TO - 專業短網址服務</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container {
          text-align: center;
          max-width: 600px;
          padding: 40px 20px;
        }
        h1 {
          font-size: 4rem;
          font-weight: 800;
          margin-bottom: 1rem;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .tagline {
          font-size: 1.5rem;
          margin-bottom: 3rem;
          opacity: 0.95;
        }
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .feature {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 1.5rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .feature-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .feature-text {
          font-size: 0.9rem;
          opacity: 0.9;
        }
        .cta {
          display: inline-block;
          background: white;
          color: #667eea;
          padding: 1rem 3rem;
          border-radius: 50px;
          text-decoration: none;
          font-size: 1.2rem;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        .stats {
          margin-top: 3rem;
          font-size: 0.9rem;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>OAO.TO</h1>
        <p class="tagline">快速、安全、專業的短網址服務</p>
        
        <div class="features">
          <div class="feature">
            <div class="feature-icon">⚡</div>
            <div class="feature-text">極速重定向<br>< 10ms</div>
          </div>
          <div class="feature">
            <div class="feature-icon">📊</div>
            <div class="feature-text">詳細分析<br>完整追蹤</div>
          </div>
          <div class="feature">
            <div class="feature-icon">🔒</div>
            <div class="feature-text">安全可靠<br>99.99% 可用</div>
          </div>
          <div class="feature">
            <div class="feature-icon">🌍</div>
            <div class="feature-text">全球分散<br>300+ 節點</div>
          </div>
        </div>

        <a href="https://app.oao.to" class="cta">開始使用 →</a>

        <div class="stats">
          ⚡ 基於 Cloudflare Workers · 全球邊緣運算 · 專業級架構
        </div>
      </div>
    </body>
    </html>
  `, 200);
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
      indexes: [slug, linkData.userId],
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

