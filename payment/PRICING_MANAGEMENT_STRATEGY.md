# 價格管理策略：保持靈活性

**核心理念**：Stripe 只是支付工具，不是你的配置中心  
**日期**：2026-01-28  
**狀態**：架構設計

---

## 🎯 你的疑慮是什麼？

> "這樣不就以後都得跑去 Stripe 設定了？"  
> "調整 credit 數量、價格、折扣碼都要去 Stripe？"

**答案：不用！** 

你完全可以把所有配置都放在自己的資料庫，保持 100% 的控制權。

---

## 💡 核心概念：分離支付與業務邏輯

### Stripe 的角色：只負責「收錢」

```
Stripe 做什麼：
✅ 處理信用卡支付
✅ 管理訂閱扣款
✅ 發送付款成功通知
✅ 處理退款和爭議

Stripe 不決定：
❌ 這個方案值多少錢（你決定）
❌ 這個方案給多少 credits（你決定）
❌ 誰能享有折扣（你決定）
❌ 前端顯示什麼價格（你決定）
```

### 你的系統是老大

```
你的 plans 表：
plan_type = 'pro'
monthly_credits = 10000  👈 你隨時可以改
price_monthly = 2900     👈 你隨時可以改
price_yearly = 28900     👈 你隨時可以改

Stripe 的 Price：
price_id = 'price_xxx'
amount = 2900            👈 只是個標籤，收這麼多錢
```

**關鍵理解**：
- Stripe Price 只決定「收多少錢」
- 實際給多少 credits 是你的 Webhook 決定的
- 前端顯示什麼是你的 `plans` 表決定的

---

## 🏗️ 推薦架構：混合管理策略

### 方案 A：完全自主控制（推薦！）⭐

#### 架構設計

```sql
-- 1. plans 表（你的配置中心）
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,           -- 'free', 'starter', 'pro'
  display_name TEXT,
  
  -- 價格配置（你隨時可改）
  price_monthly INTEGER,      -- 以分為單位，例如 2900 = $29
  price_yearly INTEGER,
  
  -- Credits 配置（你隨時可改）
  monthly_credits INTEGER,    -- 每月配額
  signup_bonus INTEGER,       -- 註冊獎勵
  upgrade_bonus INTEGER,      -- 升級獎勵
  
  -- 顯示配置
  features TEXT,              -- JSON 格式的功能列表
  is_visible INTEGER,
  sort_order INTEGER
);

-- 2. stripe_price_mapping 表（橋接表）
CREATE TABLE stripe_price_mapping (
  id TEXT PRIMARY KEY,
  plan_type TEXT NOT NULL,
  billing_period TEXT,        -- 'monthly', 'yearly'
  stripe_price_id TEXT,       -- Stripe 的 Price ID
  
  -- 你的價格（可以和 Stripe 不同！）
  display_price INTEGER,      -- 前端顯示的價格
  actual_price INTEGER,       -- Stripe 實際收取的價格
  
  -- 靈活性配置
  allow_promo_codes INTEGER DEFAULT 1,
  max_discount_percent INTEGER DEFAULT 100,
  
  is_active INTEGER DEFAULT 1,
  
  FOREIGN KEY (plan_type) REFERENCES plans(name)
);

-- 3. promo_codes 表（你自己的折扣系統）
CREATE TABLE promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  
  -- 折扣類型
  discount_type TEXT,         -- 'percentage', 'fixed', 'credits_bonus'
  discount_value INTEGER,
  
  -- 適用範圍（完全由你控制）
  applies_to_plans TEXT,      -- JSON: ['starter', 'pro']
  applies_to_periods TEXT,    -- JSON: ['monthly', 'yearly']
  min_purchase_amount INTEGER,
  
  -- 贈送 Credits（額外獎勵）
  bonus_credits INTEGER DEFAULT 0,
  
  -- 使用限制
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  
  -- 有效期
  valid_from INTEGER,
  valid_until INTEGER,
  
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);
```

#### 工作流程

##### 場景 1：用戶選擇 Pro Plan (Monthly)

