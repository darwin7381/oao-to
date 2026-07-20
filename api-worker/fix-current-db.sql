-- 臨時修復腳本：補齊當前資料庫缺少的 Stripe 欄位
-- 注意：這是臨時方案，正確的方式是重新執行完整 Migration

-- 檢查並添加缺少的欄位到 credits 表
-- 注意：如果欄位已存在會報錯，但不影響後續操作

ALTER TABLE credits ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE credits ADD COLUMN subscription_status TEXT;
ALTER TABLE credits ADD COLUMN subscription_current_period_end INTEGER;
ALTER TABLE credits ADD COLUMN subscription_cancel_at_period_end INTEGER DEFAULT 0;
ALTER TABLE credits ADD COLUMN bonus_balance INTEGER DEFAULT 0;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_credits_stripe_subscription ON credits(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_credits_subscription_status ON credits(subscription_status);

-- 為 users 表添加 stripe_customer_id
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- 更新 plans 的 bonus 欄位
UPDATE plans SET signup_bonus = 100 WHERE name = 'free';
UPDATE plans SET upgrade_bonus = 200 WHERE name = 'starter';
UPDATE plans SET upgrade_bonus = 500 WHERE name = 'pro';
UPDATE plans SET upgrade_bonus = 2000 WHERE name = 'enterprise';

SELECT 'Fix completed' as status;
