# D1 資料庫與 Migration 完全指南

## 🎯 什麼是 Cloudflare D1？

### **D1 的本質**

**D1 = SQLite + Cloudflare 全球邊緣網路**

```
傳統資料庫（PostgreSQL/MySQL）：
┌─────────────────┐
│  中心化伺服器    │
│  單一位置        │
│  需要自己維護    │
└─────────────────┘

Cloudflare D1：
┌──────────────────────────────────┐
│   Cloudflare 全球邊緣網路         │
├──────────────────────────────────┤
│  主寫入節點：美國（單點）          │
│  讀取複製：300+ 邊緣節點          │
│  自動備份：Time Travel           │
│  無伺服器：完全託管              │
└──────────────────────────────────┘
```

---

## 🔍 D1 vs 傳統資料庫：深度對比

### **底層引擎差異**

| 特性 | PostgreSQL | MySQL | D1 (SQLite) |
|------|-----------|-------|------------|
| **引擎** | PostgreSQL | InnoDB | SQLite |
| **部署方式** | 自行架設 | 自行架設 | Cloudflare 託管 |
| **位置** | 中心化 | 中心化 | 分散式（邊緣複製）|
| **連線方式** | TCP/IP Socket | TCP/IP Socket | HTTP API |
| **並發寫入** | 高（數千 TPS）| 高（數千 TPS）| 中（數百 TPS）|
| **並發讀取** | 高 | 高 | 極高（邊緣快取）|
| **資料庫大小** | TB 級 | TB 級 | 10GB 上限 |
| **Schema 資訊** | information_schema | information_schema | pragma_* |

---

### **關鍵差異：Schema 查詢**

#### **PostgreSQL/MySQL（完整）**

```sql
-- 查詢所有表
SELECT table_name FROM information_schema.tables;

-- 查詢表的所有欄位
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'users';

-- 檢查欄位是否存在
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name='users' AND column_name='plan'
);
```

**這就是為什麼 Code as Schema 在 PostgreSQL 可行！**

---

#### **D1 (SQLite)（受限）**

```sql
-- 查詢所有表
SELECT name FROM sqlite_master WHERE type='table';

-- 查詢表結構（返回字串，難解析）
PRAGMA table_info(users);
/* 返回：
cid  name   type  notnull  dflt_value  pk
0    id     TEXT  0        NULL        1
1    email  TEXT  1        NULL        0
*/

-- ❌ 沒有簡單的 EXISTS 查詢欄位方式
-- 需要解析 PRAGMA 結果（複雜）
```

**這就是為什麼 Code as Schema 在 D1 很困難！**

---

### **ALTER TABLE 差異**

| SQL 語法 | PostgreSQL | MySQL | D1 (SQLite) |
|----------|-----------|-------|------------|
| `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT` | ✅ 13+ | ✅ 8.0.29+ | ❌ 不支援 |
| `ALTER TABLE users DROP COLUMN IF EXISTS plan` | ✅ | ✅ | ❌ 不支援 |
| `ALTER TABLE users RENAME COLUMN old TO new` | ✅ | ✅ | ✅ |

**SQLite 的 ALTER TABLE 非常受限！**

---

## 📊 三種 Migration 方案完整對比

### **方案 A：D1 Migrations（Wrangler 官方）**

```bash
migrations/
├── 0001_initial.sql        # 初始結構
├── 0002_add_plan.sql       # 加入 plan 欄位
└── 0003_add_tags.sql       # 加入 tags 表
```

#### **運作機制**

```bash
# 執行
npx wrangler d1 migrations apply oao-to-db --remote
```

**Wrangler 內部流程**：
```
1. 讀取 migrations/ 目錄
2. 檢查 D1 的 _cf_KV 追蹤表
3. 找出未執行的 migrations
4. 按檔名順序執行
5. 記錄到追蹤表
```

**追蹤機制**（Cloudflare 自動管理）：
```sql
-- Wrangler 自動創建
CREATE TABLE _cf_KV (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 自動記錄
INSERT INTO _cf_KV VALUES ('migration_0001_initial', 'applied_at_2026-01-14T10:00:00Z');
INSERT INTO _cf_KV VALUES ('migration_0002_add_plan', 'applied_at_2026-01-15T11:00:00Z');
```