```
第 1 步：前端顯示價格
┌────────────────────────────────────────┐
│ 查詢 plans 表                          │
│ SELECT price_monthly FROM plans        │
│ WHERE name = 'pro'                     │
│                                        │
│ 結果：2900（$29）                      │
│                                        │
│ 前端顯示：$29/month                    │
└────────────────────────────────────────┘

第 2 步：用戶輸入折扣碼「LAUNCH20」
┌────────────────────────────────────────┐
│ 驗證 promo_codes 表                    │
│ SELECT * FROM promo_codes              │
│ WHERE code = 'LAUNCH20'                │
│                                        │
│ 結果：                                 │
│ - discount_type: 'percentage'          │
│ - discount_value: 20                   │
│ - bonus_credits: 1000                  │
│                                        │
│ 前端顯示：$23.20/month                 │
│           + 1000 bonus credits         │
└────────────────────────────────────────┘

第 3 步：建立 Stripe Checkout
┌────────────────────────────────────────┐
│ 後端 API：/api/checkout/create         │
│                                        │
│ // 查詢 Stripe Price ID               │
│ SELECT stripe_price_id                 │
│ FROM stripe_price_mapping              │
│ WHERE plan_type = 'pro'                │
│   AND billing_period = 'monthly'       │
│                                        │
│ 結果：price_xxx_pro_monthly            │
│                                        │
│ // 建立 Checkout Session               │
│ stripe.checkout.sessions.create({      │
│   line_items: [{                       │
│     price: 'price_xxx_pro_monthly',    │
│     quantity: 1                        │
│   }],                                  │
│   // 💰 套用折扣（兩種方式）           │
│   discounts: [{                        │
│     coupon: 'LAUNCH20_stripe'  // 方式1│
│   }],                                  │
│   // 或                                │
│   allow_promotion_codes: true,  // 方式2│
│                                        │
│   // 🔑 關鍵：metadata                 │
│   metadata: {                          │
│     user_id: 'user_123',               │
│     plan_type: 'pro',                  │
│     promo_code: 'LAUNCH20',     // 你的碼│
│     bonus_credits: '1000'       // 你的獎勵│
│   }                                    │
│ })                                     │
└────────────────────────────────────────┘

第 4 步：Webhook 處理付款成功
┌────────────────────────────────────────┐
│ Event: checkout.session.completed      │
│                                        │
│ const metadata = session.metadata;     │
│                                        │
│ // 1. 更新訂閱                         │
│ UPDATE credits                         │
│ SET plan_type = metadata.plan_type     │
│                                        │
│ // 2. monthly_credits 自動變化         │
│ // （因為 JOIN plans 表）              │
│ SELECT p.monthly_credits               │
│ FROM plans p                           │
│ WHERE p.name = 'pro'                   │
│ → 結果：10000                          │
│                                        │
│ // 3. 發放 bonus（你控制的）           │
│ IF metadata.bonus_credits:             │
│   UPDATE credits                       │
│   SET balance = balance + 1000         │
│                                        │
│ // 4. 記錄使用折扣碼                   │
│ INSERT INTO promo_code_usage ...       │
│                                        │
│ // 5. 記錄交易                         │
│ INSERT INTO credit_transactions ...    │
└────────────────────────────────────────┘
```

**關鍵理解**：
1. ✅ 前端顯示的價格：從你的 `plans` 表讀取
2. ✅ 折扣碼驗證：查詢你的 `promo_codes` 表
3. ✅ Stripe 收多少錢：由 `stripe_price_id` 決定
4. ✅ 實際給多少 credits：由你的 Webhook 決定
5. ✅ 獎勵 credits：完全由你控制

---

### 方案 B：Stripe Coupons（部分依賴 Stripe）

#### 使用 Stripe 的折扣系統

```typescript
// 在 Stripe Dashboard 或 API 建立 Coupon
const coupon = await stripe.coupons.create({
  id: 'LAUNCH20',
  percent_off: 20,
  duration: 'once',  // 'once', 'repeating', 'forever'
  max_redemptions: 1000,
  redeem_by: 1735689600,  // Unix timestamp
});

// Checkout 時套用
const session = await stripe.checkout.sessions.create({
  // ...
  discounts: [{
    coupon: 'LAUNCH20',
  }],
});
```

**優點**：
- ✅ Stripe 自動計算折扣
- ✅ Stripe Dashboard 可以看統計

**缺點**：
- ❌ 要在 Stripe 管理折扣碼
- ❌ 無法給 bonus credits
- ❌ 靈活性較低

---

## 🎨 實際應用場景

### 場景 1：調整 Pro Plan 的 Credits 數量

