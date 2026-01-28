-- Migration 0007: Stripe Integration (Fixed)
-- 分步執行，避免 FOREIGN KEY 問題

PRAGMA foreign_keys=OFF;

-- Step 1: 為 users 表添加 stripe_customer_id
-- SQLite 支援 ALTER TABLE ADD COLUMN（單一欄位）
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Step 2: 擴展 plans 表
CREATE TABLE plans_new (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  price_monthly REAL DEFAULT 0,
  price_yearly REAL DEFAULT 0,
  monthly_credits INTEGER DEFAULT 100,
  api_calls_per_day INTEGER DEFAULT 1000,
  max_api_keys INTEGER DEFAULT 5,
  features TEXT,
  signup_bonus INTEGER DEFAULT 0,
  upgrade_bonus INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  is_visible INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

INSERT INTO plans_new SELECT id, name, display_name, price_monthly, price_yearly, monthly_credits, api_calls_per_day, max_api_keys, features, 0, 0, is_active, is_visible, sort_order, created_at, updated_at FROM plans;
DROP TABLE plans;
ALTER TABLE plans_new RENAME TO plans;
CREATE INDEX idx_plans_name ON plans(name);
CREATE INDEX idx_plans_active ON plans(is_active);
CREATE INDEX idx_plans_visible ON plans(is_visible);

-- Step 2: 擴展 credits 表
CREATE TABLE credits_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  purchased_balance INTEGER DEFAULT 0,
  bonus_balance INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  plan_type TEXT DEFAULT 'free',
  plan_renewed_at INTEGER,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  subscription_current_period_end INTEGER,
  subscription_cancel_at_period_end INTEGER DEFAULT 0,
  monthly_used INTEGER DEFAULT 0,
  monthly_reset_at INTEGER,
  overage_limit INTEGER DEFAULT 0,
  overage_used INTEGER DEFAULT 0,
  overage_rate REAL DEFAULT 0.01,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

INSERT INTO credits_new SELECT id, user_id, balance, purchased_balance, 0, total_purchased, total_used, plan_type, plan_renewed_at, NULL, NULL, NULL, 0, monthly_used, monthly_reset_at, overage_limit, overage_used, overage_rate, created_at, updated_at FROM credits;
DROP TABLE credits;
ALTER TABLE credits_new RENAME TO credits;
CREATE INDEX idx_credits_plan_type ON credits(plan_type);
CREATE INDEX idx_credits_monthly_reset_at ON credits(monthly_reset_at);
CREATE INDEX idx_credits_stripe_subscription ON credits(stripe_subscription_id);
CREATE INDEX idx_credits_subscription_status ON credits(subscription_status);

-- Step 3: 建立 Stripe 事件表
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

-- Step 4: Stripe 價格映射表（不使用 FOREIGN KEY）
CREATE TABLE IF NOT EXISTS stripe_price_mapping (
  id TEXT PRIMARY KEY,
  plan_type TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL UNIQUE,
  display_price INTEGER,
  actual_price INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX idx_stripe_price_plan ON stripe_price_mapping(plan_type);
CREATE INDEX idx_stripe_price_period ON stripe_price_mapping(billing_period);
CREATE INDEX idx_stripe_price_active ON stripe_price_mapping(is_active);

INSERT INTO stripe_price_mapping (id, plan_type, billing_period, stripe_price_id, display_price, actual_price, created_at) VALUES
  ('spm_starter_monthly', 'starter', 'monthly', 'REPLACE_ME', 900, 900, strftime('%s', 'now') * 1000),
  ('spm_starter_yearly', 'starter', 'yearly', 'REPLACE_ME', 8900, 8900, strftime('%s', 'now') * 1000),
  ('spm_pro_monthly', 'pro', 'monthly', 'REPLACE_ME', 2900, 2900, strftime('%s', 'now') * 1000),
  ('spm_pro_yearly', 'pro', 'yearly', 'REPLACE_ME', 28900, 28900, strftime('%s', 'now') * 1000);

-- Step 5: 優惠碼表（不使用 FOREIGN KEY）
CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value INTEGER NOT NULL,
  applies_to_plans TEXT,
  applies_to_periods TEXT,
  min_purchase_amount INTEGER DEFAULT 0,
  bonus_credits INTEGER DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  valid_from INTEGER,
  valid_until INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  created_by TEXT
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active);

-- Step 6: 優惠碼使用記錄
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id TEXT PRIMARY KEY,
  promo_code_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  discount_amount INTEGER,
  credits_bonus INTEGER,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_promo_usage_unique ON promo_code_usage(promo_code_id, user_id);
CREATE INDEX idx_promo_usage_user ON promo_code_usage(user_id);
CREATE INDEX idx_promo_usage_code ON promo_code_usage(promo_code_id);

-- Step 7: 更新 plans bonus
UPDATE plans SET signup_bonus = 100 WHERE name = 'free';
UPDATE plans SET upgrade_bonus = 200 WHERE name = 'starter';
UPDATE plans SET upgrade_bonus = 500 WHERE name = 'pro';
UPDATE plans SET upgrade_bonus = 2000 WHERE name = 'enterprise';

PRAGMA foreign_keys=ON;

SELECT 'Migration 0007 completed!' as status;
