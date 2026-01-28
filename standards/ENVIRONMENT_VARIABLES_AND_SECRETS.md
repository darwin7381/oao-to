# 環境變數與 Secrets 管理標準

**目的**：確保敏感資訊安全管理，避免洩漏  
**日期**：2026-01-29  
**適用範圍**：所有 Cloudflare Workers 專案  
**重要性**：⭐⭐⭐⭐⭐ 安全性核心

---

## 🎯 核心原則

### ✅ 絕對規則

1. **Secret Keys 永遠不公開**
   - ❌ 不能貼在聊天、文檔、Issue
   - ❌ 不能 commit 到 git
   - ❌ 不能寫在程式碼裡
   - ✅ 只能存在 `.dev.vars`（本地）或 Cloudflare Secrets（生產）

2. **使用 .dev.vars 管理本地開發環境變數**
   - ✅ `.dev.vars` 已在 `.gitignore` 中
   - ✅ 每個 Worker 有自己的 `.dev.vars`
   - ✅ 本地開發自動載入

3. **生產環境使用 Cloudflare Secrets**
   - ✅ 使用 `wrangler secret put`
   - ✅ 加密儲存
   - ✅ 不會出現在程式碼或 git

---

## 📋 環境變數分類

### 1. **Public 變數**（可以公開）

**特性**：
- ✅ 可以出現在前端程式碼
- ✅ 可以 commit 到 git
- ✅ 可以公開分享

**範例**：
```bash
# Stripe Publishable Key（前端用）
STRIPE_PUBLISHABLE_KEY_TEST="pk_test_xxx..."

# API URLs
API_URL="http://localhost:8788"
FRONTEND_URL="http://localhost:5173"

# Google Client ID（OAuth 用）
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
```

**用途**：
- 前端需要的配置
- 公開的 API endpoints
- OAuth Client IDs

---

### 2. **Secret 變數**（絕對保密）

**特性**：
- ❌ 絕對不能公開
- ❌ 不能在前端使用
- ✅ 只能在後端使用

**範例**：
```bash
# Stripe Secret Key
STRIPE_SECRET_KEY_TEST="sk_test_xxx..."
STRIPE_WEBHOOK_SECRET_TEST="whsec_xxx..."

# JWT Secret
JWT_SECRET="your-secret-key"

# Google Client Secret
GOOGLE_CLIENT_SECRET="<REDACTED_GOOGLE_CLIENT_SECRET_in_.dev.vars>..."

# Cloudflare API Token
CLOUDFLARE_API_TOKEN="xxx..."
```

**用途**：
- API 認證
- 加密/解密
- 第三方服務認證

---

### 3. **配置變數**（環境區分）

**特性**：
- ✅ 不同環境有不同值
- ✅ 用於流程控制

**範例**：
```bash
# 環境識別
ENVIRONMENT="development"  # 或 "production"

# Cloudflare Account ID
CLOUDFLARE_ACCOUNT_ID="xxx..."
```

---

## 🔧 正確的管理方式

### 本地開發：使用 .dev.vars

#### 檔案位置

```
/Users/JL/Development/media/oao_to/
├── api-worker/
│   └── .dev.vars  ← API Worker 的環境變數
├── core-worker/
│   └── .dev.vars  ← Core Worker 的環境變數
└── backend/
    └── .dev.vars  ← Backend Worker 的環境變數（如果有）
```

#### .dev.vars 格式

```bash
# 註解說明
VARIABLE_NAME="value"
ANOTHER_VAR="another-value"

# 分組管理
# === Stripe ===
STRIPE_SECRET_KEY_TEST="sk_test_xxx..."
STRIPE_PUBLISHABLE_KEY_TEST="pk_test_xxx..."
STRIPE_WEBHOOK_SECRET_TEST="whsec_xxx..."

# === Google OAuth ===
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<REDACTED_GOOGLE_CLIENT_SECRET_in_.dev.vars>..."
```

#### 重要規則

- ✅ 檔名必須是 `.dev.vars`（不能改）
- ✅ 格式：`KEY="value"`（雙引號）
- ✅ 一行一個變數
- ✅ 可以有註解（`#` 開頭）
- ✅ 已在 `.gitignore` 中（不會 commit）

#### Wrangler 自動載入

```bash
# 啟動時自動載入
wrangler dev --local

# 會顯示：
Using vars defined in .dev.vars
```

---

### 生產環境：使用 Cloudflare Secrets