```sql
-- ❌ 錯誤想法：要去 Stripe 改
-- ✅ 正確做法：改你自己的資料庫

UPDATE plans
SET monthly_credits = 15000  -- 從 10000 改成 15000
WHERE name = 'pro';

-- 立即生效！
-- 所有 Pro 用戶下個月自動得到 15000 credits
-- Stripe 完全不知道，也不需要知道
```

**為什麼可以這樣？**
```typescript
// Webhook 處理續費時
const user = await getUser(customerId);
const credits = await getCredits(user.id);

// monthly_quota 是動態獲取的
const { monthly_quota } = await DB.prepare(`
  SELECT p.monthly_credits as monthly_quota
  FROM credits c
  JOIN plans p ON c.plan_type = p.name
  WHERE c.user_id = ?
`).bind(user.id).first();

// 重置月配額
await DB.prepare(`
  UPDATE credits
  SET monthly_used = 0
  WHERE user_id = ?
`).bind(user.id).run();

// monthly_quota 已經自動變成 15000 了！
```

---

### 場景 2：調整價格（需要協調）

#### 情況 A：只改顯示價格（前端）

```sql
-- 前端顯示的價格
UPDATE plans
SET price_monthly = 3900  -- $39（漲價）
WHERE name = 'pro';

-- Stripe 還是收 $29
-- 你多賺了 $10？不對！
-- 因為 Stripe 收的是 stripe_price_id 對應的金額
```

**問題**：Stripe Price 是固定的，要真的改價格必須：

#### 情況 B：真的改價格（正確做法）

```bash
# 選項 1：在 Stripe 建立新的 Price
# Dashboard → Products → Pro Plan → Add another price
# $39/month → 記下新的 price_id: price_xxx_pro_39

# 選項 2：用 API 建立
stripe.prices.create({
  product: 'prod_pro',
  unit_amount: 3900,
  currency: 'usd',
  recurring: { interval: 'month' },
})
```

```sql
-- 更新你的映射表
UPDATE stripe_price_mapping
SET 
  stripe_price_id = 'price_xxx_pro_39',  -- 新的 Price ID
  display_price = 3900,
  actual_price = 3900
WHERE plan_type = 'pro' AND billing_period = 'monthly';

-- 更新 plans 表（保持一致）
UPDATE plans
SET price_monthly = 3900
WHERE name = 'pro';
```

**已有用戶怎麼辦？**
- 他們的訂閱還是 $29（舊價格）
- Stripe 會保護現有訂閱價格（grandfather pricing）
- 如果要改他們的價格，需要：
  ```typescript
  // 更新訂閱價格
  await stripe.subscriptions.update(subscription.id, {
    items: [{
      id: subscription.items.data[0].id,
      price: 'price_xxx_pro_39',  // 新價格
    }],
    proration_behavior: 'none',  // 不按比例退款
  });
  ```

**推薦策略**：
1. ✅ 新價格只對新用戶生效
2. ✅ 舊用戶保持舊價格（提高忠誠度）
3. ✅ 可選：給舊用戶升級優惠

---

### 場景 3：限時促銷（完全自主）

#### 範例：黑色星期五 50% OFF

```sql
-- 建立折扣碼
INSERT INTO promo_codes (
  id, code, discount_type, discount_value,
  applies_to_plans, bonus_credits,
  valid_from, valid_until,
  max_uses, is_active, created_at
) VALUES (
  'promo_bf2026',
  'BF2026',
  'percentage',
  50,  -- 50% OFF
  '["starter", "pro"]',  -- JSON array
  2000,  -- 額外送 2000 credits
  1732924800000,  -- 2026-11-25 00:00
  1733270400000,  -- 2026-12-01 00:00
  5000,  -- 限量 5000 個
  1,
  strftime('%s', 'now') * 1000
);
```

**前端顯示**：
```typescript
// Pricing.tsx
const applyPromoCode = async (code: string) => {
  const res = await fetch('/api/promo-codes/validate', {
    method: 'POST',
    body: JSON.stringify({ code, planType: 'pro' }),
  });
  
  const promo = await res.json();
  
  if (promo.valid) {
    setDiscount(promo.discount_value);  // 50
    setBonusCredits(promo.bonus_credits);  // 2000
    
    // 顯示：
    // 原價：$29/month
    // 折扣：-50%
    // 實付：$14.50/month
    // 🎁 額外贈送 2000 credits
  }
};
```

