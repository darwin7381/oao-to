# Stripe 整合完整指南

**專案**：OAO.TO 短網址服務  
**版本**：V1.0  
**日期**：2026-01-28  
**目的**：實現訂閱付費和 Credits 購買功能

---

## 📋 目錄

1. [架構概覽](#架構概覽)
2. [Stripe 功能清單](#stripe-功能清單)
3. [資料庫調整](#資料庫調整)
4. [API 端點實現](#api-端點實現)
5. [Webhook 事件處理](#webhook-事件處理)
6. [安全性注意事項](#安全性注意事項)
7. [測試流程](#測試流程)
8. [上線檢查清單](#上線檢查清單)
9. [常見問題](#常見問題)

---

## 🏗️ 架構概覽

### 系統整合架構

```
┌─────────────────────────────────────────────────────────────┐
│                       用戶流程                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 用戶點擊 Pricing 頁面的「Get Started」                   │
│     ↓                                                        │
│  2. 前端呼叫 POST /api/checkout/create                       │
│     ↓                                                        │
│  3. API Worker 呼叫 Stripe API 建立 Checkout Session        │
│     ↓                                                        │
│  4. 返回 session.url 給前端                                  │
│     ↓                                                        │
│  5. 前端重導向到 Stripe 付款頁面                             │
│     ↓                                                        │
│  6. 用戶在 Stripe 完成付款                                   │
│     ↓                                                        │
│  7. Stripe 重導向回你的網站（成功頁面）                      │
│     │                                                        │
│     └─► 同時，Stripe 發送 Webhook 到你的 API                │
│         ↓                                                    │
│         POST /api/webhook/stripe                             │
│         ↓                                                    │
│         驗證簽名 → 處理事件 → 更新 D1 → 發放 credits         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 技術棧

- **前端**：React + TypeScript（已有 Pricing.tsx）
- **後端**：Cloudflare Workers + Hono
- **資料庫**：Cloudflare D1（SQLite）
- **支付**：Stripe Checkout + Webhooks
- **SDK**：`stripe` npm package

---

## 🎯 Stripe 功能清單

### 1. Checkout Sessions（付款頁面）⭐⭐⭐

**用途**：託管的付款頁面，不用自己寫表單

**使用場景**：
- 訂閱方案購買（Starter/Pro）
- 一次性購買 Credits

**優點**：
- ✅ 完整的付款流程（信用卡、Apple Pay、Google Pay）
- ✅ 自動處理 3D Secure
- ✅ 多語言、多貨幣
- ✅ Mobile-optimized
- ✅ 自動產生收據

**API 呼叫範例**：
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',  // 或 'payment' (一次性)
  customer_email: user.email,
  line_items: [
    {
      price: 'price_pro_monthly',  // Stripe Price ID
      quantity: 1,
    },
  ],
  success_url: 'https://app.oao.to/dashboard?success=true',
  cancel_url: 'https://app.oao.to/pricing?canceled=true',
  metadata: {
    user_id: user.id,  // 關鍵：Webhook 時用來關聯用戶
    plan_type: 'pro',
  },
});
```

---

### 2. Customer Portal（客戶管理入口）⭐⭐⭐

**用途**：讓用戶自助管理訂閱，完全不用寫程式碼

**功能**：
- ✅ 取消訂閱
- ✅ 升級/降級方案
- ✅ 更新付款方式（信用卡過期）
- ✅ 查看發票歷史
- ✅ 下載收據（自動符合稅務規定）

**API 呼叫範例**：
```typescript
const session = await stripe.billingPortal.sessions.create({
  customer: user.stripe_customer_id,
  return_url: 'https://app.oao.to/dashboard',
});
// 返回 session.url，前端重導向
```

**注意**：Portal 需要在 Stripe Dashboard 先啟用和配置

---

### 3. Webhooks（事件通知）⭐⭐⭐⭐⭐

**用途**：Stripe 在各種事件發生時主動通知你的 API

**為什麼需要 Webhook？**
- 用戶可能在付款頁面停留很久才完成
- 用戶可能關閉瀏覽器
- Stripe 會處理重試付款
- **非同步事件必須透過 Webhook 才能得知**

#### 必須處理的事件

##### 🟢 `checkout.session.completed`
**時機**：用戶首次訂閱成功

**需要做的事**：
1. 建立或更新 `stripe_customer_id`
2. 記錄 `stripe_subscription_id`
3. 更新 `plan_type`（例如 free → pro）
4. 設定 `subscription_status = 'active'`
5. 記錄訂閱週期結束時間
6. **可選**：給升級獎勵 credits

**範例處理邏輯**：
```typescript
const session = event.data.object;
const userId = session.metadata.user_id;
const planType = session.metadata.plan_type;

// 更新用戶
await env.DB.prepare(`
  UPDATE users 
  SET stripe_customer_id = ?
  WHERE id = ?
`).bind(session.customer, userId).run();

// 更新 credits
await env.DB.prepare(`
  UPDATE credits
  SET 
    plan_type = ?,
    stripe_subscription_id = ?,
    subscription_status = 'active',
    subscription_current_period_end = ?,
    updated_at = ?
  WHERE user_id = ?
`).bind(
  planType,
  session.subscription,
  session.subscription.current_period_end * 1000,
  Date.now(),
  userId
).run();

// 可選：升級獎勵
if (planType === 'pro') {
  await giveBonus(userId, 500, 'Pro plan 升級獎勵');
}
```

---

##### 🔵 `invoice.payment_succeeded`
**時機**：每月自動扣款成功

**需要做的事**：
1. 重置月配額（`monthly_used = 0`）
2. 更新下次重置時間
3. **不要動 `balance`**（Pool B 永久 credits）
4. 記錄續費交易

**範例處理邏輯**：
```typescript
const invoice = event.data.object;
const customerId = invoice.customer;

// 查詢用戶
const user = await env.DB.prepare(`
  SELECT id FROM users WHERE stripe_customer_id = ?
`).bind(customerId).first();

// 重置月配額
await env.DB.prepare(`
  UPDATE credits
  SET 
    monthly_used = 0,
    monthly_reset_at = ?,
    updated_at = ?
  WHERE user_id = ?
`).bind(
  getNextMonthTimestamp(),
  Date.now(),
  user.id
).run();

// 記錄續費
await recordTransaction({
  user_id: user.id,
  type: 'subscription_renewal',
  amount: 0,
  description: '訂閱續費成功',
});
```

---

##### 🔴 `invoice.payment_failed`
**時機**：扣款失敗（信用卡過期、餘額不足）

**需要做的事**：
1. 更新 `subscription_status = 'past_due'`
2. **暫時保留服務**（Stripe 會自動重試）
3. 發送催繳郵件（可選）
4. 如果多次失敗後取消訂閱

**範例處理邏輯**：
```typescript
const invoice = event.data.object;
const customerId = invoice.customer;

// 更新狀態
await env.DB.prepare(`
  UPDATE credits
  SET 
    subscription_status = 'past_due',
    updated_at = ?
  WHERE user_id = (
    SELECT id FROM users WHERE stripe_customer_id = ?
  )
`).bind(Date.now(), customerId).run();

// 發送郵件提醒（可選）
await sendEmail({
  to: user.email,
  subject: '付款失敗提醒',
  body: '您的訂閱付款失敗，請更新付款方式...',
});
```

---

##### 🟡 `customer.subscription.updated`
**時機**：用戶升級/降級方案

**需要做的事**：
1. 更新 `plan_type`
2. `monthly_quota` 會自動變化（因為 JOIN plans 表）
3. 可選：給升級獎勵或扣除降級差額

**範例處理邏輯**：
```typescript
const subscription = event.data.object;
const newPriceId = subscription.items.data[0].price.id;

// 根據 price_id 判斷新方案
const planTypeMap = {
  'price_starter_monthly': 'starter',
  'price_starter_yearly': 'starter',
  'price_pro_monthly': 'pro',
  'price_pro_yearly': 'pro',
};
const newPlanType = planTypeMap[newPriceId];

// 更新方案
await env.DB.prepare(`
  UPDATE credits
  SET 
    plan_type = ?,
    updated_at = ?
  WHERE stripe_subscription_id = ?
`).bind(newPlanType, Date.now(), subscription.id).run();
```

---

##### ⚫ `customer.subscription.deleted`
**時機**：訂閱被取消

**需要做的事**：
1. 設定 `subscription_status = 'canceled'`
2. 記錄到期時間
3. **不要立即降級**（讓用戶用完當期）
4. **不要扣除 credits**（Pool B 已給的不收回）
5. 到期後才降為 Free plan

**範例處理邏輯**：
```typescript
const subscription = event.data.object;

// 標記為已取消
await env.DB.prepare(`
  UPDATE credits
  SET 
    subscription_status = 'canceled',
    subscription_cancel_at_period_end = ?,
    updated_at = ?
  WHERE stripe_subscription_id = ?
`).bind(
  subscription.current_period_end * 1000,
  Date.now(),
  subscription.id
).run();

// 實際降級由 Cron Job 處理（每天跑一次）
// 檢查 subscription_cancel_at_period_end < NOW()
```

---

### 4. Customers（客戶管理）

**用途**：Stripe 幫你管理客戶資料

**關鍵概念**：
- 一個用戶 = 一個 Stripe Customer
- Customer ID 儲存在你的 `users.stripe_customer_id`
- Customer 可以有多個 Subscriptions（但通常只有一個）

**首次建立 Customer**：
```typescript
// 方法 1：Checkout Session 自動建立
// metadata 會自動帶到 Customer

// 方法 2：手動建立
const customer = await stripe.customers.create({
  email: user.email,
  metadata: {
    user_id: user.id,
  },
});
```

---

### 5. Products & Prices（產品和價格）

**在 Stripe Dashboard 設定**：

#### Product 1: Starter Plan
- Price 1: `price_starter_monthly` - $9/month
- Price 2: `price_starter_yearly` - $89/year（省 17%）

#### Product 2: Pro Plan
- Price 1: `price_pro_monthly` - $29/month
- Price 2: `price_pro_yearly` - $289/year（省 17%）

**重要**：記下每個 Price ID，前端會用到

---

### 6. Payment Intents（一次性支付）

**用途**：購買 Credits（不是訂閱）

**使用場景**：
```
用戶在 Pricing 頁面拖動 slider
選擇購買 5000 credits ($50)
點擊「Buy Credits」
```

**實現方式**：
```typescript
// 後端建立 Payment Intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000,  // $50.00 (以分為單位)
  currency: 'usd',
  metadata: {
    user_id: user.id,
    credits_amount: 5000,
  },
});

// 返回 client_secret 給前端
// 前端用 Stripe Elements 完成付款
```

**Webhook 處理**：
```typescript
// 監聽 payment_intent.succeeded
const paymentIntent = event.data.object;
const creditsAmount = parseInt(paymentIntent.metadata.credits_amount);

// 增加 credits
await env.DB.prepare(`
  UPDATE credits
  SET 
    balance = balance + ?,
    purchased_balance = purchased_balance + ?,
    total_purchased = total_purchased + ?,
    updated_at = ?
  WHERE user_id = ?
`).bind(
  creditsAmount,
  creditsAmount,
  creditsAmount,
  Date.now(),
  userId
).run();
```

---

### 7. Coupons & Promotion Codes（折扣碼）

**兩種方式**：

#### 方式 1：Stripe Coupons（推薦用於通用折扣）
```typescript
// 在 Stripe Dashboard 建立 Coupon
// 或用 API 建立
const coupon = await stripe.coupons.create({
  percent_off: 20,  // 8 折
  duration: 'once',  // 'once', 'repeating', 'forever'
  name: 'LAUNCH20',
});

// Checkout 時套用
const session = await stripe.checkout.sessions.create({
  // ...
  discounts: [{
    coupon: 'LAUNCH20',
  }],
});
```

#### 方式 2：自己的折扣系統（更靈活）
見下方「價格管理策略」章節

---

## 🗄️ 資料庫調整

### ⚠️ 執行 Migration 的正確方式

**重要**：必須使用與 Worker 相同的 `--persist-to` 路徑！

```bash
# Worker 啟動方式
cd api-worker
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared

# ✅ Migration 必須使用相同路徑
cd api-worker
wrangler d1 migrations apply oao-to-db --local --persist-to ../.wrangler/oao-shared

# ❌ 錯誤（會創建不同的資料庫）
wrangler d1 migrations apply oao-to-db --local
```

**為什麼？**
- Worker 和 Migration 必須操作同一個資料庫檔案
- 路徑不同 = 不同的 SQLite 檔案
- 會導致數據不一致、欄位缺失等問題

**教訓**：2026-01-29 實際遇到此問題，導致訂閱數據消失

---

### Migration 0007: Stripe Integration

```sql
-- ==========================================
-- 1. 擴展 users 表
-- ==========================================
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);

-- ==========================================
-- 2. 擴展 credits 表
-- ==========================================
ALTER TABLE credits ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE credits ADD COLUMN subscription_status TEXT;
ALTER TABLE credits ADD COLUMN subscription_current_period_end INTEGER;
ALTER TABLE credits ADD COLUMN subscription_cancel_at_period_end INTEGER DEFAULT 0;

CREATE INDEX idx_credits_stripe_subscription ON credits(stripe_subscription_id);
CREATE INDEX idx_credits_subscription_status ON credits(subscription_status);

-- ==========================================
-- 3. Stripe Webhook 事件日誌
-- ==========================================
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed INTEGER DEFAULT 0,
  processing_started_at INTEGER,
  processing_completed_at INTEGER,
  error TEXT,
  raw_data TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_stripe_events_type ON stripe_events(event_type);
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed);
CREATE INDEX idx_stripe_events_created_at ON stripe_events(created_at);

-- ==========================================
-- 4. Stripe 價格映射表（重要！）
-- ==========================================
-- 這個表讓你可以在自己的系統管理價格
-- 而不是硬編碼 Stripe Price ID
CREATE TABLE IF NOT EXISTS stripe_prices (
  id TEXT PRIMARY KEY,
  stripe_price_id TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL,
  billing_period TEXT NOT NULL,  -- 'monthly', 'yearly'
  amount INTEGER NOT NULL,        -- 以分為單位
  currency TEXT DEFAULT 'usd',
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

-- 插入初始價格映射
INSERT INTO stripe_prices (id, stripe_price_id, plan_type, billing_period, amount, created_at) VALUES
  ('sp_starter_monthly', 'price_xxx_REPLACE_ME', 'starter', 'monthly', 900, strftime('%s', 'now') * 1000),
  ('sp_starter_yearly', 'price_xxx_REPLACE_ME', 'starter', 'yearly', 8900, strftime('%s', 'now') * 1000),
  ('sp_pro_monthly', 'price_xxx_REPLACE_ME', 'pro', 'monthly', 2900, strftime('%s', 'now') * 1000),
  ('sp_pro_yearly', 'price_xxx_REPLACE_ME', 'pro', 'yearly', 28900, strftime('%s', 'now') * 1000);

-- ==========================================
-- 5. 優惠碼表（自己的系統）
-- ==========================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL,   -- 'percentage', 'fixed_amount', 'credits_bonus'
  discount_value INTEGER NOT NULL,
  
  -- 適用範圍
  applies_to TEXT,                -- 'all', 'starter', 'pro', 'credits_purchase'
  min_purchase_amount INTEGER,
  
  -- 使用限制
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  
  -- 有效期
  valid_from INTEGER,
  valid_until INTEGER,
  
  -- 狀態
  is_active INTEGER DEFAULT 1,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  created_by TEXT,  -- admin user_id
  
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active);

-- ==========================================
-- 6. 優惠碼使用記錄
-- ==========================================
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id TEXT PRIMARY KEY,
  promo_code_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  -- 使用詳情
  discount_amount INTEGER,
  credits_bonus INTEGER,
  
  -- 關聯訂單
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  
  UNIQUE(promo_code_id, user_id)  -- 每個用戶只能用一次同一個碼
);

CREATE INDEX idx_promo_usage_user ON promo_code_usage(user_id);
CREATE INDEX idx_promo_usage_code ON promo_code_usage(promo_code_id);
```

---

## 🔧 API 端點實現

### 1. POST /api/checkout/create

**用途**：建立 Stripe Checkout Session

**請求**：
```json
{
  "priceId": "price_pro_monthly",
  "mode": "subscription",
  "promoCode": "LAUNCH20"  // 可選
}
```

**實現**：
```typescript
app.post('/api/checkout/create', requireAuth, async (c) => {
  const { priceId, mode, promoCode } = await c.req.json();
  const user = c.get('user');
  
  // 驗證 price_id
  const priceMapping = await c.env.DB.prepare(`
    SELECT * FROM stripe_prices 
    WHERE stripe_price_id = ? AND is_active = 1
  `).bind(priceId).first();
  
  if (!priceMapping) {
    return c.json({ error: 'Invalid price ID' }, 400);
  }
  
  // 處理優惠碼（如果有）
  let discounts = [];
  if (promoCode) {
    const promo = await validatePromoCode(c.env, promoCode, user.id);
    if (promo) {
      // 使用自己的優惠碼系統
      // 或建立 Stripe Coupon
      discounts = [{ coupon: promo.stripe_coupon_id }];
    }
  }
  
  // 建立 Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: mode || 'subscription',
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    discounts,
    success_url: `${c.env.FRONTEND_URL}/dashboard?success=true`,
    cancel_url: `${c.env.FRONTEND_URL}/pricing?canceled=true`,
    metadata: {
      user_id: user.id,
      plan_type: priceMapping.plan_type,
      promo_code: promoCode || '',
    },
  });
  
  return c.json({ 
    sessionUrl: session.url,
    sessionId: session.id,
  });
});
```

---

### 2. POST /api/checkout/portal

**用途**：建立 Customer Portal Session

**請求**：無（從 JWT 取 user）

**實現**：
```typescript
app.post('/api/checkout/portal', requireAuth, async (c) => {
  const user = c.get('user');
  
  // 查詢 stripe_customer_id
  const dbUser = await c.env.DB.prepare(`
    SELECT stripe_customer_id FROM users WHERE id = ?
  `).bind(user.id).first();
  
  if (!dbUser?.stripe_customer_id) {
    return c.json({ error: 'No active subscription' }, 400);
  }
  
  // 建立 Portal Session
  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripe_customer_id,
    return_url: `${c.env.FRONTEND_URL}/dashboard`,
  });
  
  return c.json({ portalUrl: session.url });
});
```

---

### 3. POST /api/webhook/stripe

**用途**：接收 Stripe Webhook 事件

**關鍵注意事項**：
- ✅ 必須驗證簽名
- ✅ 必須處理冪等性（同一事件可能收多次）
- ✅ 必須快速回應 200（< 5 秒）
- ✅ 失敗要記錄錯誤

**實現**：
```typescript
app.post('/api/webhook/stripe', async (c) => {
  const sig = c.req.header('stripe-signature');
  const body = await c.req.text();
  
  let event;
  
  try {
    // 🔒 驗證簽名（防止偽造）
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      c.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return c.json({ error: 'Invalid signature' }, 400);
  }
  
  // 🔄 冪等性檢查
  const existing = await c.env.DB.prepare(`
    SELECT * FROM stripe_events WHERE stripe_event_id = ?
  `).bind(event.id).first();
  
  if (existing && existing.processed) {
    console.log(`Event ${event.id} already processed`);
    return c.json({ received: true });
  }
  
  // 記錄事件
  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO stripe_events 
    (id, stripe_event_id, event_type, raw_data, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    `evt_${Date.now()}`,
    event.id,
    event.type,
    JSON.stringify(event),
    Date.now()
  ).run();
  
  // 標記為處理中
  await c.env.DB.prepare(`
    UPDATE stripe_events 
    SET processing_started_at = ? 
    WHERE stripe_event_id = ?
  `).bind(Date.now(), event.id).run();
  
  try {
    // 根據事件類型處理
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(c.env, event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(c.env, event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(c.env, event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(c.env, event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(c.env, event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // 標記為已處理
    await c.env.DB.prepare(`
      UPDATE stripe_events 
      SET processed = 1, processing_completed_at = ?
      WHERE stripe_event_id = ?
    `).bind(Date.now(), event.id).run();
    
  } catch (err) {
    // 記錄錯誤
    await c.env.DB.prepare(`
      UPDATE stripe_events 
      SET error = ? 
      WHERE stripe_event_id = ?
    `).bind(err.message, event.id).run();
    
    console.error('Webhook processing error:', err);
    // 仍然返回 200（Stripe 會重試）
  }
  
  return c.json({ received: true });
});
```

---

## 🔐 安全性注意事項

### 1. Webhook 簽名驗證（必須！）

```typescript
// ❌ 錯誤：不驗證簽名
app.post('/webhook', async (c) => {
  const event = await c.req.json();  // 危險！可能被偽造
  // ...
});

// ✅ 正確：驗證簽名
app.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature');
  const body = await c.req.text();
  
  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    WEBHOOK_SECRET  // 從 Stripe Dashboard 取得
  );
  // ...
});
```

---

### 2. API Keys 安全管理

```bash
# Cloudflare Workers Secrets
wrangler secret put STRIPE_SECRET_KEY_TEST
wrangler secret put STRIPE_SECRET_KEY_LIVE
wrangler secret put STRIPE_WEBHOOK_SECRET_TEST
wrangler secret put STRIPE_WEBHOOK_SECRET_LIVE

# ❌ 絕對不要把 Secret Key 寫在程式碼裡
# ❌ 絕對不要 commit 到 git
# ❌ 絕對不要在前端使用 Secret Key
```

---

### 3. 環境區分

```typescript
// 根據環境使用不同的 keys
const getStripeKey = (env: Env) => {
  return env.ENVIRONMENT === 'production'
    ? env.STRIPE_SECRET_KEY_LIVE
    : env.STRIPE_SECRET_KEY_TEST;
};

const stripe = new Stripe(getStripeKey(c.env), {
  apiVersion: '2024-11-20.acacia',
});
```

---

### 4. 冪等性處理

```typescript
// 同一個事件可能收到多次（網路問題、Stripe 重試）
// 必須確保不會重複處理

// ✅ 使用 stripe_event_id 作為唯一標識
const existing = await DB.prepare(`
  SELECT * FROM stripe_events 
  WHERE stripe_event_id = ? AND processed = 1
`).bind(event.id).first();

if (existing) {
  return c.json({ received: true });  // 已處理，直接返回
}
```

---

### 5. Metadata 驗證

```typescript
// 從 Webhook 取得的 metadata 要驗證
const userId = event.data.object.metadata.user_id;

if (!userId) {
  throw new Error('Missing user_id in metadata');
}

// 驗證用戶存在
const user = await DB.prepare('SELECT * FROM users WHERE id = ?')
  .bind(userId).first();

if (!user) {
  throw new Error('User not found');
}
```

---

## 🧪 測試流程

### 1. 本地測試 Webhook（使用 Stripe CLI）

```bash
# 安裝 Stripe CLI
brew install stripe/stripe-cli/stripe

# 登入
stripe login

# 監聽 Webhook（轉發到本地）
stripe listen --forward-to http://localhost:8788/api/webhook/stripe

# 你會得到一個 webhook signing secret: whsec_xxx
# 設定到環境變數
wrangler secret put STRIPE_WEBHOOK_SECRET_TEST
# 輸入: whsec_xxx

# 觸發測試事件
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.deleted
```

---

### 2. 測試訂閱流程

#### 步驟 1：建立測試產品
1. 前往 Stripe Dashboard (Test Mode)
2. Products → Create Product
3. 建立 "Pro Plan Test"
4. Price: $1/month（測試用低價）
5. 記下 Price ID: `price_test_xxx`

#### 步驟 2：測試付款
1. 前端點擊「Get Started」
2. 使用測試卡號：`4242 4242 4242 4242`
3. 任意未來日期、任意 CVC
4. 完成付款
5. 確認重導向回成功頁面
6. 檢查 Webhook 是否收到事件
7. 檢查資料庫是否更新

#### 步驟 3：測試 Customer Portal
1. Dashboard 點擊「管理訂閱」
2. 確認能看到訂閱詳情
3. 測試更新付款方式
4. 測試取消訂閱

---

### 3. 測試卡號清單

```
成功付款：
4242 4242 4242 4242

需要 3D Secure：
4000 0027 6000 3184

付款失敗（餘額不足）：
4000 0000 0000 9995

付款失敗（被拒絕）：
4000 0000 0000 0002

過期日期：任意未來日期（如 12/34）
CVC：任意 3 位數（如 123）
```

---

## ✅ 上線檢查清單

### 上線前準備

- [ ] **Stripe 帳號完成認證**（KYC）
- [ ] **建立生產環境產品和價格**
- [ ] **記錄所有 Price IDs**
- [ ] **設定生產環境 Webhook 端點（⚠️ 必須用 CLI/API，Dashboard UI 無法編輯事件）**
  - URL: `https://api.oao.to/api/webhook/stripe`
  - 見下方「Webhook 端點設定指令」
- [ ] **取得生產環境 API Keys**
- [ ] **設定 Cloudflare Secrets**
  ```bash
  wrangler secret put STRIPE_SECRET_KEY_LIVE
  wrangler secret put STRIPE_PUBLISHABLE_KEY_LIVE
  wrangler secret put STRIPE_WEBHOOK_SECRET_LIVE
  ```
- [ ] **配置 Customer Portal**
  - Stripe Dashboard → Settings → Customer Portal
  - 啟用功能：取消訂閱、升降級、更新付款方式
- [ ] **設定稅務處理**（如需要）
- [ ] **設定發票 Email 模板**

---

### Webhook 端點設定指令

⚠️ **Stripe 新版 Workbench UI 無法編輯已存在 endpoint 的事件列表，必須用 CLI 或 API。**

**建立生產 Webhook Endpoint：**
```bash
stripe webhook_endpoints create \
  --url="https://api.oao.to/api/webhook/stripe" \
  --enabled-events="checkout.session.completed,invoice.payment_succeeded,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted,payment_intent.succeeded,subscription_schedule.created,subscription_schedule.updated" \
  --api-version="2025-02-24.acacia" \
  --live
```

**如果 endpoint 已存在，更新事件列表：**
```bash
# 查出 endpoint ID
stripe webhook_endpoints list --live

# 更新
stripe webhook_endpoints update we_XXXXX \
  --enabled-events="checkout.session.completed,invoice.payment_succeeded,invoice.payment_failed,customer.subscription.updated,customer.subscription.deleted,payment_intent.succeeded,subscription_schedule.created,subscription_schedule.updated" \
  --live
```

**建立後，將 signing secret 設定到 Worker：**
```bash
cd api-worker
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# 貼入 whsec_live_... 值
```

### Webhook 事件清單（8 個必須監聽）

| 事件 | 用途 | Handler |
|------|------|---------|
| `checkout.session.completed` | 首次訂閱成功 | `handleCheckoutCompleted()` |
| `invoice.payment_succeeded` | 月度續費 + 配額重置 | `handlePaymentSucceeded()` |
| `invoice.payment_failed` | 付款失敗處理 | `handlePaymentFailed()` |
| `customer.subscription.updated` | 方案變更（升降級）| `handleSubscriptionUpdated()` |
| `customer.subscription.deleted` | 訂閱取消 | `handleSubscriptionDeleted()` |
| `payment_intent.succeeded` | 一次性 Credits 購買 | `handlePaymentIntentSucceeded()` |
| `subscription_schedule.created` | Portal 排程降級建立 | `handleSubscriptionSchedule()` |
| `subscription_schedule.updated` | Portal 排程修改 | `handleSubscriptionSchedule()` |

**本地開發**：`stripe listen --forward-to localhost:8788/api/webhook/stripe`（自動接收所有事件）

---

### 功能測試清單

- [ ] **訂閱流程**
  - [ ] Free → Starter 升級
  - [ ] Free → Pro 升級
  - [ ] Starter → Pro 升級
  - [ ] Pro → Starter 降級
  - [ ] 年付轉月付
  - [ ] 月付轉年付
- [ ] **Credits 發放**
  - [ ] 新訂閱時 credits 正確
  - [ ] 每月續費時重置 monthly_used
  - [ ] balance 不受續費影響
- [ ] **取消訂閱**
  - [ ] 標記為 canceled
  - [ ] 可用到期末
  - [ ] 到期後自動降級
  - [ ] credits 保留
- [ ] **付款失敗處理**
  - [ ] 狀態更新為 past_due
  - [ ] 服務保留（grace period）
  - [ ] Email 通知
- [ ] **Customer Portal**
  - [ ] 能訪問 Portal
  - [ ] 更新付款方式
  - [ ] 查看發票
  - [ ] 下載收據
- [ ] **一次性購買 Credits**
  - [ ] Payment Intent 成功
  - [ ] Credits 正確發放
  - [ ] 交易記錄正確

---

## ❓ 常見問題

### Q1: Webhook 沒收到事件怎麼辦？

**檢查清單**：
1. Stripe Dashboard → Developers → Webhooks → 檢查狀態
2. 查看 Webhook 日誌，是否有錯誤
3. 確認端點 URL 正確
4. 確認端點可公開訪問（不是 localhost）
5. 檢查簽名驗證是否正確
6. 查看 `stripe_events` 表是否有記錄

**除錯方式**：
```bash
# 查看 Webhook 日誌
# Stripe Dashboard → Developers → Webhooks → 點擊你的端點 → View logs

# 手動重發事件
# 在事件詳情頁點擊「Resend event」
```

---

### Q2: 用戶付款成功但資料庫沒更新？

**可能原因**：
1. Webhook 處理失敗（檢查 `stripe_events.error`）
2. Metadata 缺失（檢查 Checkout Session 是否帶 user_id）
3. 冪等性問題（事件已標記為處理但實際沒處理）
4. 資料庫寫入失敗（檢查 D1 logs）

**解決方式**：
```typescript
// 加強錯誤處理和日誌
try {
  await handleCheckoutCompleted(env, session);
  console.log(`✅ Checkout completed for user ${userId}`);
} catch (err) {
  console.error(`❌ Failed to process checkout:`, err);
  // 記錄到資料庫
  await DB.prepare(`
    UPDATE stripe_events 
    SET error = ? 
    WHERE stripe_event_id = ?
  `).bind(err.message, event.id).run();
  
  // 可以發送警報郵件給管理員
}
```

---

### Q3: 如何測試年付訂閱？

**方式 1：使用低價測試**
```
建立測試產品：$0.01/year
完成付款
測試續費邏輯
```

**方式 2：使用 Stripe CLI 模擬**
```bash
# 觸發 invoice.payment_succeeded
stripe trigger invoice.payment_succeeded

# 手動修改訂閱週期（在 Stripe Dashboard）
```

---

### Q4: 退款怎麼處理？

**Stripe 支援自動退款**：
```typescript
// 全額退款
const refund = await stripe.refunds.create({
  payment_intent: 'pi_xxx',
});

// 部分退款
const refund = await stripe.refunds.create({
  payment_intent: 'pi_xxx',
  amount: 1000,  // $10.00
});
```

**需要處理的 Webhook**：
```
charge.refunded
→ 扣除對應的 credits
→ 記錄退款交易
```

---

### Q5: 如何處理爭議（Dispute/Chargeback）？

**監聽事件**：
```
charge.dispute.created
→ 標記訂單為爭議中
→ 通知管理員
→ 可選：暫停用戶服務

charge.dispute.closed
→ 更新最終結果
→ win: 恢復服務
→ lost: 扣除 credits
```

---

### Q6: 測試環境的訂閱會自動扣款嗎？

**不會**。測試模式的訂閱：
- 不會真的扣款
- 需要手動觸發續費事件
- 使用 Stripe CLI: `stripe trigger invoice.payment_succeeded`

---

### Q7: 如何查看所有訂閱用戶？

**SQL 查詢**：
```sql
SELECT 
  u.email,
  c.plan_type,
  c.subscription_status,
  datetime(c.subscription_current_period_end / 1000, 'unixepoch') as next_billing_date,
  c.balance
FROM users u
JOIN credits c ON c.user_id = u.id
WHERE c.stripe_subscription_id IS NOT NULL
ORDER BY c.created_at DESC;
```

**Stripe Dashboard**：
Customers → Subscriptions

---

## 📚 參考資源

### 官方文檔
- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Billing Docs](https://stripe.com/docs/billing)
- [Customer Portal Docs](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

### API 參考
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Node.js Library](https://github.com/stripe/stripe-node)

### 測試工具
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [測試卡號清單](https://stripe.com/docs/testing)

---

## 📝 開發進度追蹤

### Phase 1: 基礎設定（預估 1 天）
- [ ] 註冊 Stripe 帳號
- [ ] 建立測試產品和價格
- [ ] 記錄所有 Price IDs
- [ ] 設定環境變數
- [ ] 安裝 `stripe` npm package

### Phase 2: 資料庫（預估 0.5 天）
- [ ] 建立 Migration 0007
- [ ] 新增必要欄位
- [ ] 建立 stripe_events 表
- [ ] 建立 stripe_prices 表
- [ ] 執行 migration

### Phase 3: Checkout 實現（預估 1.5 天）
- [ ] 實現 `/api/checkout/create`
- [ ] 前端整合（Pricing.tsx 按鈕）
- [ ] 測試重導向流程
- [ ] 實現成功/取消頁面

### Phase 4: Webhook 實現（預估 2 天）
- [ ] 實現 `/api/webhook/stripe`
- [ ] 實現簽名驗證
- [ ] 實現冪等性處理
- [ ] 實現各事件處理函數
- [ ] 使用 Stripe CLI 測試
- [ ] 測試所有事件類型

### Phase 5: Customer Portal（預估 0.5 天）
- [ ] 實現 `/api/checkout/portal`
- [ ] Dashboard 加入「管理訂閱」按鈕
- [ ] 測試 Portal 功能

### Phase 6: Credits 購買（預估 1 天）
- [ ] 實現 Payment Intent
- [ ] 前端整合 Stripe Elements
- [ ] 處理 payment_intent.succeeded
- [ ] 測試購買流程

### Phase 7: 測試（預估 1 天）
- [ ] 完整訂閱流程測試
- [ ] 升降級測試
- [ ] 取消訂閱測試
- [ ] 付款失敗測試
- [ ] Credits 購買測試

### Phase 8: 上線（預估 0.5 天）
- [ ] 切換到生產 API keys
- [ ] 設定生產 Webhook
- [ ] 建立生產產品
- [ ] 配置 Customer Portal
- [ ] 最終檢查清單

---

**總預估時間**：約 8-9 天（扣除假日和緩衝時間）

**關鍵里程碑**：
- Day 3: 能完成測試付款
- Day 5: Webhook 穩定運作
- Day 7: 所有功能完成測試
- Day 8-9: 上線準備和最終測試

---

**文檔版本**：V1.0  
**最後更新**：2026-01-28  
**維護者**：開發團隊  
**狀態**：待實現

