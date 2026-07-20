-- Migration: 0013_ticket_messages_nullable_user
-- 修 0005 的 schema 矛盾：ticket_messages.user_id 宣告 NOT NULL 卻配
-- FOREIGN KEY ... ON DELETE SET NULL — 刪除留有工單訊息的用戶會直接
-- SQLITE_CONSTRAINT（NOT NULL constraint failed: ticket_messages.user_id）。
-- SQLite 不能改欄位 nullability，重建表：user_id 改為可 NULL（用戶刪除後訊息保留、發送者顯示為已刪除帳號）。

PRAGMA defer_foreign_keys = true;

CREATE TABLE ticket_messages_new (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  user_id TEXT,
  user_role TEXT NOT NULL,                -- 'user' or 'admin'

  message TEXT NOT NULL,

  created_at INTEGER NOT NULL,

  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO ticket_messages_new (id, ticket_id, user_id, user_role, message, created_at)
SELECT id, ticket_id, user_id, user_role, message, created_at FROM ticket_messages;

DROP TABLE ticket_messages;
ALTER TABLE ticket_messages_new RENAME TO ticket_messages;

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at DESC);