**Checkout 時處理**：
```typescript
// 兩種方式擇一

// 方式 1：在 Stripe 建立一次性 Coupon
const coupon = await stripe.coupons.create({
  id: `BF2026_${userId}`,  // 唯一 ID
  percent_off: 50,
  duration: 'once',
  max_redemptions: 1,
});

const session = await stripe.checkout.sessions.create({
  // ...
  discounts: [{ coupon: coupon.id }],
  metadata: {
    promo_code: 'BF2026',
    bonus_credits: '2000',
  },
});

// 方式 2：直接用折扣後的價格
// 建立一個 $14.50 的臨時 Price
const tempPrice = await stripe.prices.create({
  unit_amount: 1450,  // $14.50
  currency: 'usd',
  recurring: { interval: 'month' },
  product: 'prod_pro',
});

const session = await stripe.checkout.sessions.create({
  line_items: [{ price: tempPrice.id, quantity: 1 }],
  metadata: {
    promo_code: 'BF2026',
    bonus_credits: '2000',
  },
});
```

**Webhook 處理**：
```typescript
// checkout.session.completed
const promoCode = session.metadata.promo_code;
const bonusCredits = parseInt(session.metadata.bonus_credits);

if (promoCode) {
  // 1. 更新折扣碼使用次數
  await DB.prepare(`
    UPDATE promo_codes
    SET current_uses = current_uses + 1
    WHERE code = ?
  `).bind(promoCode).run();
  
  // 2. 記錄使用
  await DB.prepare(`
    INSERT INTO promo_code_usage 
    (id, promo_code_id, user_id, discount_amount, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(...).run();
  
  // 3. 發放 bonus credits
  await DB.prepare(`
    UPDATE credits
    SET 
      balance = balance + ?,
      bonus_balance = bonus_balance + ?
    WHERE user_id = ?
  `).bind(bonusCredits, bonusCredits, userId).run();
}
```

**統計報表**（完全掌控）：
```sql
-- 查看促銷效果
SELECT 
  p.code,
  p.discount_value,
  p.current_uses,
  p.max_uses,
  COUNT(u.id) as actual_uses,
  SUM(u.discount_amount) as total_discount,
  SUM(u.credits_bonus) as total_bonus_credits
FROM promo_codes p
LEFT JOIN promo_code_usage u ON u.promo_code_id = p.id
WHERE p.code = 'BF2026'
GROUP BY p.id;
```

---

### 場景 4：個人化定價

#### 範例：學生優惠、企業客戶特殊價

```sql
-- 1. 建立特殊折扣碼（只給特定用戶）
INSERT INTO promo_codes (
  id, code, discount_type, discount_value,
  per_user_limit, max_uses, created_at
) VALUES (
  'promo_student',
  'STUDENT50',
  'percentage',
  50,
  1,  -- 每人只能用一次
  99999,  -- 不限總次數
  strftime('%s', 'now') * 1000
);

-- 2. 或建立專屬折扣碼
INSERT INTO promo_codes (
  id, code, discount_type, discount_value,
  max_uses, created_at, created_for_user_id
) VALUES (
  'promo_vip_john',
  'JOHN-VIP-2026',
  'percentage',
  30,
  1,
  strftime('%s', 'now') * 1000,
  'user_john_123'
);

-- 驗證時檢查
SELECT * FROM promo_codes
WHERE code = 'JOHN-VIP-2026'
  AND (created_for_user_id IS NULL OR created_for_user_id = ?)
  AND is_active = 1;
```

---

## 🎯 推薦的最佳實踐

### 策略總結

| 項目 | 管理位置 | 原因 |
|------|----------|------|
| **Credits 數量** | ✅ 你的 plans 表 | 隨時調整，立即生效 |
| **顯示價格** | ✅ 你的 plans 表 | 靈活展示，可做 A/B 測試 |
| **實際收費** | ⚠️ Stripe Price | 改價格需建立新 Price |
| **折扣碼** | ✅ 你的 promo_codes 表 | 完全掌控，可給 bonus |
| **升級獎勵** | ✅ 你的配置 | Webhook 處理，自由設定 |
| **訂閱週期** | ⚠️ Stripe | 月付/年付在 Stripe 定義 |

### 混合策略（推薦）⭐

```
你的系統管理：
✅ Credits 配置（數量、獎勵）
✅ 功能列表
✅ 折扣碼系統
✅ 促銷活動
✅ 個人化定價