#### 設定方式

```bash
cd /path/to/worker

# 設定 Secret（會提示輸入，不會顯示）
wrangler secret put SECRET_NAME

# 生產環境
wrangler secret put SECRET_NAME --env production

# 查看已設定的 Secrets
wrangler secret list
wrangler secret list --env production

# 刪除 Secret
wrangler secret delete SECRET_NAME
```

#### 實際範例

```bash
cd /Users/JL/Development/media/oao_to/api-worker

# 測試環境（本地開發不需要，用 .dev.vars）
# 但如果要部署到遠端測試環境：
wrangler secret put STRIPE_SECRET_KEY_TEST

# 生產環境
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
```

---

## ⚠️ 常見錯誤與解決

### 錯誤 1：把 Secret 貼在聊天/文檔

```
❌ 錯誤做法：
「我的 secret key 是 sk_test_xxx...，為什麼不work？」

✅ 正確做法：
「我已經設定了 secret key，但遇到錯誤：[錯誤訊息]」

🚨 補救措施：
1. 立即前往服務提供商（Stripe, Google 等）
2. Roll/Revoke 該 Key
3. 生成新的 Key
4. 更新 .dev.vars
```

---

### 錯誤 2：用 .env 檔案（容易被 commit）

```
❌ 錯誤做法：
創建 .env 檔案，然後忘記加到 .gitignore

✅ 正確做法：
使用 .dev.vars（Wrangler 專用，已在 .gitignore）
```

**為什麼？**
- `.env` 是通用名稱，容易被其他工具讀取
- `.dev.vars` 是 Wrangler 專用，更安全
- Wrangler 預設會忽略 `.dev.vars`

---

### 錯誤 3：在程式碼中硬編碼

```typescript
// ❌ 錯誤做法
const stripeKey = 'sk_test_xxx...';

// ✅ 正確做法
const stripeKey = env.STRIPE_SECRET_KEY_TEST;
```

---

### 錯誤 4：用 wrangler secret put 設定本地開發變數

```bash
# ❌ 錯誤做法（浪費時間）
wrangler secret put STRIPE_SECRET_KEY_TEST
# 輸入 key...

# ✅ 正確做法（直接編輯檔案）
# 編輯 api-worker/.dev.vars
STRIPE_SECRET_KEY_TEST="sk_test_xxx..."
```

**為什麼？**
- `wrangler secret` 是給生產環境用的
- 本地開發直接編輯 `.dev.vars` 更快
- `.dev.vars` 重啟 Worker 就生效

---

### 錯誤 5：Stripe Webhook Secret 設定錯誤

**問題場景**：
```
本地開發用 Stripe CLI:
└─ whsec_xxx... (CLI 顯示的)

Dashboard Webhook:
└─ whsec_yyy... (Dashboard 顯示的)

兩者不同！
```

**解決方式**：
```bash
# 本地開發
stripe listen --forward-to http://localhost:8788/api/webhook/stripe
# 複製顯示的 whsec_xxx...
# 更新到 .dev.vars

# 生產環境
# 在 Stripe Dashboard 建立 Webhook
# 取得 Signing Secret
# 使用 wrangler secret put STRIPE_WEBHOOK_SECRET
```

---

## 📊 完整範例：api-worker/.dev.vars

```bash
# ==========================================
# Cloudflare
# ==========================================
CLOUDFLARE_ACCOUNT_ID="b1d3f8b35c1b43afe837b997180714f3"
CLOUDFLARE_API_TOKEN="<REVOKED_CF_TOKEN>"

# ==========================================
# JWT
# ==========================================
JWT_SECRET="<JWT_SECRET_in_.dev.vars>"

# ==========================================
# URLs
# ==========================================
API_URL="http://localhost:8788"
FRONTEND_URL="http://localhost:5173"

# ==========================================
# Google OAuth
# ==========================================
GOOGLE_CLIENT_ID="<GOOGLE_CLIENT_ID_in_.dev.vars>"
GOOGLE_CLIENT_SECRET="<REDACTED_GOOGLE_CLIENT_SECRET_in_.dev.vars>"

# ==========================================
# Admin
# ==========================================
SUPERADMIN_EMAILS="joey@cryptoxlab.com"

# ==========================================
# Stripe（測試環境）
# ==========================================
STRIPE_SECRET_KEY_TEST="<STRIPE_SECRET_KEY_TEST_in_.dev.vars>"
STRIPE_PUBLISHABLE_KEY_TEST="<STRIPE_PUBLISHABLE_KEY_TEST_in_.dev.vars>"
STRIPE_WEBHOOK_SECRET_TEST="<STRIPE_WEBHOOK_SECRET_TEST_in_.dev.vars>"
ENVIRONMENT="development"
```

