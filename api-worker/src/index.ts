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
import supportRouter, { userSupport as userSupportRouter, inboundSupport as inboundSupportRouter } from './routes/support';
import plansRouter from './routes/plans';
import checkoutRouter from './routes/checkout';
import stripeWebhookRouter from './routes/stripe-webhook';
import sesEventsRouter from './routes/ses-events';
import promoCodesRouter from './routes/promo-codes';
import subscriptionRouter from './routes/subscription';
import reportRouter from './routes/report';
import type { Env, LinkData } from './types';

import { ALLOWED_ORIGINS } from './config/origins';
import { retryPendingDunningEmails } from './utils/dunning';

// Durable Object 匯出（rate limiter）
export { RateLimiterDO } from './durable-objects/rate-limiter-do';

const app = new Hono<{ Bindings: Env }>();

// CORS（允許前端調用）
app.use('*', cors({
  origin: ALLOWED_ORIGINS,   // 與 CSRF 檢查共用同一份（config/origins.ts）
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 健康檢查
app.get('/health', (c) => c.json({ status: 'ok', service: 'oao.to-api' }));

// 公开的 Plans 端点（不需要认证）
app.get('/public/plans', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT id, name, display_name, price_monthly, price_yearly, 
             monthly_credits, api_calls_per_day, max_api_keys, 
             features, sort_order
      FROM plans
      WHERE is_active = 1 AND is_visible = 1
      ORDER BY sort_order ASC
    `).all();
    
    return c.json({
      success: true,
      data: { plans: results }
    });
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return c.json({ error: 'Failed to fetch plans' }, 500);
  }
});

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

  // URL 安全檢查（協議/封鎖網域/Safe Browsing）
  const { checkUrlSafety } = await import('./utils/url-safety');
  const safety = await checkUrlSafety(c.env, url);
  if (!safety.safe) {
    return c.json({ error: safety.reason || 'URL not allowed' }, 400);
  }

  // 公開端點：以 IP 做 rate limit，防止匿名濫用大量灌連結
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const { checkApiKeyRateLimit } = await import('./utils/rate-limiter');
  const rl = await checkApiKeyRateLimit(c.env, `anon-ip:${ip}`, 20, 200);
  if (!rl.allowed) {
    return c.json({ error: 'Too many requests, please try again later' }, 429);
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

  // ✅ 存入 KV（重定向的 source of truth）
  await c.env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

  // ✅ 同步存入 D1（schema 0012 起 user_id 可 NULL，匿名連結能正常落地）
  try {
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO links (slug, url, user_id, title, source, is_custom, created_at)
       VALUES (?, ?, NULL, ?, 'anonymous', ?, ?)`
    ).bind(slug, url, url, customSlug ? 1 : 0, linkData.createdAt).run();
  } catch (dbErr) {
    console.error(`[shorten] D1 insert failed for ${slug} (non-fatal):`, dbErr);
  }

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
        // 同步標題到 D1
        await c.env.DB.prepare('UPDATE links SET title = ?, updated_at = ? WHERE slug = ?')
          .bind(metadata.title || url, Date.now(), slug).run();
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

    // 檢查密碼保護（hash 驗證，向後相容舊明文）
    if (linkData.password) {
      const password = c.req.query('p') ?? '';
      const { verifyLinkPassword } = await import('./utils/password');
      if (!(await verifyLinkPassword(password, linkData.password))) {
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
      // 無自定義預覽或非社交爬蟲：302 暫時重定向（非 301 永久）
      // 用 302 + 短 max-age，讓停用/過期/改目標的連結能及時生效
      // （301 + 長快取會被瀏覽器永久快取、無法清除，停用後仍持續重定向）
      response = new Response(null, {
        status: 302,
        headers: {
          'Location': linkData.url,
          'Cache-Control': 'public, max-age=60',
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
app.route('/api/support/inbound', inboundSupportRouter); // mailhandler email→工單（service token，先掛避免被 userSupport 的 requireAuth 攔）
app.route('/api/support', userSupportRouter);   // 用戶端工單（建立/查看/回覆自己的）
app.route('/api/admin/plans', plansRouter);

// API 平台路由
app.route('/api/account/keys', apiKeysRouter);  // API Key 管理
app.route('/api/account', accountRouter);       // Credits 和使用統計

// Stripe 支付路由
app.route('/api/checkout', checkoutRouter);     // Checkout 和 Portal
app.route('/api/webhook', stripeWebhookRouter); // Stripe Webhooks
app.route('/api/webhook', sesEventsRouter);     // SES/SNS bounce+complaint feedback loop
app.route('/api/promo-codes', promoCodesRouter); // 優惠碼管理
app.route('/api/subscription', subscriptionRouter); // 訂閱狀態管理
app.route('/api/report', reportRouter);         // 公開連結檢舉（無需登入，IP rate limit）

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

/**
 * 將已取消且超過 period end 的訂閱降回 Free Plan
 * 由 Cron Trigger 每小時執行一次
 */
async function downgradeExpiredSubscriptions(env: Env): Promise<void> {
  const now = Date.now();

  const { results } = await env.DB.prepare(`
    SELECT user_id, plan_type, stripe_subscription_id
    FROM credits
    WHERE subscription_status = 'canceled'
      AND plan_type != 'free'
      AND (subscription_current_period_end IS NULL OR subscription_current_period_end < ?)
  `).bind(now).all();

  if (results.length === 0) {
    console.log('[Cron] No subscriptions to downgrade');
    return;
  }

  console.log(`[Cron] Downgrading ${results.length} expired subscriptions`);

  for (const record of results) {
    const userId = record.user_id as string;
    const previousPlan = record.plan_type as string;

    try {
      const nextResetDate = now + 30 * 24 * 60 * 60 * 1000;

      await env.DB.prepare(`
        UPDATE credits
        SET
          plan_type = 'free',
          billing_period = NULL,
          stripe_subscription_id = NULL,
          subscription_status = NULL,
          subscription_current_period_start = NULL,
          subscription_current_period_end = NULL,
          cancel_at_period_end = 0,
          scheduled_plan_change = NULL,
          monthly_used = 0,
          monthly_reset_at = ?,
          last_plan_change_type = 'expire',
          last_plan_change_at = ?,
          updated_at = ?
        WHERE user_id = ?
      `).bind(nextResetDate, now, now, userId).run();

      await env.DB.prepare(`
        INSERT INTO credit_transactions
        (id, user_id, type, amount, balance_after, description, metadata, created_at)
        VALUES (?, ?, 'subscription', 0,
          (SELECT balance FROM credits WHERE user_id = ?),
          ?, ?, ?)
      `).bind(
        `trans_expire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userId,
        `Subscription expired - downgraded from ${previousPlan} to Free`,
        JSON.stringify({ previousPlan, expiredAt: now }),
        now
      ).run();

      console.log(`✅ [Cron] Downgraded user ${userId} from ${previousPlan} to Free`);
    } catch (err) {
      console.error(`❌ [Cron] Failed to downgrade user ${userId}:`, err);
    }
  }
}

/**
 * 月配額重置（與 Stripe 帳期解耦的兜底機制）
 * - 月繳用戶：invoice.payment_succeeded 先重置，這裡只在漏接 webhook 時接手
 * - 年繳用戶：一年只有一張 invoice，每月重置全靠這裡
 * - Free 用戶：沒有 invoice，全靠這裡
 */
async function resetDueMonthlyQuotas(env: Env): Promise<void> {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  // 歷史資料沒有 reset 錨點的用戶：先補上（不重置，從現在起算一個週期）
  await env.DB.prepare(`
    UPDATE credits SET monthly_reset_at = ? WHERE monthly_reset_at IS NULL
  `).bind(now + THIRTY_DAYS).run();

  // 到期重置。錨點 +30 天保留原節奏；若落後多期，後續每小時的 cron 會逐期補上
  const result = await env.DB.prepare(`
    UPDATE credits
    SET monthly_used = 0, overage_used = 0, monthly_reset_at = monthly_reset_at + ?, updated_at = ?
    WHERE monthly_reset_at <= ?
  `).bind(THIRTY_DAYS, now, now).run();

  const resetCount = result.meta?.changes ?? 0;
  if (resetCount > 0) {
    console.log(`✅ [Cron] Monthly quota reset for ${resetCount} users`);
  }
}

// 匯出 fetch handler + scheduled (Cron) handler
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await downgradeExpiredSubscriptions(env);
    await resetDueMonthlyQuotas(env);
    // 催繳信重試：webhook fast-path 寄失敗的，靠這裡每小時重試（不依賴 Stripe 重送同一事件）
    await retryPendingDunningEmails(env);
  },
};

