# Migrations 資料夾說明

**目的**：管理資料庫結構變更  
**重要性**：⭐⭐⭐⭐⭐ 關鍵系統檔案

---

## 🚨 執行 Migration 的正確方式

### ⚠️ 關鍵警告：必須使用正確的 --persist-to 路徑

**我們的 Worker 啟動方式**：
```bash
cd api-worker
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared
```

**因此，執行 Migration 時也必須使用相同路徑**：

```bash
# ❌ 錯誤（會創建不同的資料庫）
wrangler d1 migrations apply oao-to-db --local

# ✅ 正確（使用與 Worker 相同的路徑）
cd api-worker
wrangler d1 migrations apply oao-to-db --local --persist-to ../.wrangler/oao-shared
```

---

## 📋 Migration 文件清單

### 已執行的 Migrations

- `0001_initial.sql` - 初始資料庫結構（users, roles 等）
- `0002_add_user_roles.sql` - 用戶角色系統
- `0003_api_platform_core.sql` - API 平台核心（credits, api_keys）
- `0004_admin_features.sql` - 管理員功能
- `0005_audit_and_support.sql` - 審計日誌和支援系統
- `0006_remove_subscription_balance.sql` - 移除冗餘欄位
- `0007_stripe_integration.sql` - Stripe 支付整合

---

## 🔧 常用命令

### 本地開發

```bash
# 查看待執行的 Migrations
wrangler d1 migrations list oao-to-db --local --persist-to ../.wrangler/oao-shared

# 執行所有待執行的 Migrations
wrangler d1 migrations apply oao-to-db --local --persist-to ../.wrangler/oao-shared

# 查詢資料庫
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command="SELECT * FROM users LIMIT 5;"

# 執行 SQL 檔案
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --file=./migrations/0007_stripe_integration.sql
```

### 生產環境

```bash
# 查看待執行的 Migrations
wrangler d1 migrations list oao-to-db --remote

# 執行 Migrations（需要確認）
wrangler d1 migrations apply oao-to-db --remote

# 查詢資料庫
wrangler d1 execute oao-to-db --remote --command="SELECT COUNT(*) FROM users;"
```

---

## ⚠️ 常見錯誤

### 錯誤 1：路徑不一致

```bash
# Worker 用一個路徑
wrangler dev --persist-to ../.wrangler/oao-shared

# Migration 用另一個路徑
wrangler d1 migrations apply DB --local  # ❌ 沒有 --persist-to

# 結果：兩個不同的資料庫！
```

### 錯誤 2：忘記加 --local 或 --remote

```bash
# ❌ 錯誤（不知道是本地還是遠端）
wrangler d1 migrations apply oao-to-db

# ✅ 正確（明確指定）
wrangler d1 migrations apply oao-to-db --local --persist-to ../.wrangler/oao-shared
```

### 錯誤 3：在錯誤的目錄執行

```bash
# ❌ 錯誤（找不到 migrations/）
cd /Users/JL/Development/media/oao_to
wrangler d1 migrations apply oao-to-db --local

# ✅ 正確（migrations/ 在當前目錄）
cd /Users/JL/Development/media/oao_to/api-worker
wrangler d1 migrations apply oao-to-db --local --persist-to ../.wrangler/oao-shared
```

---

## 📝 Migration 編寫指南

### 基本規則

1. **檔名格式**：`XXXX_description.sql`
   - `XXXX`：4 位數序號（0001, 0002, ...）
   - `description`：簡短描述（snake_case）

2. **冪等性**：使用 `IF NOT EXISTS`, `IF EXISTS`
   ```sql
   CREATE TABLE IF NOT EXISTS users (...);
   ```

3. **SQLite 限制**：
   - ❌ `ALTER TABLE ADD COLUMN IF NOT EXISTS` 不支援
   - ❌ `ALTER TABLE DROP COLUMN` 不支援（需要重建表）
   - ✅ `ALTER TABLE ADD COLUMN` 支援（無 IF NOT EXISTS）
   - ✅ `ALTER TABLE RENAME TO` 支援

### 範例 Migration

```sql
-- Migration 0008: Example
-- 說明：這個 migration 的目的

PRAGMA foreign_keys=OFF;

-- Step 1: 添加新欄位
ALTER TABLE users ADD COLUMN new_field TEXT;

-- Step 2: 建立新表
CREATE TABLE IF NOT EXISTS new_table (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Step 3: 建立索引
CREATE INDEX IF NOT EXISTS idx_new_table_user ON new_table(user_id);

PRAGMA foreign_keys=ON;

-- 驗證
SELECT 'Migration 0008 completed' as status;
```

---

## 🔍 除錯技巧

### 檢查 Migration 是否已執行

```bash
# 查看 Migration 歷史
wrangler d1 migrations list oao-to-db --local --persist-to ../.wrangler/oao-shared

# 檢查 _cf_KV 表（Wrangler 用來追蹤）
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command="SELECT * FROM _cf_KV WHERE key LIKE 'migration_%';"
```

### 檢查資料庫實際位置

```bash
# Worker 日誌會顯示
wrangler dev --persist-to ../.wrangler/oao-shared
# 輸出：Executing on local database ... from ../.wrangler/oao-shared/v3/d1
```

### 檢查表結構

```bash
# 查看所有表
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command="SELECT name FROM sqlite_master WHERE type='table';"

# 查看特定表結構
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command="PRAGMA table_info(credits);"
```

---

## ✅ 開發流程檢查清單

### 每次開發新功能前

- [ ] 確認 Worker 啟動使用 `--persist-to ../.wrangler/oao-shared`
- [ ] 閱讀 `standards/COMMON_ISSUES_CHECKLIST.md`
- [ ] 確認資料庫路徑一致

### 每次執行 Migration 前

- [ ] 確認在 `api-worker` 目錄
- [ ] 確認使用 `--persist-to ../.wrangler/oao-shared`
- [ ] 確認是 `--local`（本地）或 `--remote`（生產）
- [ ] 檢查 Migration 檔案語法正確

### 每次執行 Migration 後

- [ ] 驗證表結構（`PRAGMA table_info`）
- [ ] 驗證數據完整性（`SELECT COUNT(*)`）
- [ ] 測試 API 是否正常

---

## 🎯 快速參考

### 標準 Migration 命令（複製貼上）

```bash
# 本地開發
cd /Users/JL/Development/media/oao_to/api-worker
wrangler d1 migrations apply oao-to-db --local --persist-to ../.wrangler/oao-shared

# 生產環境（上線前）
cd /Users/JL/Development/media/oao_to/api-worker
wrangler d1 migrations apply oao-to-db --remote
```

---

**重要**：永遠記住 `--persist-to ../.wrangler/oao-shared`！

**參考文件**：
- `/START_DEV.md` - 開發環境啟動指南
- `/MULTI_WORKER_DEVELOPMENT_GUIDE.md` - 多 Worker 架構
- `/standards/D1_AND_MIGRATIONS_GUIDE.md` - D1 完整指南