**注意**：
- Secret Key 只在這個檔案中（本地開發）
- 不會 commit 到 git
- 生產環境用 `wrangler secret put`

---

## 🚀 生產環境部署流程

### Step 1: 準備生產環境的 Keys

```bash
# 1. Stripe Dashboard 切換到 Live mode
# 2. 取得 Live Keys:
#    - Secret Key: sk_live_xxx...
#    - Publishable Key: pk_live_xxx...
# 3. 建立生產環境 Webhook
# 4. 取得 Webhook Secret: whsec_live_xxx...
```

### Step 2: 設定 Cloudflare Secrets

```bash
cd /Users/JL/Development/media/oao_to/api-worker

# 設定生產環境 Secrets
wrangler secret put STRIPE_SECRET_KEY --env production
# 輸入: sk_live_xxx...

wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
# 輸入: pk_live_xxx...

wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# 輸入: whsec_live_xxx...

wrangler secret put ENVIRONMENT --env production
# 輸入: production

# 其他必要的 Secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
wrangler secret put CLOUDFLARE_API_TOKEN --env production
```

### Step 3: 驗證

```bash
# 列出所有 Secrets
wrangler secret list --env production

# 應該看到：
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
# - JWT_SECRET
# - etc.
```

---

## 🔍 除錯指南

### 問題：Worker 找不到環境變數

**檢查清單**：
1. `.dev.vars` 檔案在 Worker 目錄下（不是根目錄）
2. 檔名完全正確（`.dev.vars`，不是 `.env`）
3. 格式正確（`KEY="value"`）
4. 重啟 `wrangler dev`（修改後需要重啟）

**除錯命令**：
```bash
# 檢查 Worker 載入的變數
wrangler dev --local
# 查看輸出：Using vars defined in .dev.vars

# 測試變數是否可用
wrangler dev --local --test-scheduled
```

---

### 問題：Stripe Webhook 簽名驗證失敗

**常見原因**：

#### 原因 1：Webhook Secret 不正確

```bash
# 本地開發：必須用 Stripe CLI 顯示的 secret
stripe listen --forward-to http://localhost:8788/api/webhook/stripe
# 複製顯示的 whsec_xxx...
# 更新到 .dev.vars 的 STRIPE_WEBHOOK_SECRET_TEST

# 生產環境：用 Dashboard Webhook 的 secret
```

#### 原因 2：環境變數沒載入

```bash
# 重啟 Worker
# Ctrl+C 停止
wrangler dev --local --port 8788
```

#### 原因 3：使用同步 API（Cloudflare Workers 限制）

```typescript
// ❌ 錯誤（同步）
stripe.webhooks.constructEvent(payload, signature, secret);

// ✅ 正確（非同步）
await stripe.webhooks.constructEventAsync(payload, signature, secret);
```

---

## 📝 .gitignore 檢查清單

確保以下檔案在 `.gitignore` 中：

```gitignore
# 環境變數
.dev.vars
.env
.env.local
.env.*.local

# Secrets
*.pem
*.key
credentials.json

# Wrangler
.wrangler/
```

**驗證**：
```bash
git status
# 不應該看到 .dev.vars 被追蹤
```

---

## 🎓 最佳實踐

### 1. 變數命名規範

```bash
# 測試環境加 _TEST 後綴
STRIPE_SECRET_KEY_TEST="sk_test_xxx..."
GOOGLE_CLIENT_ID_TEST="xxx..."

# 生產環境不加後綴（或加 _LIVE）
STRIPE_SECRET_KEY="sk_live_xxx..."
STRIPE_SECRET_KEY_LIVE="sk_live_xxx..."  # 也可以

# 環境識別
ENVIRONMENT="development"  # 或 "production"
```

### 2. 檔案組織

```
api-worker/
├── .dev.vars           ← 本地開發環境變數
├── .dev.vars.example   ← 範本（不含實際值）
├── wrangler.toml       ← Worker 配置
└── src/
    └── index.ts        ← 程式碼（從 env 讀取）
```