#### **優勢**

✅ **官方標準**：Cloudflare 推薦並維護  
✅ **自動追蹤**：不會重複執行  
✅ **版本控制**：每個變更一個檔案  
✅ **Git 友善**：清楚的歷史記錄  
✅ **多人協作**：不同開發者可以各自建 migration  

#### **劣勢**

⚠️ **手動觸發**：需要記得執行 `migrations apply`  
⚠️ **無自動回滾**：錯誤需手動修復  
⚠️ **學習曲線**：需要理解 migration 概念  

#### **回溯策略**

```sql
-- 如果 0002_add_plan.sql 執行錯了

-- 方案 1：創建回滾 migration
-- migrations/0003_rollback_plan.sql
ALTER TABLE users DROP COLUMN plan;

-- 方案 2：D1 Time Travel（推薦）
npx wrangler d1 time-travel restore oao-to-db --timestamp=執行前的時間點
```

---

### **方案 B：Schema.sql（單次執行）**

```sql
-- schema.sql（完整結構）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS links (
  slug TEXT PRIMARY KEY,
  url TEXT NOT NULL
);
```

```bash
# 執行
npx wrangler d1 execute oao-to-db --file=./schema.sql --remote
```

#### **運作機制**

- 沒有追蹤機制
- 每次執行整個檔案
- 依賴 `IF NOT EXISTS` 防止重複建表

#### **優勢**

✅ **極簡單**：一個檔案搞定  
✅ **適合初始化**：新資料庫快速建立  
✅ **冪等性**：`IF NOT EXISTS` 保護  

#### **劣勢**

❌ **無法增量更新**：整個檔案重新執行  
❌ **無追蹤**：不知道是否已執行  
❌ **不適合生產**：有真實資料時危險  

#### **適用場景**

```
✅ 開發環境初始化
✅ 測試環境重置
❌ 生產環境更新
```

#### **回溯策略**

```bash
# ❌ 幾乎無法回滾
# 只能手動執行 DROP/ALTER
npx wrangler d1 execute oao-to-db --remote --command "DROP TABLE bad_table"
```

---

### **方案 C：Code as Schema（程式碼初始化）**

```typescript
// 每次 Worker 啟動時執行
export default {
  async fetch(request, env) {
    await initDatabase(env.DB);  // 啟動時初始化
    // ... 處理請求
  }
}

async function initDatabase(db: D1Database) {
  // 建表
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL
    )
  `).run();
  
  // 檢查欄位存在（困難！）
  const columns = await db.prepare(`
    PRAGMA table_info(users)
  `).all();
  
  const hasColumn = columns.results.some((col: any) => col.name === 'plan');
  
  if (!hasColumn) {
    await db.prepare('ALTER TABLE users ADD COLUMN plan TEXT').run();
  }
}
```

#### **運作機制**

- 每次 Worker 啟動都執行
- 使用 `PRAGMA` 查詢欄位（複雜）
- 依賴 `IF NOT EXISTS` 保護

#### **優勢**

✅ **自動執行**：無需手動觸發  
✅ **彈性高**：可以寫複雜邏輯  
✅ **回滾容易**：修改程式碼重新部署  

#### **劣勢**

❌ **不適合 D1**：
  - D1 沒有 `information_schema`
  - 需要用複雜的 `PRAGMA` 查詢
  - `ALTER TABLE` 不支援 `IF NOT EXISTS`

⚠️ **每次啟動執行**：
  - Workers 頻繁啟動/停止
  - 每個請求可能觸發初始化
  - 性能開銷

⚠️ **程式碼臃腫**：
  - 隨著時間累積檢查邏輯
  - 難以維護

#### **適用場景**

```
✅ 傳統資料庫（PostgreSQL/MySQL）
  - 有 information_schema
  - 伺服器長期運行
  - 只在啟動時執行一次

❌ Cloudflare D1
  - 無狀態邊緣運算
  - 頻繁冷啟動
  - 使用 Migrations 更合適
