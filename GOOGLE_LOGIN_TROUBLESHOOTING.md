# Google Login 實施故障排除完整記錄

**專案**：OAO.TO  
**日期**：2026-01-15  
**功能**：Google OAuth 2.0 登入系統  
**最終狀態**：✅ 成功實施  

---

## 🎯 問題概述

在實施 Google Login 過程中遇到了**四個主要問題**，每個都是獨立的配置或實現問題。本文檔記錄完整的錯誤排除過程和最終解決方案。

---

## 🔴 錯誤 #1：`invalid_client` (401 Error)

### 錯誤訊息
```
已封鎖存取權：授權錯誤
The OAuth client was not found
錯誤代碼：invalid_client
```

### 發生原因
**Google Cloud Console 的 OAuth Consent Screen 設定未完成或狀態不正確。**

### 具體問題
1. **應用狀態為 "In Production"**
   - Production 狀態對本地開發（localhost）有額外限制
   - 但實際上 Production 狀態仍可使用 localhost，問題不在這裡

2. **OAuth Consent Screen 配置不完整**
   - 可能缺少必填欄位
   - Test users 未添加（如果是 Testing 狀態）
   - 域名未驗證（如果是 Production 狀態）

### ✅ 解決方案

**步驟 1：確認 OAuth Consent Screen 完整配置**
```
Google Cloud Console → APIs & Services → OAuth consent screen
```
必須完成：
- ✅ App name
- ✅ User support email
- ✅ Developer contact information
- ✅ Authorized domains (oao.to)
- ✅ Scopes: email, profile

**步驟 2：確認 OAuth Client 配置**
```
Google Cloud Console → APIs & Services → Credentials
```
創建 Web application OAuth Client，設定：
```
Authorized redirect URIs:
  http://localhost:8788/api/auth/google/callback  (本地開發)
  https://api.oao.to/api/auth/google/callback     (生產環境)

Authorized JavaScript origins:
  http://localhost:5173  (可選，但建議添加)
  https://app.oao.to    (生產環境)
```

**步驟 3：環境變數正確配置**
```bash
# api-worker/.dev.vars
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"
GOOGLE_REDIRECT_URI="http://localhost:8788/api/auth/google/callback"
FRONTEND_URL="http://localhost:5173"
JWT_SECRET="long-random-secret-string"
```

### ⚠️ 常見誤區
- ❌ 以為需要改回 Testing 狀態（其實 Production 也可以用 localhost）
- ❌ 以為需要設定 Authorized JavaScript origins（Server-side flow 不強制需要）
- ✅ 真正問題：OAuth Consent Screen 設定不完整

---

## 🔴 錯誤 #2：`no such table: users` (SQLite Error)

### 錯誤訊息
```
✘ [ERROR] OAuth error: Error: D1_ERROR: no such table: users: SQLITE_ERROR
```

### 發生時機
- Google OAuth 成功完成
- 後端成功獲取 access_token 和用戶資料
- **在查詢 D1 資料庫時失敗**

### 發生原因
**本地開發環境的 D1 資料庫沒有執行 migration，缺少 users 表。**

### 具體問題
1. **Migration 未執行**
   - `api-worker/migrations/0001_initial.sql` 存在
   - 但本地 D1 資料庫未執行此 migration

2. **持久化路徑不一致**（關鍵問題！）
   - 執行 `wrangler d1 migrations apply` 時使用預設路徑：`.wrangler/state/`
   - 但 `wrangler dev --persist-to ../.wrangler/oao-shared` 使用自訂路徑
   - **兩個不同的資料庫檔案！**

### ✅ 解決方案

**錯誤做法（會失敗）**：
```bash
# ❌ 這會在錯誤的路徑執行
wrangler d1 migrations apply oao-to-db --local
```

**正確做法**：
```bash
# ✅ 使用與 wrangler dev 相同的 persist-to 路徑
cd api-worker
wrangler d1 migrations apply oao-to-db --local --persist-to ../.wrangler/oao-shared
```

**為什麼這樣才對？**
```
wrangler dev --persist-to ../.wrangler/oao-shared
→ D1 資料庫在：../.wrangler/oao-shared/v3/d1/

wrangler d1 migrations apply --persist-to ../.wrangler/oao-shared
→ Migration 執行在：../.wrangler/oao-shared/v3/d1/

同一個路徑 = 同一個資料庫 ✅
```

### ⚠️ 常見誤區
- ❌ 執行 migration 後沒重啟 API Worker
- ❌ 沒有使用 `--persist-to` 參數執行 migration
- ✅ 正確：migration 和 dev 使用相同的 persist-to 路徑

---

## 🔴 錯誤 #3：`JwtAlgorithmRequired`

