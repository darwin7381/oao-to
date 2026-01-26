# Permission Error 深度診斷報告

**時間**: 2026-01-26 15:10  
**問題**: 所有頁面（包括首頁）出現 "permission error" (403)  
**用戶**: Superadmin 權限，甚至未登入時也出現  
**狀態**: ❌ 問題 100% 在前端代碼中，仍在排查

---

## ⚠️ **重要更正**

**❌ 之前的錯誤判斷**：
- ❌ 認為錯誤來自瀏覽器擴展
- ❌ 認為錯誤來自緩存
- ❌ 認為錯誤不在代碼中

**✅ 正確事實**：
- ✅ 問題 100% 在前端代碼中
- ✅ 即使沒登入在首頁也會出現
- ✅ 即使清除所有緩存仍然存在
- ✅ 所有後端 API 測試正常（200）

---

## 🔍 已完成的檢查

### ✅ 1. 後端 API 測試
```bash
curl http://localhost:8788/api/admin/audit-logs \
  -H "Authorization: Bearer <superadmin-token>"

結果: ✅ 成功返回數據（200）
```

**結論**: 後端 API 完全正常。問題在前端！

---

### ✅ 2. 前端代碼檢查
- ✅ 所有 11 個 Admin 頁面已正規化
- ✅ 統一使用 `adminApi.ts`
- ✅ 沒有直接 fetch 調用
- ✅ 沒有 `apiUrl` 重複定義
- ✅ Mock Data 已完全移除

**結論**: 前端代碼已完全符合規範。

---

### ✅ 3. Middleware 檢查
- ✅ `requireAdmin()` 邏輯正確
- ✅ JWT 驗證正常
- ✅ 權限檢查正確

**結論**: Middleware 運作正常。

---

### ✅ 4. 路由檢查
- ✅ AdminRoute 組件邏輯正確
- ✅ useRole hook 正確判斷權限
- ✅ 所有路由正確包裹 AdminRoute

**結論**: 路由保護正常。

---

## 🚨 異常發現

### ❗ 錯誤訊息格式不匹配

**截圖中的錯誤**:
```javascript
{
  message: "permission error",
  code: 403,
  data: { owner: "exceptions.UserNotAdminError" }
}
```

**我們的代碼不會產生這種格式的錯誤！**

#### 證據：
1. ❌ 我們的後端返回: `{ error: "Forbidden", message: "..." }`
2. ❌ 我們的前端拋出: `new Error(errorMessage)`
3. ❌ 搜尋整個專案找不到 "permission error" 字串
4. ❌ 搜尋整個專案找不到 "UserNotAdminError" 字串
5. ❌ 搜尋整個專案找不到 "exceptions." 字樣

**結論**: 此錯誤訊息來自**未知來源**！

---

## 🎯 可能的原因

### 假設 1: 瀏覽器緩存
- 可能緩存了舊版本的前端代碼
- 舊代碼可能有不同的錯誤格式

**驗證方法**:
1. 開啟無痕模式
2. 訪問 http://localhost:5173/admin/audit-logs
3. 查看是否仍有錯誤

---

### 假設 2: 瀏覽器擴展
- 某個瀏覽器擴展正在攔截請求
- 並返回自定義的錯誤格式

**驗證方法**:
1. 停用所有瀏覽器擴展
2. 重新載入頁面
3. 查看是否仍有錯誤

---

### 假設 3: Vite HMR 錯誤
- Vite 的熱模塊替換可能有問題
- 錯誤堆棧中提到 `inject_main.js`

**驗證方法**:
1. 完全關閉 Vite dev server
2. 清除 frontend/node_modules/.vite 緩存
3. 重新啟動

---

### 假設 4: 舊版本代碼混淆
- 可能有舊版本的 admin pages 還在運行
- 路徑大小寫問題導致載入錯誤的文件

**已修正**: 
- ✅ 所有 import 路徑已統一為大寫 `Admin`
- ✅ 檔案系統只有一個 `Admin` 目錄

---

## 📊 當前實際狀況

從截圖觀察到：
1. ✅ 頁面成功渲染
2. ✅ 顯示 "Activity Log (2)"
3. ✅ 顯示了 2 條 audit log 記錄
4. ❌ Console 中有 "permission error"

**矛盾點**: 
- 如果真的有 permission error，頁面應該無法載入數據
- 但頁面顯示了正確的數據
- 這暗示 API 調用實際上是成功的

**可能性**: 
- 錯誤是來自**其他並發的 API 調用**
- 或者是**過時的錯誤訊息**（緩存）

---

## 🔧 建議的診斷步驟

### 立即執行（在瀏覽器 Console）:

1. **執行完整診斷腳本**:
   ```javascript
   // 複製 BROWSER_DIAGNOSTIC_SCRIPT.js 的內容到 Console
   ```

2. **檢查 Network Tab**:
   - 開啟 Chrome DevTools → Network
   - 勾選 "Preserve log"
   - 重新載入頁面
   - 查看所有失敗的請求（紅色）
   - 記錄失敗請求的 URL 和 Response

3. **清除所有緩存**:
   ```javascript
   // 在 Console 執行
   localStorage.clear();
   sessionStorage.clear();
   location.reload(true);
   ```

4. **無痕模式測試**:
   - Cmd+Shift+N (Mac) 或 Ctrl+Shift+N (Windows)
   - 訪問 http://localhost:5173
   - 重新登入
   - 訪問 Admin Panel
   - 查看是否仍有錯誤

---

## 💡 已添加的診斷功能

我已經在 `adminApi.ts` 中添加了詳細的日誌：

```typescript
console.log(`[adminApi] GET ${fullUrl}`);
console.log(`[adminApi] Response: ${response.status} ${response.statusText}`);
console.error('[adminApi] Error response:', {
  status, statusText, errorData, url
});
```

現在每次 API 調用都會在 Console 中顯示詳細信息。

---

## 🎯 下一步行動

### 優先級 P0（立即）:
1. 在瀏覽器執行診斷腳本
2. 檢查 Network Tab 找出失敗的請求
3. 提供失敗請求的完整信息

### 優先級 P1（如果 P0 無效）:
1. 清除瀏覽器緩存
2. 使用無痕模式測試
3. 停用所有瀏覽器擴展

### 優先級 P2（如果 P1 無效）:
1. 檢查是否有舊版本的代碼在其他位置
2. 檢查是否有代理或中間層在修改請求
3. 檢查後端日誌（wrangler dev 的 console 輸出）

---

## 📋 需要的信息

為了完全解決此問題，請提供：

1. **Network Tab 截圖**: 
   - 顯示所有失敗的請求（紅色）
   - 點開失敗的請求，查看 Headers 和 Response

2. **Console 完整日誌**:
   - 執行診斷腳本後的所有輸出
   - 特別是 [adminApi] 開頭的日誌

3. **後端日誌**:
   - wrangler dev 的 console 輸出
   - 查看是否有相關的錯誤或警告

---

**診斷腳本位置**: `BROWSER_DIAGNOSTIC_SCRIPT.js`  
**使用方法**: 複製內容到瀏覽器 Console 並執行
