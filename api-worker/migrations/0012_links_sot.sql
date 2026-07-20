-- 0012: links 表重建 — D1 成為連結的 source of truth（KV 降為重定向快取）
-- 舊 schema user_id NOT NULL + FK(users) 讓匿名連結寫不進來 → 兩萬條 KV 連結從未落 D1，
-- 所有以 D1 為準的讀取（使用者統計摘要、admin 統計）長期為空。
-- 新 schema：user_id 可 NULL（匿名）、加 source/is_custom/api_key_id（併入 link_index 的資訊）。
CREATE TABLE links_new (
  slug TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  user_id TEXT,                  -- NULL = 匿名（/shorten 未登入）
  title TEXT,
  source TEXT DEFAULT 'web',     -- 'web' | 'api' | 'anonymous' | 'backfill'
  is_custom INTEGER,             -- 1=自訂 slug、0=自動生成、NULL=不可考（backfill 舊資料）
  api_key_id TEXT,               -- v1 API 建立時使用的 key
  is_active INTEGER DEFAULT 1,   -- 管理員禁用連結（KV 同步，重定向以 KV 為準）
  flag_reason TEXT,              -- 管理員標記原因
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  expires_at INTEGER,
  password TEXT
);

INSERT INTO links_new (slug, url, user_id, title, created_at, updated_at, expires_at, password)
  SELECT slug, url, user_id, title, created_at, updated_at, expires_at, password FROM links;

DROP TABLE links;
ALTER TABLE links_new RENAME TO links;

CREATE INDEX idx_links_user_created ON links(user_id, created_at DESC);
CREATE INDEX idx_links_created ON links(created_at DESC);
CREATE INDEX idx_links_source ON links(source);
