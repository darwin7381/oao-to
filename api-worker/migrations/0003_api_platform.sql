-- API 平台完整資料庫結構
-- Migration: 0003_api_platform
-- 用途：支援 API Key 管理、Credit 計費系統

-- ==========================================
-- 1. API Keys 表
-- ==========================================
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL DEFAULT 'links:read,links:write',
  
  -- 狀態
  is_active INTEGER NOT NULL DEFAULT 1,
  
  -- 限流
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,
  
  -- 統計
  last_used_at INTEGER,
  total_requests INTEGER DEFAULT 0,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);

-- ==========================================
-- 2. Credits 表
-- ==========================================
CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  
  -- Credit 餘額
  balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  
  -- 訂閱方案
  plan_type TEXT DEFAULT 'free',
  plan_renewed_at INTEGER,
  monthly_quota INTEGER DEFAULT 100,
  monthly_used INTEGER DEFAULT 0,
  monthly_reset_at INTEGER,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_credits_plan_type ON credits(plan_type);
CREATE INDEX idx_credits_monthly_reset_at ON credits(monthly_reset_at);

-- ==========================================
-- 3. Credit 交易記錄表
-- ==========================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- 交易類型
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- 關聯資源
  resource_type TEXT,
  resource_id TEXT,
  
  -- 詳細信息
  description TEXT,
  metadata TEXT,
  
  -- API Key（如果是 API 調用）
  api_key_id TEXT,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_api_key_id ON credit_transactions(api_key_id);

-- ==========================================
-- 4. API 使用統計表
-- ==========================================
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  api_key_id TEXT,
  
  -- 時間維度
  date TEXT NOT NULL,
  hour INTEGER,
  
  -- 統計數據
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  
  -- 按端點統計
  link_creates INTEGER DEFAULT 0,
  link_reads INTEGER DEFAULT 0,
  link_updates INTEGER DEFAULT 0,
  link_deletes INTEGER DEFAULT 0,
  analytics_requests INTEGER DEFAULT 0,
  
  -- Credit 消耗
  credits_used INTEGER DEFAULT 0,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

CREATE INDEX idx_api_usage_stats_user_date ON api_usage_stats(user_id, date);
CREATE INDEX idx_api_usage_stats_api_key_date ON api_usage_stats(api_key_id, date);
CREATE INDEX idx_api_usage_stats_date ON api_usage_stats(date);

-- ==========================================
-- 5. Links 索引表（用於 API 查詢）
-- ==========================================
CREATE TABLE IF NOT EXISTS link_index (
  slug TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_via TEXT DEFAULT 'web',
  api_key_id TEXT,
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

CREATE INDEX idx_link_index_user_id ON link_index(user_id);
CREATE INDEX idx_link_index_api_key_id ON link_index(api_key_id);
CREATE INDEX idx_link_index_created_at ON link_index(created_at);
CREATE INDEX idx_link_index_created_via ON link_index(created_via);

-- ==========================================
-- 6. 為現有用戶初始化 Credits
-- ==========================================
-- 為所有現有用戶創建 credits 記錄
INSERT INTO credits (id, user_id, balance, plan_type, monthly_quota, monthly_used, monthly_reset_at, created_at)
SELECT 
  'credit_' || id,
  id,
  100,  -- 初始贈送 100 credits
  'free',
  100,
  0,
  -- 下個月 1 號的時間戳
  strftime('%s', date('now', 'start of month', '+1 month')) * 1000,
  created_at
FROM users
WHERE id NOT IN (SELECT user_id FROM credits);

-- ==========================================
-- 7. 記錄初始 Credit 贈送
-- ==========================================
INSERT INTO credit_transactions (id, user_id, type, amount, balance_after, description, created_at)
SELECT 
  'trans_init_' || u.id,
  u.id,
  'bonus',
  100,
  100,
  '歡迎獎勵：初始 100 credits',
  strftime('%s', 'now') * 1000
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM credit_transactions ct 
  WHERE ct.user_id = u.id AND ct.type = 'bonus'
);

