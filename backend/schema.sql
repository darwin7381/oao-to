-- D1 Database Schema for oao.to

-- 用戶表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX idx_users_email ON users(email);

-- 短網址表
CREATE TABLE IF NOT EXISTS links (
  slug TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  expires_at INTEGER,
  password TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_links_user_id ON links(user_id);
CREATE INDEX idx_links_created_at ON links(created_at DESC);

-- 初始數據（可選）
-- INSERT INTO users (id, email, name, created_at) VALUES 
--   ('system', 'system@oao.to', 'System', strftime('%s', 'now') * 1000);