### 錯誤訊息
```
✘ [ERROR] [/me] Error: JwtAlgorithmRequired: 
JWT verification requires "alg" option to be specified
```

### 發生時機
- Google OAuth 成功
- Token 成功生成並存入 localStorage
- **驗證 token 時失敗**（調用 `/api/auth/me`）

### 發生原因
**JWT 驗證時缺少演算法參數。**

Hono 的 JWT 驗證需要明確指定演算法：
```typescript
// ❌ 錯誤（會報錯）
await verify(token, secret);

// ✅ 正確
await verify(token, secret, 'HS256');
```

### ✅ 解決方案

**修正 auth.ts**：

```typescript
// 生成 token 時指定演算法
const token = await sign(
  {
    userId: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
  },
  c.env.JWT_SECRET,
  'HS256'  // ← 添加這個
);

// 驗證 token 時也要指定演算法
const { verify } = await import('hono/jwt');
const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as any;
                                                    // ↑ 添加這個
```

### ⚠️ 為什麼會發生？
- Hono JWT 的 API 設計要求明確指定演算法（安全考量）
- 文檔不夠明確，容易遺漏
- 與其他 JWT 庫（如 jsonwebtoken）的行為不同

---

## 🔴 錯誤 #4：Token 反覆失效（循環錯誤）

### 症狀
- 點擊登入後直接跳到回調頁面（沒有看到 Google 授權畫面）
- 立即顯示「登入失敗」
- Token 存在但無法驗證

### 發生原因
**Google 記住了之前的授權，直接返回授權碼，但這個碼可能已被使用過。**

OAuth authorization code 特性：
- 只能使用一次
- 如果之前的嘗試失敗，code 已經無效
- Google 預設會記住授權狀態（prompt=none）

### ✅ 解決方案

**在 OAuth URL 添加 prompt 參數**：

```typescript
auth.get('/google', (c) => {
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', c.env.GOOGLE_REDIRECT_URI);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account'); // ← 關鍵！
  
  return c.redirect(googleAuthUrl.toString());
});
```

**prompt 參數選項**：
- `none`：不顯示任何畫面（預設，會導致問題）
- `consent`：每次都要求重新授權（適合開發測試）
- `select_account`：讓用戶選擇帳號（推薦，最佳 UX）

**手動清除授權**（如果卡住）：
```
https://myaccount.google.com/permissions
→ 找到應用 → 移除存取權
```

---

## 🎯 完整的正確實施流程

### Phase 1：Google Cloud Console 設定

1. **創建專案**（如果沒有）

2. **配置 OAuth Consent Screen**
   ```
   APIs & Services → OAuth consent screen
   
   必填：
   - App name: OAO.TO
   - User support email: your@email.com
   - Developer contact: your@email.com
   - Authorized domains: oao.to
   - Scopes: email, profile
   
   狀態：Testing 或 In Production 都可以
   ```

3. **創建 OAuth 2.0 Client ID**
   ```
   APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID
   
   類型：Web application
   名稱：OAO.TO Web Client
   
   Authorized redirect URIs:
     http://localhost:8788/api/auth/google/callback
     https://api.oao.to/api/auth/google/callback
   
   Authorized JavaScript origins（可選）:
     http://localhost:5173
     https://app.oao.to
   ```

4. **複製憑證**
   - Client ID
   - Client Secret

---

### Phase 2：後端配置

1. **環境變數** (`api-worker/.dev.vars`)
   ```bash
   JWT_SECRET="至少 32 字元的隨機字串"
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"
   GOOGLE_REDIRECT_URI="http://localhost:8788/api/auth/google/callback"
   FRONTEND_URL="http://localhost:5173"
   ```

2. **TypeScript 類型** (`api-worker/src/types.ts`)
   ```typescript
   export interface Env {
     // ... 其他
     JWT_SECRET: string;
     GOOGLE_CLIENT_ID: string;
     GOOGLE_CLIENT_SECRET: string;
     GOOGLE_REDIRECT_URI: string;
     FRONTEND_URL: string;
   }
   ```

3. **D1 Migration** - 確保使用正確的持久化路徑
   ```bash
   cd api-worker
   wrangler d1 migrations apply oao-to-db --local --persist-to ../.wrangler/oao-shared
   ```

4. **JWT 實現** - 必須指定演算法
   ```typescript
   // 生成
   await sign(payload, secret, 'HS256');
   
   // 驗證
   await verify(token, secret, 'HS256');
   ```

5. **OAuth 流程優化**
   ```typescript
   // 添加 prompt 參數
   googleAuthUrl.searchParams.set('prompt', 'select_account');
   ```

---

### Phase 3：前端實現

