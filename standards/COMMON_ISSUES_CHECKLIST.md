# 常見問題檢查清單

**目的**: 開發前快速檢查，避免常見錯誤  
**使用時機**: 創建新組件、新 API、新功能前

---

## 🔴 P0 - 強制檢查

### 1. API 調用方式
- ❌ 禁止在組件中直接使用 `fetch`
- ✅ 必須使用統一的 API Client (`api.ts` 或 `adminApi.ts`)
- 📄 參考：`FRONTEND_API_CLIENT_PATTERN.md`

### 2. 數據格式一致性
- ❌ 禁止前端 camelCase，後端 snake_case 不一致
- ✅ 方案 A：後端返回 camelCase（推薦）
- ✅ 方案 B：前端統一轉換為 snake_case
- ✅ 方案 C：TypeScript interface 明確映射

### 3. Promise 錯誤處理
- ❌ 禁止 `useEffect(() => { asyncFunc(); }, [])`
- ✅ 必須 `useEffect(() => { asyncFunc().catch(...); }, [])`
- 原因：避免 Unhandled Promise Rejection

### 4. 權限檢查
- ❌ 禁止在組件內重複檢查權限
- ✅ 使用 `AdminRoute` 或 `ProtectedRoute` 包裹
- ✅ 使用 `useRole()` hook 讀取權限

---

## 🟡 P1 - 強烈建議

### 5. Loading/Error 狀態
- ⚠️ 每個 API 調用都應有 loading、error、empty 狀態
- ✅ 使用統一的 Loading/Error 組件（待創建）

### 6. TypeScript 類型
- ⚠️ 避免使用 `any`
- ✅ 為所有 API 響應定義 interface
- ✅ 從 API Client 導入類型，不在組件內重複定義

### 7. 環境變數
- ⚠️ 避免硬編碼 API URL
- ✅ 使用 `import.meta.env.PROD` 判斷環境
- ✅ 在 API Client 中統一管理

---

## 🟢 P2 - 建議遵循

### 8. Console Log
- ⚠️ 生產環境避免過多 console.log
- ✅ 只保留 error 和 warn
- ✅ 或使用環境條件：`import.meta.env.DEV && console.log(...)`

### 9. 組件命名
- ⚠️ Admin 頁面統一放在 `pages/Admin/` 目錄（大寫 A）
- ⚠️ 避免路徑大小寫不一致

### 10. 依賴注入
- ⚠️ useEffect 依賴數組要正確
- ⚠️ 避免遺漏依賴或過多依賴

---

## 📋 快速檢查表

開發新功能前，問自己：

- [ ] 是否使用了 API Client？
- [ ] 是否有完整的錯誤處理？
- [ ] 是否有 loading 狀態？
- [ ] TypeScript 類型是否完整？
- [ ] Promise 是否有 .catch()？
- [ ] 數據格式是否一致（camelCase vs snake_case）？
- [ ] 是否避免了硬編碼？
- [ ] Console log 是否適當？

---

**遵循此清單可避免 90% 的常見問題！**
