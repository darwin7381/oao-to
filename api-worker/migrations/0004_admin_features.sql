-- Admin Features Migration
-- Migration: 0004_admin_features
-- 說明：為 Admin 功能添加 payments 表和 credit_transactions 的 admin_id 欄位

-- ==========================================
-- 1. 添加 Payments 表
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- 付款信息
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,  -- completed, pending, failed, refunded
  
  -- 方案信息
  plan TEXT NOT NULL,
  credits INTEGER NOT NULL,
  
  -- 付款方式
  payment_method TEXT DEFAULT 'stripe',
  stripe_payment_id TEXT,
  stripe_customer_id TEXT,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ==========================================
-- 2. Credit Transactions 表添加 admin_id 欄位
-- ==========================================
ALTER TABLE credit_transactions ADD COLUMN admin_id TEXT;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_admin_id ON credit_transactions(admin_id);