1. **useAuth Hook** - 完整的認證狀態管理
   ```typescript
   - 自動檢查 localStorage 中的 token
   - 調用 /api/auth/me 驗證 token
   - 提供 login、logout、refreshAuth 方法
   - 詳細的 Console 日誌
   ```

2. **AuthCallback 頁面** - 處理 OAuth 回調
   ```typescript
   - 接收 URL 中的 token 參數
   - 存入 localStorage
   - 重定向到首頁
   - 視覺化處理狀態
   ```

3. **受保護的頁面** - Dashboard 和 Analytics
   ```typescript
   useEffect(() => {
     if (!authLoading && !user) {
       alert('請先登入');
       navigate('/');
     }
   }, [user, authLoading, navigate]);
   ```

4. **UI 狀態顯示**
   - 登入/登出按鈕動態顯示
   - 用戶名稱和頭像
   - 綠色「已登入」提示
   - 紅色錯誤提示
   - Debug 面板（開發模式）

---

## 🔍 錯誤排除檢查清單

### Google OAuth 配置
- [ ] OAuth Consent Screen 已完整配置
- [ ] OAuth Client ID 已創建（Web application）
- [ ] Redirect URIs 包含本地和生產環境
- [ ] Client ID 和 Secret 已複製到 .dev.vars
- [ ] .dev.vars 中的值與 Google Console 完全一致（無空格、無換行）

### D1 資料庫
- [ ] Migration 檔案存在（migrations/0001_initial.sql）
- [ ] Migration 已執行且使用正確的 persist-to 路徑
- [ ] API Worker 使用相同的 persist-to 路徑啟動
- [ ] users 表已成功創建

### JWT 實現
- [ ] sign() 包含 'HS256' 參數
- [ ] verify() 包含 'HS256' 參數
- [ ] JWT_SECRET 至少 32 字元
- [ ] Token 過期時間合理（30 天）

### 前端實現
- [ ] useAuth hook 正確實現
- [ ] AuthCallback 頁面處理 token
- [ ] 受保護的頁面有登入檢查
- [ ] UI 正確顯示登入狀態

---

## 🎯 完整的成功流程

### 用戶登入流程
```
1. 用戶點擊「使用 Google 登入」
   → window.location.href = 'http://localhost:8788/api/auth/google'
   
2. 後端重定向到 Google
   → GET /api/auth/google (302)
   → 重定向到：https://accounts.google.com/o/oauth2/v2/auth?...
   
3. Google 顯示授權畫面
   → 用戶選擇帳號
   → 用戶同意授權
   
4. Google 回調到後端
   → GET http://localhost:8788/api/auth/google/callback?code=xxxxx
   
5. 後端處理回調
   a. 用 code 換取 access_token（POST https://oauth2.googleapis.com/token）
   b. 用 access_token 獲取用戶資料（GET https://www.googleapis.com/oauth2/v2/userinfo）
   c. 在 D1 查詢或創建用戶
   d. 生成 JWT token
   e. 重定向到前端：http://localhost:5173/auth/callback?token=xxxxx
   
6. 前端 AuthCallback 處理
   → 取得 URL 中的 token
   → 存入 localStorage
   → 重定向到首頁（/）
   
7. 前端 useAuth 自動驗證
   → 從 localStorage 讀取 token
   → 調用 /api/auth/me 驗證並獲取用戶資料
   → 更新 UI 狀態
   
8. 完成！
   → 首頁顯示「已登入」和用戶名稱
   → 可以訪問 Dashboard 和 Analytics
```

---

## 🛠️ 關鍵技術細節

### 1. OAuth 2.0 Server-Side Flow

**為什麼用 Server-Side 而非 Client-Side？**
- ✅ 更安全（Client Secret 不暴露給前端）
- ✅ 更好的 token 管理
- ✅ 符合業界標準

**流程特點**：
- 前端只負責重定向
- 後端處理所有 OAuth 邏輯
- Token 交換在後端完成

### 2. D1 本地開發的持久化

**問題**：多個 Worker 需要共享 KV 和 D1

**解決方案**：
```bash
# Core Worker
wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared

# API Worker
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared

# Migration 也要用相同路徑
wrangler d1 migrations apply DB --local --persist-to ../.wrangler/oao-shared
```

**關鍵**：所有使用相同資源的操作都必須使用相同的 persist-to 路徑！

### 3. JWT 在 Hono 中的正確用法

**生成 Token**：
```typescript
import { sign } from 'hono/jwt';

const token = await sign(
  {
    userId: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
  },
  secret,
  'HS256'  // 必須指定！
);
```

**驗證 Token**：
```typescript
import { verify } from 'hono/jwt';

const payload = await verify(token, secret, 'HS256') as any;
                                          // ↑ 必須指定！
```

