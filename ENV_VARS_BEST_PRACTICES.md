# 環境變數最佳實踐

**專案**：OAO.TO  
**更新**：2026-01-15  

---

## 🎯 設計原則

### ✅ 正確的做法

**只在環境變數中設定 Base URLs，路徑在代碼中定義**

```bash
# .dev.vars
API_URL="http://localhost:8788"
FRONTEND_URL="http://localhost:5173"
```

```typescript
// 在代碼中構建完整 URL
const redirectUri = `${c.env.API_URL}/api/auth/google/callback`;
const callbackUrl = `${c.env.FRONTEND_URL}/auth/callback`;
```

**優點**：
- ✅ 未來添加 Facebook/GitHub 登入時不需要新增環境變數
- ✅ 路徑統一管理在代碼中
- ✅ 環境變數更簡潔
- ✅ 更容易維護

### ❌ 不建議的做法

**把完整路徑寫在環境變數中**

```bash
# ❌ 不建議
GOOGLE_REDIRECT_URI="http://localhost:8788/api/auth/google/callback"
FACEBOOK_REDIRECT_URI="http://localhost:8788/api/auth/facebook/callback"
GITHUB_REDIRECT_URI="http://localhost:8788/api/auth/github/callback"
```

**缺點**：
- ❌ 每個 OAuth provider 都需要新變數
- ❌ 路徑分散在配置和代碼中
- ❌ 容易出錯（路徑不一致）
- ❌ 難以維護

---

## 📋 環境變數分類

### 1. 基礎設施配置
```bash
CLOUDFLARE_ACCOUNT_ID="..."
CLOUDFLARE_API_TOKEN="..."
```

### 2. 安全憑證
```bash
JWT_SECRET="long-random-string"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### 3. 服務 URLs
```bash
API_URL="http://localhost:8788"
FRONTEND_URL="http://localhost:5173"
```

### 4. 功能開關/配置
```bash
SUPERADMIN_EMAILS="admin1@example.com,admin2@example.com"
```

---

## 🔧 本地 vs 生產環境

### 本地開發 (`.dev.vars`)

```bash
# URLs
API_URL="http://localhost:8788"
FRONTEND_URL="http://localhost:5173"

# Google OAuth
GOOGLE_CLIENT_ID="dev-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="dev-secret"

# Super Admins
SUPERADMIN_EMAILS="your@email.com"
```

### 生產環境 (Wrangler Secrets)

```bash
# URLs
wrangler secret put API_URL
# 輸入：https://api.oao.to

wrangler secret put FRONTEND_URL
# 輸入：https://app.oao.to

# Google OAuth
wrangler secret put GOOGLE_CLIENT_ID
# 輸入：prod-client-id.apps.googleusercontent.com

wrangler secret put GOOGLE_CLIENT_SECRET
# 輸入：prod-secret

# Super Admins
wrangler secret put SUPERADMIN_EMAILS
# 輸入：admin@example.com,owner@example.com
```

---

## 🔐 超級管理員自動設定

### 工作原理

```typescript
// 每次用戶登入時自動檢查
const superAdminEmails = c.env.SUPERADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
const shouldBeSuperAdmin = superAdminEmails.includes(userData.email);

if (!user) {
  // 新用戶：直接設定正確角色
  const role = shouldBeSuperAdmin ? 'superadmin' : 'user';
  // 創建用戶...
} else {
  // 現有用戶：如果在列表中則自動升級
  if (shouldBeSuperAdmin && user.role !== 'superadmin') {
    // 升級為 superadmin
  }
}
```

### 特點

- ✅ **自動創建**：新用戶直接設為 superadmin
- ✅ **自動升級**：現有用戶自動升級
- ✅ **安全**：只在 OAuth 回調時檢查（已驗證 email）
- ✅ **靈活**：支援多個超級管理員（逗號分隔）

### 使用場景

**場景 1：初始化系統**
```bash
SUPERADMIN_EMAILS="founder@startup.com"
```
→ founder 首次登入時自動成為 superadmin

**場景 2：添加共同創辦人**
```bash
SUPERADMIN_EMAILS="founder@startup.com,cofounder@startup.com"
```
→ 兩人都自動成為 superadmin

**場景 3：團隊擴展**
```bash
SUPERADMIN_EMAILS="admin1@company.com,admin2@company.com,admin3@company.com"
```

---

## 🌐 Google Cloud Console 設定

### 現在只需要設定 Base URLs

**Authorized redirect URIs**：
```
http://localhost:8788/api/auth/google/callback
https://api.oao.to/api/auth/google/callback
```

**未來添加其他 OAuth providers**：
```
http://localhost:8788/api/auth/facebook/callback
http://localhost:8788/api/auth/github/callback
https://api.oao.to/api/auth/facebook/callback
https://api.oao.to/api/auth/github/callback
```

**優點**：
- 環境變數不需要改變（仍然只是 API_URL）
- 只需要在 Google/Facebook/GitHub Console 添加新的 redirect URI
- 代碼中統一管理所有路徑

---

## 📊 環境變數對比

### 之前的設計（不建議）

```bash
GOOGLE_REDIRECT_URI="http://localhost:8788/api/auth/google/callback"
FACEBOOK_REDIRECT_URI="http://localhost:8788/api/auth/facebook/callback"
GITHUB_REDIRECT_URI="http://localhost:8788/api/auth/github/callback"
```

**問題**：
- 3 個 OAuth providers = 3 個環境變數
- 路徑重複（都是相同的 base URL）
- 添加新 provider 需要新增環境變數

### 現在的設計（推薦）✅

```bash
API_URL="http://localhost:8788"
```

```typescript
// 代碼中定義
const googleRedirectUri = `${c.env.API_URL}/api/auth/google/callback`;
const facebookRedirectUri = `${c.env.API_URL}/api/auth/facebook/callback`;
const githubRedirectUri = `${c.env.API_URL}/api/auth/github/callback`;
```

**優點**：
- 無論多少 OAuth providers，只需要 1 個環境變數
- 路徑集中管理
- 新增 provider 零配置變更

---

## ✅ 更新檢查清單

### Google Cloud Console
- [ ] **移除舊的完整路徑設定**（如果有）
- [x] **只保留 redirect URIs**：
  - `http://localhost:8788/api/auth/google/callback`
  - `https://api.oao.to/api/auth/google/callback`

### 環境變數
- [x] 使用 `API_URL` 而非 `GOOGLE_REDIRECT_URI`
- [x] 添加 `SUPERADMIN_EMAILS`
- [x] 代碼中動態構建完整 URL

### 代碼
- [x] OAuth 發起時動態構建 redirect_uri
- [x] Token exchange 時使用相同的 redirect_uri
- [x] 自動檢查並設定/升級 superadmin

---

**這樣的設計更符合業界標準，更易於擴展！** ✅

