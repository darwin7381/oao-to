# OAO.TO 部署指南

## 📋 Migration 方式對比與建議

### **兩種方式的差異**

#### **方式 A：D1 Migrations（Wrangler 官方）** ⭐ 推薦

```bash
migrations/
├── 0001_initial.sql
└── 0002_add_plan.sql

# 執行
npx wrangler d1 migrations apply oao-to-db --remote
```

**特點**：
- ✅ Cloudflare 官方推薦
- ✅ 版本化管理（Git 可追蹤）
- ✅ 自動追蹤執行狀態
- ✅ 適合生產環境
- ✅ 支援回滾
- ⚠️ 需要手動執行

---

#### **方式 B：Code as Schema（程式碼初始化）**

```typescript
// 每次啟動時執行
async function initDatabase(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS users (...)
  `).run();
}
```

**特點**：
- ✅ 開發時方便（自動建表）
- ✅ 程式碼即文檔
- ✅ 冪等性（IF NOT EXISTS）
- ⚠️ 生產環境有風險（每次啟動都執行）
- ⚠️ 難以追蹤歷史變更
- ❌ 不適合複雜遷移

---

### **我們的選擇：混合方案**

```
開發階段：
- 使用 D1 Migrations
- 但可以快速執行 --local
- 保持正規性

生產階段：
- 使用 D1 Migrations
- 執行 --remote
- 安全可控

未來擴展：
- 新增功能 → 新增 migration 檔案
- 執行 migrations apply
- 完成！
```

**範例：加入 Google OAuth 後的 migration**

```sql
-- migrations/0002_add_oauth.sql
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN last_login INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
```

執行：
```bash
npx wrangler d1 migrations apply oao-to-db --remote
```

**完全不複雜！Wrangler 自動處理一切。**

---

## 🏗️ 最終架構

```
oao.to (core-worker)
├── 職責：只處理短網址重定向
├── Port: 8787 (本地) / 443 (生產)
└── 依賴：KV + Analytics Engine

api.oao.to (api-worker)
├── 職責：API 服務
├── Port: 8788 (本地) / 443 (生產)
└── 依賴：KV + D1 + Analytics Engine

app.oao.to (frontend - Pages)
├── 職責：前端 UI
├── Port: 5173 (本地) / 443 (生產)
└── 調用：api.oao.to
```

---

## 🚀 完整部署流程

### **前置準備**

#### **1. Cloudflare DNS 檢查**

```bash
✅ oao.to 已經在 Cloudflare（你已完成）

需要確認：
1. 登入 Cloudflare Dashboard
2. 選擇 oao.to 域名
3. DNS → 確保 Proxy 狀態是橘色雲朵（Proxied）
```

#### **2. 創建子域名 DNS 記錄**

```
在 Cloudflare Dashboard → DNS：

1. api.oao.to
   Type: CNAME
   Name: api
   Target: oao.to
   Proxy: ✅ Proxied

2. app.oao.to
   Type: CNAME
   Name: app
   Target: oao.to
   Proxy: ✅ Proxied
```

**注意**：設定 Workers/Pages 自訂域名時，Cloudflare 會自動處理 DNS

---

### **階段 1：部署 Core Worker (oao.to)**

```bash
cd core-worker

# 1. 安裝依賴（已完成）
npm install

# 2. 測試本地
npm run dev
curl -I http://localhost:8787/test

# 3. 啟用生產路由
# 編輯 wrangler.toml，取消註解：
routes = [
  { pattern = "oao.to", custom_domain = true }
]

# 4. 部署
npm run deploy

# 5. 驗證
curl -I https://oao.to/test
# 應該重定向到 https://google.com
```

---

### **階段 2：部署 API Worker (api.oao.to)**

```bash
cd ../api-worker

# 1. 執行 migrations 到遠端
npx wrangler d1 migrations apply oao-to-db --remote

# 2. 設定 Secrets
npx wrangler secret put JWT_SECRET
# 輸入：生成一個隨機字串（例如：openssl rand -base64 32）

npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
# 輸入：你的 Cloudflare Account ID

npx wrangler secret put CLOUDFLARE_API_TOKEN
# 輸入：Analytics Engine API Token

# Google OAuth（如果要啟用登入）
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REDIRECT_URI
# 輸入：https://api.oao.to/api/auth/google/callback

