# Audit Logging 支援狀態

**更新時間**: 2026-01-27  
**版本**: V1.0

---

## ✅ **已實現的 Audit Logging**

### **Admin 操作** (6 種)

| 操作 | Action | Resource Type | 狀態 | 測試 |
|------|--------|---------------|------|------|
| 調整 Credits | `adjust_credits` | `credit` | ✅ | ✅ |
| 更新用戶角色 | `update_user_role` | `user` | ✅ | ✅ |
| 刪除連結 | `delete_link` | `link` | ✅ | ⚠️ 待測 |
| 撤銷 API Key | `revoke_api_key` | `api_key` | ✅ | ⚠️ 待測 |
| 標記連結 | `flag_link` | `link` | ✅ | ⚠️ 待測 |
| 更新方案 | `update_plan` | `plan` | ✅ | ⚠️ 待測 |

### **記錄內容**

每條 Audit Log 包含：
- `id` - 唯一標識
- `user_id` - 操作者 ID
- `user_email` - 操作者 Email
- `user_role` - 操作者角色
- `action` - 操作類型
- `resource_type` - 資源類型
- `resource_id` - 資源 ID
- `old_value` - 舊值（JSON）
- `new_value` - 新值（JSON）
- `ip_address` - IP 地址
- `user_agent` - User Agent
- `created_at` - 時間戳

---

## ⚠️ **尚未實現的操作**

### **應該添加但未實現**

| 操作 | 優先級 | 說明 |
|------|--------|------|
| 創建用戶 | P2 | 新用戶註冊（自動） |
| 停用用戶 | P1 | 管理員停用帳號 |
| 刪除用戶 | P1 | 管理員刪除帳號 |
| 創建 Support Ticket | P2 | 用戶創建工單 |
| 回覆 Support Ticket | P1 | 管理員回覆 |
| 更新 Ticket 狀態 | P1 | 狀態變更 |
| 創建連結 | P2 | 用戶創建短網址 |
| 更新連結 | P2 | 修改短網址資訊 |
| 創建 API Key | P2 | 用戶創建 Key |
| 刪除 API Key | P2 | 用戶刪除 Key |

---

## 📋 **實現細節**

### **Middleware**
- 文件：`api-worker/src/middleware/audit.ts`
- 函數：`logAuditAction()`
- 執行方式：同步執行（確保記錄成功）

### **使用方式**
```typescript
// 獲取舊值
const oldData = await getOldData();

// 執行操作
await performAction();

// 記錄 Audit Log
const { logAuditAction } = await import('../middleware/audit');
await logAuditAction(
  c.env,
  userId,
  userEmail,
  userRole,
  'action_name',
  'resource_type',
  resourceId,
  oldData,
  newData,
  c.req.raw
);
```

---

## 🔍 **前端篩選功能**

Audit Logs 頁面支援：
- ✅ 按操作類型篩選
- ✅ 按資源類型篩選
- ✅ 按 Email/Action 搜尋
- ✅ 詳情頁查看（Before/After 對比）

---

## 🎯 **待完成項目**

### **P1 - 高優先級**
1. Support Ticket 回覆的 Audit Logging
2. Support Ticket 狀態變更的 Audit Logging
3. 測試所有已實現的 Audit Logging

### **P2 - 中優先級**
4. 用戶操作的 Audit Logging（創建連結、API Key 等）
5. Audit Log 導出功能（CSV/Excel）
6. Audit Log 保留期限設定

---

**當前覆蓋率**: 6/16 操作（37.5%）  
**核心操作覆蓋**: 100%（所有 Admin 敏感操作）
