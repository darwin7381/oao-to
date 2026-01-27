-- Migration 0006: 优化 Credits 表结构
-- 1. 删除 subscription_balance（冗余，始终为 0）
-- 2. 删除 monthly_quota（改为从 plans 表动态获取）

-- 注意：SQLite 不支持 DROP COLUMN，需要重建表

-- 1. 创建新表
CREATE TABLE IF NOT EXISTS credits_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  
  -- Credit 余额（Pool B - 永久池）
  balance INTEGER NOT NULL DEFAULT 0,
  purchased_balance INTEGER DEFAULT 0,
  
  -- 累计统计
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  
  -- 订阅方案
  plan_type TEXT DEFAULT 'free',
  plan_renewed_at INTEGER,
  
  -- 月配额（Pool A - 每月池）
  monthly_used INTEGER DEFAULT 0,
  monthly_reset_at INTEGER,
  
  -- 超额设定
  overage_limit INTEGER DEFAULT 0,
  overage_used INTEGER DEFAULT 0,
  overage_rate REAL DEFAULT 0.01,
  
  -- 时间戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 复制数据（排除 subscription_balance 和 monthly_quota）
INSERT INTO credits_new
SELECT 
  id, user_id, balance, purchased_balance,
  total_purchased, total_used,
  plan_type, plan_renewed_at,
  monthly_used, monthly_reset_at,
  overage_limit, overage_used, overage_rate,
  created_at, updated_at
FROM credits;

-- 3. 删除旧表
DROP TABLE credits;

-- 4. 重命名新表
ALTER TABLE credits_new RENAME TO credits;

-- 5. 重建索引
CREATE INDEX IF NOT EXISTS idx_credits_plan_type ON credits(plan_type);
CREATE INDEX IF NOT EXISTS idx_credits_monthly_reset_at ON credits(monthly_reset_at);

-- 6. 验证
SELECT COUNT(*) as total_users FROM credits;

-- 7. 验证动态 quota（测试 JOIN）
SELECT 
  c.user_id,
  c.plan_type,
  p.monthly_credits as monthly_quota,
  c.monthly_used
FROM credits c
LEFT JOIN plans p ON c.plan_type = p.name
LIMIT 3;

SELECT 'Migration 0006 completed' as status;