# 3. 啟用生產路由
# 編輯 wrangler.toml，取消註解：
routes = [
  { pattern = "api.oao.to", custom_domain = true }
]

# 4. 部署
npm run deploy

# 5. 驗證
curl -X POST https://api.oao.to/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://google.com"}'
```

---

### **階段 3：部署前端 (app.oao.to)**

```bash
cd ../frontend

# 1. 構建
npm run build

# 2. 部署到 Pages
npx wrangler pages deploy dist --project-name=oao-to-app

# 3. 設定自訂域名
# 在 Cloudflare Dashboard:
# Pages → oao-to-app → Custom domains → Add: app.oao.to

# 4. 驗證
open https://app.oao.to
```

---

## 🧪 測試清單

### **Core Worker (oao.to)**

```bash
# 健康檢查
curl https://oao.to/health

# 重定向測試
curl -I https://oao.to/test

# 404 測試
curl https://oao.to/nonexistent
```

### **API Worker (api.oao.to)**

```bash
# 健康檢查
curl https://api.oao.to/health

# 創建短網址（隨機）
curl -X POST https://api.oao.to/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://twitter.com"}'

# 創建短網址（自訂）
curl -X POST https://api.oao.to/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://facebook.com","customSlug":"fb"}'

# 列表
curl https://api.oao.to/test-list
```

### **Frontend (app.oao.to)**

```bash
# 訪問首頁
open https://app.oao.to

# 測試創建流程
# 1. 輸入網址
# 2. 點擊「縮短網址」
# 3. 複製短網址
# 4. 測試短網址
```

---

## 🔧 本地開發設置

### **同時運行三個服務**

```bash
# Terminal 1: Core Worker (port 8787，使用 --persist-to 共享 KV)
cd core-worker
wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared

# Terminal 2: API Worker (port 8788，使用 --persist-to 共享 KV)
cd api-worker
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared

# Terminal 3: Frontend (port 5173)
cd frontend
npm run dev
```

### **本地測試完整流程**

```bash
# 1. 訪問前端
open http://localhost:5173

# 2. 創建短網址
# 前端會調用: http://localhost:8788/shorten

# 3. 測試重定向
# 手動訪問: http://localhost:8787/[生成的slug]
```

---

## 🎯 域名設定總結

| 域名 | 服務類型 | 用途 | 設定方式 |
|------|---------|------|---------|
| `oao.to` | Workers | 短網址重定向 | wrangler.toml routes |
| `api.oao.to` | Workers | API 服務 | wrangler.toml routes |
| `app.oao.to` | Pages | 前端 UI | Pages Custom Domain |

**全部設定在 Cloudflare Dashboard 自動處理，無需手動 DNS！**

---

## 💡 Migration 最佳實踐

### **開發新功能時**

```bash
# 1. 創建新的 migration 檔案
cd api-worker
echo "ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';" > migrations/0002_add_plan.sql

# 2. 本地測試
npx wrangler d1 migrations apply oao-to-db --local

# 3. 部署前執行到遠端
npx wrangler d1 migrations apply oao-to-db --remote

# 4. 部署 Worker
npm run deploy
```

### **查看 migration 狀態**

```bash
# 列出所有 migrations
npx wrangler d1 migrations list oao-to-db --remote

# 輸出範例：
# ✅ 0001_initial.sql (applied 2026-01-14)
# ✅ 0002_add_plan.sql (applied 2026-01-15)
```

---

## 🎉 部署狀態

✅ **已部署到生產環境**（2026-01-15）：
- ✅ Core Worker (https://oao.to)
- ✅ API Worker (https://api.oao.to)
- ✅ Frontend (https://28ad8abb.oao-to-app.pages.dev)

✅ **生產資源**：
- ✅ Production KV: cb616d868c134b1c9e5e6ef54afb3f64
- ✅ Production D1: bc49236e-acc9-499b-ba68-6aa90a000444
- ✅ Migrations 已執行
- ✅ Secrets 已設定

✅ **功能正常**：
- ✅ 短網址創建與重定向
- ✅ Google OAuth 登入
- ✅ 用戶角色系統
- ✅ Analytics 功能（數據累積中）

⏳ **待完成**：
- [ ] 設定 app.oao.to Custom Domain（需手動在 Dashboard）

**完整實戰經驗**：參見 [PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md](./PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md)