**為什麼必須指定？**
- Hono JWT 的安全設計
- 防止演算法降級攻擊
- 與其他 JWT 庫不同

### 4. 錯誤處理最佳實踐

**後端**：
```typescript
// ❌ 返回 JSON（用戶看到 raw JSON）
return c.json({ error: 'Authentication failed' }, 500);

// ✅ 重定向回前端（用戶看到友好的錯誤頁面）
const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
return c.redirect(`${frontendUrl}/?error=auth_failed`);
```

**前端**：
```typescript
// 檢查 URL 參數中的錯誤
const error = searchParams.get('error');
if (error === 'auth_failed') {
  setAuthError('登入失敗，請稍後再試。');
  setSearchParams({});
}
```

---

## 📊 完整的檔案結構

```
api-worker/
├── .dev.vars                    # 環境變數（本地開發）
├── migrations/
│   └── 0001_initial.sql        # D1 schema
├── src/
│   ├── routes/
│   │   └── auth.ts             # Google OAuth 實現
│   ├── middleware/
│   │   └── auth.ts             # JWT 中介層
│   └── types.ts                # TypeScript 定義
└── wrangler.toml               # Worker 配置

frontend/
├── src/
│   ├── hooks/
│   │   └── useAuth.ts          # 認證狀態管理
│   ├── pages/
│   │   ├── NewHome.tsx         # 首頁（含登入 UI）
│   │   ├── Dashboard.tsx       # 儀表板（受保護）
│   │   ├── Analytics.tsx       # 分析頁面（受保護）
│   │   └── AuthCallback.tsx    # OAuth 回調處理
│   └── lib/
│       └── api.ts              # API 客戶端
```

---

## ✅ 最終檢查清單

### 部署前確認

**Google Cloud Console**：
- [ ] OAuth Consent Screen 完整配置
- [ ] OAuth Client ID 已創建
- [ ] Redirect URIs 正確設定
- [ ] 憑證已複製

**後端配置**：
- [ ] .dev.vars 正確填寫
- [ ] types.ts 包含所有環境變數定義
- [ ] auth.ts 使用正確的 JWT alg 參數
- [ ] D1 migration 在正確路徑執行

**前端實現**：
- [ ] useAuth hook 完整實現
- [ ] AuthCallback 正確處理 token
- [ ] 所有受保護頁面有登入檢查
- [ ] UI 正確顯示登入狀態

**測試**：
- [ ] 清空 localStorage 重新測試
- [ ] 登入流程完整無誤
- [ ] 登出功能正常
- [ ] 受保護頁面無法在未登入時訪問
- [ ] 錯誤處理友好

---

## 💡 開發經驗總結

### 容易犯的錯誤

1. **環境變數複製錯誤**
   - 多餘的空格、換行符
   - 複製時漏掉字元
   - 使用錯誤的 Client ID/Secret

2. **持久化路徑不一致**
   - Migration 和 dev 使用不同路徑
   - 導致操作不同的資料庫檔案

3. **JWT 演算法遺漏**
   - Hono JWT 必須明確指定 alg
   - 文檔未強調此要求

4. **OAuth code 重複使用**
   - Authorization code 只能用一次
   - 需要 prompt 參數控制授權流程

### 最佳實踐

1. **詳細的日誌**
   - 每個關鍵步驟都添加 console.log
   - 錯誤訊息包含具體細節

2. **友好的錯誤處理**
   - 後端錯誤重定向回前端
   - 前端顯示友好的錯誤訊息

3. **環境一致性**
   - 所有使用共享資源的操作用相同參數
   - Migration 和 dev 用相同的 persist-to

4. **開發模式 Debug 工具**
   - Debug 面板顯示完整狀態
   - Console 輸出詳細日誌

---

## 🎉 成功標準

登入系統完全成功應該達到：

**功能完整性**：
- ✅ Google OAuth 登入流程順暢
- ✅ Token 正確生成和驗證
- ✅ 用戶資料正確儲存和讀取
- ✅ 受保護的路由正確限制訪問

**用戶體驗**：
- ✅ 登入按鈕清晰可見
- ✅ 登入狀態明確顯示
- ✅ 錯誤訊息友好易懂
- ✅ 載入動畫流暢

**開發體驗**：
- ✅ Debug 工具完善
- ✅ Console 日誌詳細
- ✅ 錯誤容易追蹤
- ✅ 修改即時生效

---

## 📚 參考資源

- [Google OAuth 2.0 文檔](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Hono JWT 文檔](https://hono.dev/helpers/jwt)
- [Cloudflare D1 文檔](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 文檔](https://developers.cloudflare.com/workers/wrangler/)

---

**本文檔記錄了從零到成功實施 Google Login 的完整過程，包括所有錯誤和解決方案。**