Stripe 管理：
⚠️ 實際收費金額
⚠️ 訂閱週期設定
⚠️ 付款處理

協同工作：
🔄 metadata 傳遞參數
🔄 Webhook 執行業務邏輯
```

---

## 🚀 實作建議

### Step 1: 建立配置表結構

```sql
-- Migration 0007（擴展版）

-- 1. Plans 表（已有，確保欄位完整）
ALTER TABLE plans ADD COLUMN IF NOT EXISTS signup_bonus INTEGER DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS upgrade_bonus INTEGER DEFAULT 0;

-- 2. Stripe 映射表
CREATE TABLE stripe_price_mapping (
  id TEXT PRIMARY KEY,
  plan_type TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  display_price INTEGER,
  actual_price INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (plan_type) REFERENCES plans(name)
);

-- 3. 折扣碼表
CREATE TABLE promo_codes (
  -- （見上方完整定義）
);

-- 4. 折扣碼使用記錄
CREATE TABLE promo_code_usage (
  -- （見上方完整定義）
);
```

### Step 2: 實作 API 端點

```typescript
// 1. 驗證折扣碼
app.post('/api/promo-codes/validate', requireAuth, async (c) => {
  const { code, planType, billingPeriod } = await c.req.json();
  
  const promo = await c.env.DB.prepare(`
    SELECT * FROM promo_codes
    WHERE code = ? 
      AND is_active = 1
      AND (valid_from IS NULL OR valid_from <= ?)
      AND (valid_until IS NULL OR valid_until >= ?)
      AND current_uses < max_uses
  `).bind(code, Date.now(), Date.now()).first();
  
  if (!promo) {
    return c.json({ valid: false, error: 'Invalid or expired code' });
  }
  
  // 檢查適用範圍
  const appliesTo = JSON.parse(promo.applies_to_plans || '[]');
  if (appliesTo.length > 0 && !appliesTo.includes(planType)) {
    return c.json({ valid: false, error: 'Code not applicable to this plan' });
  }
  
  // 檢查用戶使用次數
  const usage = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM promo_code_usage
    WHERE promo_code_id = ? AND user_id = ?
  `).bind(promo.id, c.get('user').id).first();
  
  if (usage.count >= promo.per_user_limit) {
    return c.json({ valid: false, error: 'Code already used' });
  }
  
  return c.json({
    valid: true,
    discount_type: promo.discount_type,
    discount_value: promo.discount_value,
    bonus_credits: promo.bonus_credits,
  });
});

// 2. 建立 Checkout（整合折扣碼）
app.post('/api/checkout/create', requireAuth, async (c) => {
  const { planType, billingPeriod, promoCode } = await c.req.json();
  
  // 查詢 Stripe Price ID
  const mapping = await c.env.DB.prepare(`
    SELECT * FROM stripe_price_mapping
    WHERE plan_type = ? AND billing_period = ? AND is_active = 1
  `).bind(planType, billingPeriod).first();
  
  let discounts = [];
  let metadata: any = {
    user_id: c.get('user').id,
    plan_type: planType,
  };
  
  // 處理折扣碼
  if (promoCode) {
    const promo = await validatePromoCode(c.env, promoCode, c.get('user').id);
    if (promo) {
      // 選項 1：建立 Stripe Coupon
      const stripeCoupon = await stripe.coupons.create({
        id: `${promoCode}_${Date.now()}`,
        [promo.discount_type === 'percentage' ? 'percent_off' : 'amount_off']: 
          promo.discount_value,
        duration: 'once',
        max_redemptions: 1,
      });
      discounts = [{ coupon: stripeCoupon.id }];
      
      metadata.promo_code = promoCode;
      metadata.bonus_credits = promo.bonus_credits;
    }
  }
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: mapping.stripe_price_id, quantity: 1 }],
    discounts,
    metadata,
    success_url: `${c.env.FRONTEND_URL}/dashboard?success=true`,
    cancel_url: `${c.env.FRONTEND_URL}/pricing?canceled=true`,
  });
  
  return c.json({ sessionUrl: session.url });
});
```

### Step 3: Webhook 處理

```typescript
async function handleCheckoutCompleted(env: Env, session: any) {
  const userId = session.metadata.user_id;
  const planType = session.metadata.plan_type;
  const promoCode = session.metadata.promo_code;
  const bonusCredits = parseInt(session.metadata.bonus_credits || '0');
  
  // 1. 更新訂閱
  await env.DB.prepare(`
    UPDATE credits
    SET 
      plan_type = ?,
      stripe_subscription_id = ?,
      subscription_status = 'active',
      updated_at = ?
    WHERE user_id = ?
  `).bind(planType, session.subscription, Date.now(), userId).run();
  
  // 2. 查詢方案配置（從你的表）
  const plan = await env.DB.prepare(`
    SELECT * FROM plans WHERE name = ?
  `).bind(planType).first();
  
  // 3. 發放升級獎勵（如果有）
  if (plan.upgrade_bonus > 0) {
    await env.DB.prepare(`
      UPDATE credits
      SET 
        balance = balance + ?,
        bonus_balance = bonus_balance + ?
      WHERE user_id = ?
    `).bind(plan.upgrade_bonus, plan.upgrade_bonus, userId).run();
  }
  
  // 4. 發放折扣碼獎勵（如果有）
  if (bonusCredits > 0) {
    await env.DB.prepare(`
      UPDATE credits
      SET 
        balance = balance + ?,
        bonus_balance = bonus_balance + ?
      WHERE user_id = ?
    `).bind(bonusCredits, bonusCredits, userId).run();
  }
  
  // 5. 記錄折扣碼使用
  if (promoCode) {
    await recordPromoCodeUsage(env, promoCode, userId, session);
  }
}
```

---

## 📊 前端整合範例

### Pricing.tsx 調整

```typescript
// 新增折扣碼輸入
const [promoCode, setPromoCode] = useState('');
const [discount, setDiscount] = useState<any>(null);

const validatePromoCode = async (code: string) => {
  try {
    const res = await fetch('/api/promo-codes/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code, 
        planType: selectedPlan,
        billingPeriod 
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.valid) {
        setDiscount(data);
        // 顯示折扣後價格
      }
    }
  } catch (err) {
    console.error('Promo code validation failed:', err);
  }
};

// 計算折扣後價格
const calculateFinalPrice = (originalPrice: number) => {
  if (!discount) return originalPrice;
  
  if (discount.discount_type === 'percentage') {
    return originalPrice * (1 - discount.discount_value / 100);
  } else {
    return originalPrice - discount.discount_value;
  }
};

// UI 顯示
<div className="mb-6">
  <input 
    type="text"
    placeholder="Promo code"
    value={promoCode}
    onChange={(e) => setPromoCode(e.target.value)}
    onBlur={() => validatePromoCode(promoCode)}
  />
  
  {discount && (
    <div className="text-green-600 mt-2">
      ✓ {discount.discount_value}% OFF applied
      {discount.bonus_credits > 0 && (
        <span> + {discount.bonus_credits} bonus credits!</span>
      )}
    </div>
  )}
  
  <div className="text-2xl">
    {discount && (
      <span className="line-through text-gray-400">
        ${originalPrice}
      </span>
    )}
    <span className="ml-2">
      ${calculateFinalPrice(originalPrice)}
    </span>
  </div>
</div>
```

---

## 🎯 總結

### 你完全可以保持靈活性！

**可以隨時調整的（不用碰 Stripe）**：
- ✅ Credits 數量
- ✅ 功能列表
- ✅ 折扣碼
- ✅ 升級獎勵
- ✅ 促銷活動
- ✅ 前端顯示的價格

**需要協調 Stripe 的**：
- ⚠️ 實際收費金額（要建立新 Price）
- ⚠️ 付款週期（月付/年付）

**核心理念**：
> Stripe 只是你的「收銀員」  
> 業務邏輯、定價策略、促銷活動都由你掌控  
> 通過 metadata 傳遞參數，Webhook 執行你的邏輯

---

**建議**：
1. ✅ 使用混合策略（推薦）
2. ✅ 重要配置都存在自己的資料庫
3. ✅ 用 `stripe_price_mapping` 橋接 Stripe
4. ✅ 自己實現折扣碼系統（更靈活）
5. ✅ 通過 metadata 傳遞業務參數

這樣你就能享受 Stripe 的支付能力，同時保持 100% 的業務控制權！