```

---

## 🎯 完整建議矩陣

### **按場景選擇**

| 場景 | PostgreSQL | MySQL | D1 |
|------|-----------|-------|-----|
| **開發階段** | Code as Schema | Code as Schema | **Schema.sql** or **Migrations** |
| **生產環境** | Migrations (Alembic/Prisma) | Migrations (Flyway/Prisma) | **D1 Migrations** |
| **快速原型** | Schema.sql | Schema.sql | **Schema.sql** |
| **團隊協作** | Migrations | Migrations | **D1 Migrations** |

---

## 🔧 Wrangler 是什麼？

### **Wrangler = Cloudflare Workers 的 CLI 工具**

```bash
Wrangler 的功能：
├── 部署 Workers
├── 管理 KV
├── 管理 D1
├── 管理 R2
├── 本地開發（Miniflare）
├── 日誌查看
└── Secrets 管理
```

**類比**：
- Wrangler : Cloudflare = AWS CLI : AWS
- Wrangler : Workers = npm : Node.js

### **Wrangler 的特殊之處**

#### **1. 內建本地模擬器（Miniflare）**

```bash
npm run dev  # 使用 Wrangler

# 自動模擬：
- Workers 執行環境
- KV（本地檔案系統）
- D1（本地 SQLite）
- R2（本地檔案）
- 環境變數
```

**vs 傳統開發**：
```bash
# PostgreSQL 開發
docker run postgres  # 需要 Docker
psql -U postgres     # 需要連線設定
```

**Wrangler**：
```bash
wrangler dev  # 一個指令搞定！
```

---

#### **2. 統一的部署流程**

```bash
# 部署 Worker
wrangler deploy

# 建立 KV
wrangler kv:namespace create LINKS

# 建立 D1
wrangler d1 create my-db

# 執行 migrations
wrangler d1 migrations apply my-db --remote

# 所有 Cloudflare 資源都用 Wrangler 管理！
```

---

#### **3. 環境分離（--local vs --remote）**

```bash
# 本地開發
wrangler d1 execute db --local --command "SELECT * FROM users"

# 生產環境
wrangler d1 execute db --remote --command "SELECT * FROM users"

# 本地測試 migrations
wrangler d1 migrations apply db --local

