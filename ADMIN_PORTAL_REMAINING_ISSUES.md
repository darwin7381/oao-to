# Admin Portal 待修正問題清單

**日期**: 2026-01-25  
**優先級**: 高 - 需立即修正

---

## 🔴 必須修正的問題

### **1. Plans Edit 按鈕無功能**
**位置**: `frontend/src/pages/admin/PlansManagement.tsx`  
**問題**: Edit Plan 按鈕只有 alert，沒有實際編輯功能  
**需要**: 實現編輯 modal，可修改 price_monthly, monthly_credits, features

### **2. API Keys Detail Modal 白屏**
**位置**: `frontend/src/pages/admin/ApiKeysMonitoring.tsx`  
**問題**: 點擊 Details 按鈕整個頁面變白  
**原因**: 可能是 undefined 屬性訪問  
**需要**: 檢查所有 selectedKey.xxx 的 null 安全

### **3. Credits Adjust 持續失敗**
**位置**: `api-worker/src/routes/admin.ts` 第 422-480 行  
**錯誤**: "D1_TYPE_ERROR: Type 'undefined' not supported"  
**需要**: 
- 檢查所有 binding 參數
- 可能是 adminEmail 或其他變數 undefined
- 需要完整測試 INSERT INTO credit_transactions

### **4. Audit Logs 無數據**
**位置**: `api-worker/src/routes/admin.ts` 多處  
**問題**: 沒有任何操作被記錄到 audit_logs  
**需要**: 
- 確保 logAuditAction 正確執行
- 整合到所有 Admin 操作（delete, adjust, revoke等）
- 測試確認有數據寫入

### **5. User Management Actions 顯示問題**
**位置**: `frontend/src/pages/Admin/Users.tsx`  
**問題**: Actions 下拉選單需要 hover 才能看到  
**需要**: 改為直接顯示按鈕或改進 UX

---

## 📋 測試驗證清單

完成修正後必須測試：

- [ ] Plans Edit 可以彈出 modal
- [ ] Plans Edit 可以更新價格
- [ ] Plans 更新後前端立即顯示新價格
- [ ] API Keys Detail 可以正常顯示
- [ ] API Keys Detail 顯示完整資訊
- [ ] Credits Adjust 成功調整餘額
- [ ] Credits Adjust 後立即在列表中看到新餘額
- [ ] 每次 Credits Adjust 都記錄到 Audit Logs
- [ ] Audit Logs 顯示完整操作資訊
- [ ] User Actions 可以正常修改角色

---

## 🎯 修正優先級

**P0（阻塞）**：
1. Credits Adjust - 核心功能
2. Audit Logs 記錄 - 安全必需

**P1（重要）**：
3. API Keys Detail - 用戶體驗
4. Plans Edit - 運營需要

**P2（改進）**：
5. User Actions UX

---

## 💡 建議的修正順序

1. **先修正 Credits Adjust**（最關鍵）
   - 逐行檢查 binding 參數
   - 確保所有變數都有值
   - 簡化 SQL，逐步測試

2. **整合 Audit Logs**
   - 在 Credits Adjust 成功後加入
   - 測試確認寫入
   - 然後整合到其他操作

3. **修正前端問題**
   - API Keys Detail modal
   - Plans Edit modal
   - User Actions 顯示

---

## 🔍 Debug 建議

### **Credits Adjust Debug**：
```typescript
// 在每個步驟添加 console.log
console.log('adminUserId:', adminUserId);
console.log('adminEmail:', adminEmail);
console.log('currentBalance:', currentBalance);
console.log('newBalance:', newBalance);

// 逐個測試 SQL
// 1. 先測試 UPDATE credits
// 2. 再測試 INSERT credit_transactions
// 3. 最後加入 audit logging
```

### **API Keys Detail Debug**：
```typescript
// 檢查 selectedKey 是否存在
if (!selectedKey) return null;

// 檢查所有屬性
console.log('selectedKey:', selectedKey);

// 添加 null 安全
selectedKey?.totalRequests?.toLocaleString() ?? '0'
```

---

**當前狀態**: 基礎查詢功能全部正常（10/10 API 返回 200），操作功能需要修正。
