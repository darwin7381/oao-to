# Google Login 設定完成指南

**專案**：OAO.TO  
**功能**：Google OAuth 登入系統  
**狀態**：✅ 已配置完成，可以測試  

---

## ✅ 已完成的配置

### 1. 環境變數設定

**本地開發** (`api-worker/.dev.vars`)：
```bash
JWT_SECRET="oao-to-dev-jwt-secret-key-for-local-development-2026-secure-random-string"
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-YOUR_CLIENT_SECRET_HERE"
GOOGLE_REDIRECT_URI="http://localhost:8788/api/auth/google/callback"
FRONTEND_URL="http://localhost:5173"
```

### 2. 後端修正

✅ **auth.ts** - 修正 OAuth 回調重定向 URL
- 從：`https://oao.to/auth/callback?token=${token}`
- 改為：`${c.env.FRONTEND_URL}/auth/callback?token=${token}`
- 現在會根據環境動態決定前端 URL

✅ **types.ts** - 添加 FRONTEND_URL 類型定義

### 3. 前端修正

✅ **useAuth.ts** - 修正登入 URL
- 從：硬編碼的 `https://oao.to/api/auth/google`
- 改為：根據環境動態決定（開發時用 `localhost:8788`）

---

## 🚀 測試步驟

### 準備工作

1. **確認 Google Cloud Console 已設定**
   - OAuth 同意畫面已配置
   - OAuth 2.0 Client ID 已創建
   - 回調 URI 已添加：`http://localhost:8788/api/auth/google/callback`

2. **確認本地環境**
   - `.dev.vars` 檔案已正確配置
   - Google Client ID 和 Secret 已填入

### 啟動服務

**Terminal 1 - API Worker**：
```bash
cd api-worker
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared
```

**Terminal 2 - Core Worker**（可選，如果需要測試重定向）：
```bash
cd core-worker
wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared
```

**Terminal 3 - Frontend**：
```bash
cd frontend
npm run dev
```

### 測試登入流程

1. **打開瀏覽器**
   ```
   http://localhost:5173
   ```

2. **點擊登入按鈕**
   - 應該會重定向到 Google 登入頁面
   - URL 應該是：`http://localhost:8788/api/auth/google`

3. **選擇 Google 帳號並授權**
   - 選擇您在 Google Cloud Console 設定的測試用戶
   - 同意授權

4. **驗證回調**
   - 應該會重定向回：`http://localhost:5173/auth/callback?token=xxx`
   - Token 會自動存入 localStorage
   - 自動跳轉到 `/dashboard`

5. **確認登入狀態**
   - 在 Dashboard 頁面應該能看到用戶資訊
   - 開啟 DevTools → Application → Local Storage
   - 應該能看到 `token` 欄位

---

## 🔍 除錯檢查

### 如果登入失敗

**檢查 1：回調 URI 是否正確**
```bash
# 在 Google Cloud Console 確認已添加：
http://localhost:8788/api/auth/google/callback
```

**檢查 2：環境變數是否載入**
```bash
# 在 api-worker/src/routes/auth.ts 添加 console.log
console.log('GOOGLE_CLIENT_ID:', c.env.GOOGLE_CLIENT_ID);
console.log('FRONTEND_URL:', c.env.FRONTEND_URL);
```

**檢查 3：查看 API Worker 終端機輸出**
- 應該會顯示 OAuth 流程的 log
- 如果有錯誤會在這裡顯示

**檢查 4：瀏覽器 DevTools Console**
- 查看是否有 CORS 錯誤
- 查看是否有 API 調用失敗

**檢查 5：D1 Database 是否有 users 表**
```bash
cd api-worker
wrangler d1 execute oao-to-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

如果沒有，執行 migration：
```bash
wrangler d1 migrations apply oao-to-db --local
```

---

## 📊 完整登入流程

```
1. 用戶點擊「登入」按鈕
   ↓
2. 前端重定向到：http://localhost:8788/api/auth/google
   ↓
3. API Worker 重定向到：Google OAuth 授權頁面
   ↓
4. 用戶在 Google 選擇帳號並授權
   ↓
5. Google 回調到：http://localhost:8788/api/auth/google/callback?code=xxx
   ↓
6. API Worker：
   - 用 code 換取 access_token
   - 用 access_token 獲取用戶資料
   - 檢查 D1 是否有此用戶（有則使用，無則創建）
   - 生成 JWT token
   ↓
7. API Worker 重定向到：http://localhost:5173/auth/callback?token=xxx
   ↓
8. 前端 AuthCallback 組件：
   - 接收 token
   - 存入 localStorage
   - 重定向到 /dashboard
   ↓
9. Dashboard 頁面：
   - useAuth hook 自動載入
   - 用 token 調用 /api/auth/me
   - 獲取用戶資料並顯示
```

---

## 🎯 生產環境部署

當本地測試成功後，部署到生產環境需要：

### 1. 更新 Google Cloud Console

添加生產環境回調 URI：
```
https://api.oao.to/api/auth/google/callback
```

### 2. 設定生產環境 Secrets

```bash
cd api-worker

wrangler secret put JWT_SECRET -e production
# 輸入：強隨機字串（建議 64 字元以上）

wrangler secret put GOOGLE_CLIENT_ID -e production
# 輸入：您的 Google Client ID

wrangler secret put GOOGLE_CLIENT_SECRET -e production
# 輸入：您的 Google Client Secret

wrangler secret put GOOGLE_REDIRECT_URI -e production
# 輸入：https://api.oao.to/api/auth/google/callback

wrangler secret put FRONTEND_URL -e production
# 輸入：https://app.oao.to
```

### 3. 部署服務

```bash
# API Worker
cd api-worker
wrangler deploy -e production

# Frontend
cd frontend
npm run build
wrangler pages deploy dist --project-name oao-to-app
```

---

## ✨ 功能特點

- ✅ 完整的 Google OAuth 2.0 流程
- ✅ JWT token 認證（30 天有效期）
- ✅ 自動創建新用戶或登入現有用戶
- ✅ 前後端環境自動適配（開發/生產）
- ✅ 用戶資料存儲在 D1 Database
- ✅ 安全的 token 管理（localStorage）

---

## 📝 下一步優化建議

1. **錯誤處理**
   - 添加友好的錯誤提示頁面
   - 處理 OAuth 失敗情況

2. **用戶體驗**
   - 添加載入動畫
   - 優化回調頁面 UI

3. **安全性**
   - 考慮添加 refresh token 機制
   - 實現 token 自動續期

4. **功能擴展**
   - 添加用戶個人資料頁面
   - 實現帳號設定功能

---

**設定完成！現在可以開始測試 Google Login 了！** 🎉

