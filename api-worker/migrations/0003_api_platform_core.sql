-- API 平台核心資料庫結構
-- Migration: 0003_api_platform_core
-- 說明：無論選擇何種計費方案都必須的核心表結構

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
  
  -- 限流配置
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
  
  -- Credit 餘額（混合制）
  balance INTEGER NOT NULL DEFAULT 0,              -- 總餘額（顯示給用戶）
  subscription_balance INTEGER DEFAULT 0,          -- 訂閱配額餘額（內部追蹤）
  purchased_balance INTEGER DEFAULT 0,             -- 購買的 Credit（內部追蹤）
  
  -- 累計統計
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  
  -- 訂閱方案
  plan_type TEXT DEFAULT 'free',                   -- free, starter, pro, enterprise
  plan_renewed_at INTEGER,
  
  -- 月配額（訂閱制）
  monthly_quota INTEGER DEFAULT 100,               -- 每月配額
  monthly_used INTEGER DEFAULT 0,                  -- 本月已使用
  monthly_reset_at INTEGER,                        -- 下次重置時間
  
  -- 超額設定（混合制）
  overage_limit INTEGER DEFAULT 0,                 -- 允許超額上限（0=不允許）
  overage_used INTEGER DEFAULT 0,                  -- 本月超額使用量
  overage_rate REAL DEFAULT 0.01,                  -- 超額費率（$/次）
  
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
  type TEXT NOT NULL,                              -- purchase, usage, usage_quota, usage_overage, bonus, refund, penalty
  amount INTEGER NOT NULL,                         -- 正數=增加，負數=消耗
  balance_after INTEGER NOT NULL,                  -- 交易後餘額
  
  -- 關聯資源
  resource_type TEXT,                              -- link, analytics, batch
  resource_id TEXT,                                -- 相關資源的 ID（如 slug）
  
  -- 詳細信息
  description TEXT,
  metadata TEXT,                                   -- JSON 格式的額外數據
  
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
-- 4. API 使用統計表（按日聚合）
-- ==========================================
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  api_key_id TEXT,
  
  -- 時間維度
  date TEXT NOT NULL,                              -- YYYY-MM-DD
  
  -- 統計數據
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  
  -- 按操作類型統計
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
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
  
  UNIQUE(user_id, api_key_id, date)
);

CREATE INDEX idx_api_usage_stats_user_date ON api_usage_stats(user_id, date);
CREATE INDEX idx_api_usage_stats_api_key_date ON api_usage_stats(api_key_id, date);
CREATE INDEX idx_api_usage_stats_date ON api_usage_stats(date);

-- ==========================================
-- 5. 短網址索引表（用於 API 查詢）
-- ==========================================
CREATE TABLE IF NOT EXISTS link_index (
  slug TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_via TEXT DEFAULT 'web',                  -- web, api
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
INSERT INTO credits (
  id, 
  user_id, 
  balance, 
  subscription_balance,
  purchased_balance,
  plan_type, 
  monthly_quota, 
  monthly_used, 
  monthly_reset_at, 
  created_at
)
SELECT 
  'credit_' || id,
  id,
  100,                                             -- 初始贈送 100 credits
  0,                                               -- 訂閱餘額為 0
  100,                                             -- 購買餘額 100（贈送的算購買）
  'free',
  100,                                             -- 免費用戶月配額 100
  0,
  -- 下個月 1 號 00:00 UTC 的時間戳
  (strftime('%s', date('now', 'start of month', '+1 month')) * 1000),
  created_at
FROM users
WHERE NOT EXISTS (SELECT 1 FROM credits WHERE credits.user_id = users.id);

-- ==========================================
-- 7. 記錄初始 Credit 贈送交易
-- ==========================================
INSERT INTO credit_transactions (
  id, 
  user_id, 
  type, 
  amount, 
  balance_after, 
  description, 
  created_at
)
SELECT 
  'trans_welcome_' || u.id,
  u.id,
  'bonus',
  100,
  100,
  '註冊歡迎獎勵',
  (strftime('%s', 'now') * 1000)
FROM users u
WHERE NOT EXISTS (
  SELECT 1 
  FROM credit_transactions ct 
  WHERE ct.user_id = u.id 
    AND ct.type = 'bonus' 
    AND ct.description = '註冊歡迎獎勵'
);


