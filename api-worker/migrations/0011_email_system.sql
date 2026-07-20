-- 0011: email 體系 — 使用者語言偏好 + SES 退信/客訴抑制清單
-- locale：email 與前端共用的語言偏好（'en' | 'zh-TW' | 'zh-CN' | 'ja'）。NULL = 未設定（用偵測/預設）
ALTER TABLE users ADD COLUMN locale TEXT;

-- SES feedback loop 落地：bounce/complaint 進來就把地址加進來，之後所有寄信（dunning/lifecycle）都先查這表
CREATE TABLE IF NOT EXISTS email_suppression (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL,          -- 'bounce' | 'complaint' | 'manual'
  detail TEXT,                   -- bounceType / complaintFeedbackType 等原始資訊
  created_at INTEGER NOT NULL
);
