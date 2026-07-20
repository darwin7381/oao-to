-- 濫用防護：封鎖網域清單 + 公開檢舉
-- 2026-07-20

CREATE TABLE IF NOT EXISTS banned_domains (
  domain TEXT PRIMARY KEY,          -- 純網域（小寫，不含協議），父網域封鎖涵蓋子網域
  reason TEXT,
  created_by TEXT,                  -- admin user_id
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS link_reports (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  url TEXT,                         -- 檢舉當下的目標 URL 快照
  reason TEXT NOT NULL,             -- phishing | malware | spam | scam | illegal | other
  details TEXT,
  reporter_email TEXT,
  reporter_ip_hash TEXT,            -- SHA-256(ip)，不存原始 IP
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | reviewed | actioned | dismissed
  admin_note TEXT,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_link_reports_status ON link_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_reports_slug ON link_reports(slug);
