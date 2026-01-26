# Admin Portal 立即修正清單

**緊急**: 需在新對話中立即完成

## 後端問題

### 1. Credits Adjust API 失敗
- 文件: `api-worker/src/routes/admin.ts` line 422-500
- 錯誤: D1_TYPE_ERROR undefined
- 動作: 逐行檢查 binding，測試每個 SQL

### 2. 後端代碼未重新載入
- 動作: 完全重啟 wrangler dev

## 前端問題

### 3. API Keys Detail 白屏
- 文件: `frontend/src/pages/admin/ApiKeysMonitoring.tsx`
- 錯誤: Cannot read properties of undefined
- 動作: 所有屬性訪問加 ?.

### 4. Plans Edit 無功能
- 文件: `frontend/src/pages/admin/PlansManagement.tsx`
- 動作: 實現完整編輯 modal

### 5. User Actions hover 問題
- 文件: `frontend/src/pages/Admin/Users.tsx`
- 動作: 改為直接顯示按鈕

## 已完成

✅ 11個頁面
✅ 19+ API endpoints
✅ 數據庫結構
✅ 文檔

## 測試命令

```bash
# 重啟後測試
export ADMIN_TOKEN=$(node -e ...)
curl POST .../credits/adjust
curl GET .../audit-logs
```
