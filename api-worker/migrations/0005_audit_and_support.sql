-- Admin Portal Phase 1 功能
-- Migration: 0005_audit_and_support
-- 說明：Audit Logs, Support Tickets, Plans Management

-- ==========================================
-- 1. Audit Logs 表
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  
  -- 操作資訊
  action TEXT NOT NULL,           -- 'delete_link', 'adjust_credits', 'revoke_key', 'change_role', etc.
  resource_type TEXT NOT NULL,    -- 'link', 'user', 'api_key', 'credit', 'ticket', etc.
  resource_id TEXT,
  
  -- 變更記錄（JSON 格式）
  old_value TEXT,
  new_value TEXT,
  
  -- 請求資訊
  ip_address TEXT,
  user_agent TEXT,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ==========================================
-- 2. Support Tickets 表
-- ==========================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- 工單資訊
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',    -- open, in_progress, resolved, closed
  priority TEXT DEFAULT 'medium',         -- low, medium, high, urgent
  category TEXT,                          -- billing, technical, abuse, feature_request, other
  
  -- 分配資訊
  assigned_to TEXT,                       -- Admin user ID
  
  -- 關聯資源
  related_resource_type TEXT,             -- link, api_key, payment, credit
  related_resource_id TEXT,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  resolved_at INTEGER,
  closed_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON support_tickets(created_at DESC);

-- ==========================================
-- 3. Ticket Messages 表
-- ==========================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,                -- 'user' or 'admin'
  
  message TEXT NOT NULL,
  
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at DESC);

-- ==========================================
-- 4. Plans 表
-- ==========================================
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,              -- free, starter, pro, enterprise
  display_name TEXT NOT NULL,             -- "Free Tier", "Starter Plan", etc.
  
  -- 定價
  price_monthly REAL DEFAULT 0,
  price_yearly REAL DEFAULT 0,
  
  -- Quota
  monthly_credits INTEGER DEFAULT 100,
  api_calls_per_day INTEGER DEFAULT 1000,
  max_api_keys INTEGER DEFAULT 5,
  
  -- Features (JSON array)
  features TEXT,                          -- '["Feature 1", "Feature 2"]'
  
  -- 狀態
  is_active INTEGER DEFAULT 1,
  is_visible INTEGER DEFAULT 1,           -- 是否在 pricing 頁面顯示
  
  -- 排序
  sort_order INTEGER DEFAULT 0,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_sort_order ON plans(sort_order);

-- ==========================================
-- 5. Plan History 表（價格變更歷史）
-- ==========================================
CREATE TABLE IF NOT EXISTS plan_history (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  changed_by TEXT NOT NULL,               -- Admin user ID
  
  -- 變更內容
  field_name TEXT NOT NULL,               -- price_monthly, monthly_credits, etc.
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_history_plan_id ON plan_history(plan_id, created_at DESC);

-- ==========================================
-- 6. 初始化預設方案
-- ==========================================
INSERT INTO plans (id, name, display_name, price_monthly, price_yearly, monthly_credits, api_calls_per_day, max_api_keys, features, is_active, is_visible, sort_order, created_at)
VALUES 
  ('plan_free', 'free', 'Free Tier', 0, 0, 100, 1000, 5, '["Basic analytics", "Community support"]', 1, 1, 1, strftime('%s', 'now') * 1000),
  ('plan_starter', 'starter', 'Starter', 9.99, 99.99, 1000, 10000, 10, '["Advanced analytics", "Email support", "Custom domains"]', 1, 1, 2, strftime('%s', 'now') * 1000),
  ('plan_pro', 'pro', 'Professional', 29.99, 299.99, 10000, 100000, 25, '["Premium analytics", "Priority support", "Custom domains", "Webhooks", "Team collaboration"]', 1, 1, 3, strftime('%s', 'now') * 1000),
  ('plan_enterprise', 'enterprise', 'Enterprise', 299, 2999, 100000, 1000000, 999, '["Unlimited analytics", "24/7 dedicated support", "Custom domains", "Webhooks", "Team collaboration", "SLA guarantee", "Custom integrations"]', 1, 1, 4, strftime('%s', 'now') * 1000)
ON CONFLICT(id) DO NOTHING;