**創建範本檔案**：
```bash
# .dev.vars.example（可以 commit）
STRIPE_SECRET_KEY_TEST="your-stripe-secret-key-here"
STRIPE_PUBLISHABLE_KEY_TEST="your-publishable-key-here"
JWT_SECRET="your-jwt-secret-here"
```

### 3. 團隊協作

**新成員加入時**：
```bash
# 1. Clone 專案
git clone xxx

# 2. 複製範本
cd api-worker
cp .dev.vars.example .dev.vars

# 3. 填入實際值（向團隊索取）
# 編輯 .dev.vars

# 4. 啟動開發
wrangler dev --local
```

---

## 🔒 安全檢查清單

### 開發前

- [ ] `.dev.vars` 已在 `.gitignore`
- [ ] 已創建 `.dev.vars.example` 範本
- [ ] 團隊成員知道如何取得 keys

### 開發中

- [ ] Secret Keys 只存在 `.dev.vars`
- [ ] 程式碼從 `env` 讀取，不硬編碼
- [ ] 不在終端機、聊天室貼 Secret Keys
- [ ] 定期 Roll/Revoke 洩漏的 Keys

### 部署前

- [ ] 所有 Secrets 已用 `wrangler secret put` 設定
- [ ] 生產環境 Keys 與測試環境分離
- [ ] 驗證 `wrangler secret list --env production`

### 部署後

- [ ] 測試生產環境功能正常
- [ ] 監控錯誤日誌
- [ ] 確認 Webhook 正常接收

---

## 🎯 Stripe 特殊注意事項

### Webhook Secret 的兩種來源

#### 本地開發（Stripe CLI）

```bash
# 每次啟動都會不同
stripe listen --forward-to http://localhost:8788/api/webhook/stripe

# 顯示：
Your webhook signing secret is whsec_abc123...

# 需要更新到 .dev.vars
STRIPE_WEBHOOK_SECRET_TEST="whsec_abc123..."

# 重啟 Worker 才會載入新的 secret
```

**注意**：
- ⚠️ 每次重啟 `stripe listen` 會產生新的 secret
- ⚠️ 需要同步更新 `.dev.vars` 並重啟 Worker
- ✅ 開發時可以保持 CLI 一直運行（不重啟）

#### 生產環境（Dashboard Webhook）

```bash
# 在 Stripe Dashboard 建立 Webhook
# URL: https://api.oao.to/api/webhook/stripe
# 取得 Signing Secret（只顯示一次）

# 設定到 Cloudflare
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# 輸入: whsec_live_xxx...
```

**注意**：
- ✅ 只需要設定一次
- ✅ 不會改變（除非重新建立 Webhook）
- ✅ 生產環境穩定

---

## 📚 相關文件

- `/payment/STRIPE_INTEGRATION_GUIDE.md` - Stripe 整合指南
- `/payment/STRIPE_SETUP_GUIDE.md` - Stripe 設定教學
- `/.gitignore` - Git 忽略規則
- `standards/` - 其他開發標準

---

## 🎓 學習重點

### 記住這些

1. **Public Key 可以公開，Secret Key 絕對不行**
2. **本地開發用 .dev.vars，生產環境用 wrangler secret**
3. **Stripe CLI 的 webhook secret 會變動，要同步**
4. **洩漏了就立即 Roll/Revoke**
5. **Cloudflare Workers 的 crypto 必須用非同步**

### 口訣

```
看到 Secret → 想到 .dev.vars
要部署 → 想到 wrangler secret put
洩漏了 → 想到 Roll key
Stripe Webhook → 想到 async
```

---

## ⚡ 快速參考

### 本地開發流程

```bash
# 1. 編輯環境變數
vim api-worker/.dev.vars

# 2. 啟動 Worker
cd api-worker
wrangler dev --local --port 8788

# 3. 啟動 Stripe CLI（另一個終端機）
stripe listen --forward-to http://localhost:8788/api/webhook/stripe

# 4. 複製 webhook secret，更新 .dev.vars
# 5. 重啟 Worker（Ctrl+C 後重新執行 step 2）

# 6. 測試
stripe trigger checkout.session.completed
```

### 生產部署流程

```bash
# 1. 取得生產環境 Keys
# 2. 設定 Secrets
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# ... 其他 secrets

# 3. 驗證
wrangler secret list --env production

# 4. 部署
wrangler deploy --env production
```

---

**最後更新**：2026-01-29  
**維護者**：開發團隊  
**狀態**：正式標準

🔐 **安全第一，永遠記住！**
