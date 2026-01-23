-- 添加用戶角色系統
-- Migration: 0002_add_user_roles

-- 添加 role 欄位到 users 表
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- 創建角色索引（方便查詢管理員）
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 角色說明：
-- 'user'        - 一般用戶（預設）
-- 'admin'       - 管理員
-- 'superadmin'  - 超級管理員