# 生產執行 migrations
wrangler d1 migrations apply db --remote
```

**這是 Wrangler 的殺手級功能！**

---

## 🚨 D1 的新手常見誤區

### **誤區 1：以為 D1 = PostgreSQL**

```typescript
// ❌ 錯誤：以為有 information_schema
const result = await db.prepare(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'users'
`).all();
// Error: no such table: information_schema

// ✅ 正確：使用 PRAGMA
const result = await db.prepare(`
  PRAGMA table_info(users)
`).all();
```

---

### **誤區 2：以為 ALTER TABLE 支援 IF NOT EXISTS**

```sql
-- ❌ 錯誤
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT;
-- Error: syntax error

-- ✅ 正確：需要自己檢查
-- 方案 1：用 Migrations（Wrangler 自動追蹤）
-- 方案 2：用 PRAGMA 檢查後執行
```

---

### **誤區 3：以為可以隨時連線查詢**

```typescript
// ❌ 錯誤：以為有長期連線
const client = await db.connect();  // D1 沒有 connect()
client.query(...);

// ✅ 正確：每次都是新請求
const result = await env.DB.prepare('SELECT * FROM users').all();
```

---

### **誤區 4：以為本地和遠端共享數據**

```bash
# 本地創建數據
wrangler d1 execute db --local --command "INSERT INTO users ..."

# 遠端查詢
wrangler d1 execute db --remote --command "SELECT * FROM users"
# ❌ 查不到！本地和遠端是獨立的！
```

---

### **誤區 5：以為 Code as Schema 適用於 D1**

```typescript
// ❌ 在 D1 上很困難
export default {
  async fetch(request, env) {
    await initDatabase(env.DB);  // 每個請求都可能執行！
    // ...
  }
}
```

**問題**：
- Workers 是無狀態的（頻繁冷啟動）
- 每個請求可能是新實例
- 初始化會重複執行（性能問題）
- D1 沒有 information_schema（檢查複雜）

**vs PostgreSQL**：
```python
# FastAPI + PostgreSQL
@app.on_event("startup")
async def startup():
    await init_database()  # 只在啟動時執行一次
    # 之後伺服器一直運行，不會重複執行
```

---

## 🎯 三種方案的適用場景

### **你現在的情況**

```
階段：開發初期
資料：可以隨時重來
團隊：單人或小團隊
資料庫：Cloudflare D1

建議：D1 Migrations ✅
```

**為什麼？**

1. **符合官方標準**
   - Cloudflare 推薦
   - 文檔完整
   - 工具支援

2. **未來不需要改**
   - 開發用 Migrations
   - 生產也用 Migrations
   - 無需切換方案

3. **簡單且安全**
   - 比 Code as Schema 簡單（不需要寫檢查邏輯）
   - 比 Schema.sql 安全（有追蹤機制）

---

### **開發階段的靈活性**

```sql
-- migrations/0001_initial.sql
CREATE TABLE IF NOT EXISTS users (...);  -- ✅ 加 IF NOT EXISTS

CREATE TABLE IF NOT EXISTS links (...);
```

**開發時可以：**

```bash
# 修改 0001_initial.sql 的內容（加欄位）
# 然後：

# 方案 1：重置本地資料庫
rm -rf .wrangler/state/v3/d1
wrangler d1 migrations apply oao-to-db --local

# 方案 2：如果已有資料想保留
# 創建 0002_add_field.sql
ALTER TABLE users ADD COLUMN new_field TEXT;
wrangler d1 migrations apply oao-to-db --local
```

**你可以隨時調整！**

---

## 💡 回答你的核心問題

### **Q1: 開發階段適合用 D1 Migrations 嗎？**

✅ **適合！**

**理由**：
1. 養成正確習慣
2. 未來不需要改
3. 比 Code as Schema 簡單
4. 可以隨時修改 migration 檔案（反正資料可以重來）

### **Q2: 可以直接改 Migration 的初始表嗎？**

✅ **可以！**

```bash
# 開發階段（資料可以重來）

# 方案 1：修改 0001_initial.sql
# 然後刪除本地 D1，重新跑 migrations
rm -rf .wrangler/state/v3/d1
wrangler d1 migrations apply oao-to-db --local

# 方案 2：創建新 migration
# 0002_fix.sql
ALTER TABLE users ADD COLUMN new_field TEXT;
wrangler d1 migrations apply oao-to-db --local
```

**生產階段（有真實資料）**：
❌ 不能改已執行的 migration  
✅ 只能創建新 migration 修復  

---

## 📋 最終建議

### **你的專案應該這樣做**

```
目前階段（開發）：
├── 使用 D1 Migrations
├── 可以隨時修改 migrations/0001_initial.sql
├── 本地測試用 --local
└── 資料錯了就重置

未來階段（生產）：
├── 繼續使用 D1 Migrations
├── 不再修改已執行的 migrations
├── 只創建新 migration
└── 使用 Time Travel 備份
```

### **Migration 檔案建議寫法**

```sql
-- migrations/0001_initial.sql
-- ✅ 建議：加 IF NOT EXISTS（冪等性）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL
);

-- migrations/0002_add_plan.sql
-- ✅ 建議：雖然 SQLite 不支援，但註解說明
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT;  -- SQLite 不支援
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';

-- 安全保障：Wrangler 追蹤已執行，不會重複執行
```

---

## 🔥 D1 的殺手級功能：Time Travel

### **自動時間點備份**

```bash
# D1 自動備份！

# 回到某個時間點
npx wrangler d1 time-travel restore oao-to-db \
  --timestamp=2026-01-14T10:00:00Z \
  --remote

# 這是傳統資料庫做不到的！
```

**vs 傳統資料庫**：
```bash
# PostgreSQL（需要自己設定）
pg_dump my_db > backup.sql  # 手動備份
psql my_db < backup.sql     # 手動恢復

# D1（自動）
wrangler d1 time-travel restore db --timestamp=...
```

---

## 📝 總結

| 方案 | 適用資料庫 | 適用場景 | 推薦度 |
|------|-----------|---------|--------|
| **D1 Migrations** | D1 | 所有階段 | ⭐⭐⭐⭐⭐ |
| **Schema.sql** | D1, PostgreSQL, MySQL | 開發初始化 | ⭐⭐⭐ |
| **Code as Schema** | PostgreSQL, MySQL | 傳統資料庫 | D1: ❌ |

**你的專案（OAO.TO）應該用：D1 Migrations**

---

**完整的技術對比、誤區說明、實戰建議都在這裡了！**

