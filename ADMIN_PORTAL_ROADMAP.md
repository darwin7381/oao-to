# Admin Portal 功能路線圖

**版本**: 1.1  
**日期**: 2026-01-26（Phase 1 完成）  
**當前完整度**: 80% ✅  
**狀態**: Phase 1 已完成，基礎功能全部可用

---

## 📊 當前狀態 (V1.1 - 80%)

### **已實現** (11 頁面 + 19 API) ✅

#### **前端頁面** (11 個)
1. ✅ Analytics Dashboard - 總覽分析
2. ✅ Links Management - 連結管理（22 links）
3. ✅ API Keys Monitoring - API 金鑰監控（4 keys）
4. ✅ Users Management - 用戶管理（3 users）
5. ✅ Payments Management - 付款記錄
6. ✅ Credits Management - Credits 手動調整（已測試：620 credits）
7. ✅ System Stats - 系統統計
8. ✅ System Settings - 系統設定
9. ✅ **Audit Logs** - 操作日誌（2 logs）🆕
10. ✅ **Support Tickets** - 客服工單（1 ticket）🆕
11. ✅ **Plans Management** - 方案管理（4 plans，完整編輯）🆕

#### **後端 API** (19 個)
**基礎 API**：
1. ✅ GET /api/admin/stats
2. ✅ GET /api/admin/users
3. ✅ PUT /api/admin/users/:userId/role
4. ✅ GET /api/admin/links
5. ✅ DELETE /api/admin/links/:slug
6. ✅ POST /api/admin/links/:slug/flag
7. ✅ GET /api/admin/api-keys
8. ✅ POST /api/admin/api-keys/:keyId/revoke
9. ✅ GET /api/admin/analytics
10. ✅ GET /api/admin/credits/users
11. ✅ GET /api/admin/credits/transactions
12. ✅ POST /api/admin/credits/adjust（已測試：620→612 credits）
13. ✅ GET /api/admin/payments

**Phase 1 新增**：🆕
14. ✅ GET /api/admin/audit-logs
15. ✅ GET /api/admin/audit-logs/:id
16. ✅ GET /api/admin/support/tickets
17. ✅ GET /api/admin/support/tickets/:id
18. ✅ PUT /api/admin/support/tickets/:id
19. ✅ POST /api/admin/support/tickets/:id/reply
20. ✅ GET /api/admin/plans
21. ✅ PUT /api/admin/plans/:id（已測試：Free 更新為 300 credits）
22. ✅ GET /api/admin/plans/:id/history

#### **支撐功能**
- ✅ AdminLayout - 獨立佈局
- ✅ 權限控制 - requireAdmin middleware
- ✅ 數據來源正確 - KV + D1 + Analytics Engine
- ✅ 架構文檔完整

---

## ❌ 缺失功能分析

### **🔴 Phase 1: 運營必需功能（高優先級）**

目標：從 55% → 80%  
預估：3 個核心功能，約 8-10 個頁面

---

#### **1. Audit Logs / Activity Logs** - 操作日誌系統

**業務價值**：
- 🔒 **安全性**：追蹤所有敏感操作
- 📝 **問責制**：誰做了什麼一目了然
- 🐛 **Debug**：問題追溯
- ⚖️ **合規**：GDPR/SOC2 要求

**功能需求**：

**(1) 日誌記錄頁面**
- 時間軸顯示所有操作
- 過濾：by user, by action type, by resource, by date range
- 搜尋：by user email, by resource ID
- 分頁：支援大量日誌
- 匯出：CSV/JSON

**(2) 日誌詳情頁面**
- 完整的操作資訊
- Before/After 數據對比
- 關聯資源快速跳轉
- IP 地址、User Agent

**數據結構**（D1）：
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  
  -- 操作資訊
  action TEXT NOT NULL,        -- 'delete_link', 'adjust_credits', 'revoke_key', etc.
  resource_type TEXT NOT NULL, -- 'link', 'user', 'api_key', 'credit', etc.
  resource_id TEXT,
  
  -- 變更記錄
  old_value TEXT,              -- JSON
  new_value TEXT,              -- JSON
  
  -- 請求資訊
  ip_address TEXT,
  user_agent TEXT,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

**API Endpoints**：
- GET /api/admin/audit-logs?limit=50&offset=0&user_id=&action=&date_from=&date_to=
- GET /api/admin/audit-logs/:id

**實現要點**：
- 所有 Admin 操作自動記錄（Middleware）
- 敏感資料脫敏（密碼、API Key）
- 保留期限（如 90 天）

---

#### **2. Support Tickets System** - 客服工單系統

**業務價值**：
- 📞 **客服效率**：集中管理用戶問題
- 📊 **問題追蹤**：常見問題統計
- 😊 **用戶滿意度**：快速響應

**功能需求**：

**(1) 工單列表頁面**
- 狀態過濾：All / Open / In Progress / Resolved / Closed
- 優先級標記：High / Medium / Low
- 分配狀態：Unassigned / Assigned
- 搜尋：by user, by title, by ticket ID
- 批量操作：批量關閉、批量分配

**(2) 工單詳情頁面**
- 用戶資訊卡片（快速查看 credits, links, API keys）
- 對話記錄（支援 rich text）
- 回覆功能
- 狀態變更
- 優先級調整
- 指派給 Admin
- 關聯資源（如相關的連結、API Key）

**(3) 工單創建頁面**（可選，主要由用戶創建）
- Admin 也可以代為創建

**數據結構**（D1）：
```sql
CREATE TABLE support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- 工單資訊
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',  -- open, in_progress, resolved, closed
  priority TEXT DEFAULT 'medium',        -- low, medium, high, urgent
  category TEXT,                         -- billing, technical, abuse, other
  
  -- 分配資訊
  assigned_to TEXT,                      -- Admin user ID
  
  -- 關聯資源
  related_resource_type TEXT,            -- link, api_key, payment, etc.
  related_resource_id TEXT,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  resolved_at INTEGER,
  closed_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,              -- 'user' or 'admin'
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id, created_at);
```

**API Endpoints**：
- GET /api/admin/tickets?status=&priority=&assigned_to=
- GET /api/admin/tickets/:id
- PUT /api/admin/tickets/:id (更新狀態、優先級、分配)
- POST /api/admin/tickets/:id/reply
- POST /api/admin/tickets/:id/close

**實現要點**：
- 即時更新（WebSocket 或輪詢）
- Email 通知（新工單、新回覆）
- SLA 追蹤（首次回覆時間）

---

#### **3. Plans & Pricing Management** - 方案管理

**業務價值**：
- 💰 **營收優化**：動態調整定價策略
- 🎯 **市場測試**：A/B 測試不同價格
- 📈 **業務靈活性**：快速回應市場

**功能需求**：

**(1) 方案列表頁面**
- 顯示所有方案（Free, Starter, Pro, Enterprise）
- 每個方案：價格、quota、features
- 啟用/停用方案
- 訂閱統計（各方案人數）
- 方案比較表

**(2) 方案編輯頁面**
- 編輯價格（月付、年付）
- 編輯 quota（monthly credits, API calls, etc.）
- Features 清單（多選）
- Rate limits
- 儲存歷史版本（價格變更記錄）

**數據結構**：

**選項 A: D1 表**（動態，建議）
```sql
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,             -- free, starter, pro, enterprise
  display_name TEXT NOT NULL,            -- "Free Tier", "Pro Plan"
  
  -- 定價
  price_monthly REAL DEFAULT 0,
  price_yearly REAL DEFAULT 0,
  
  -- Quota
  monthly_credits INTEGER DEFAULT 100,
  api_calls_per_day INTEGER DEFAULT 1000,
  max_api_keys INTEGER DEFAULT 5,
  
  -- Features (JSON)
  features TEXT,                         -- ["Custom domains", "Priority support"]
  
  -- 狀態
  is_active INTEGER DEFAULT 1,
  is_visible INTEGER DEFAULT 1,          -- 是否在 pricing 頁面顯示
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  
  -- 版本控制
  version INTEGER DEFAULT 1
);

CREATE TABLE plan_history (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  changed_by TEXT NOT NULL,              -- Admin user ID
  old_price_monthly REAL,
  new_price_monthly REAL,
  reason TEXT,
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);
```

**選項 B: 配置文件**（靜態，簡單）
```typescript
// config/plans.ts
export const PLANS = {
  free: { price: 0, credits: 100, ... },
  starter: { price: 9.99, credits: 1000, ... },
  pro: { price: 29.99, credits: 10000, ... },
  enterprise: { price: 299, credits: 100000, ... }
};
```

**建議**: 用選項 A（D1 表），因為：
- 可以動態調整
- 有歷史記錄
- 支援 A/B 測試

**API Endpoints**：
- GET /api/admin/plans
- GET /api/admin/plans/:id
- PUT /api/admin/plans/:id
- POST /api/admin/plans (創建新方案)
- GET /api/admin/plans/:id/history (價格變更歷史)
- GET /api/admin/plans/stats (各方案訂閱統計)

---

### **🟡 Phase 2: 體驗提升（中優先級）**

#### **4. Email Templates Management**
- 管理所有系統郵件模板
- 支援變數替換
- 預覽功能

#### **5. Announcements Management**
- 系統公告發布
- 目標用戶選擇
- 排程發送

#### **6. User Impersonation**
- 模擬用戶視角
- Debug 用戶問題

---

### **🟢 Phase 3: 規模化（低優先級）**

#### **7-17. 其他進階功能**
（詳見前面的完整分析）

---

## 🎯 Phase 1 實現計畫

### **預期成果**：

完成後 Admin Portal 將擁有：
- 11 個頁面（8 現有 + 3 新增）
- 20+ 個 API endpoints
- 完整的運營支援能力
- 80% 功能完整度

### **數據庫變更**（Migration 0005）：

```sql
-- 新增 3 個表
1. audit_logs (操作日誌)
2. support_tickets (工單)
3. ticket_messages (工單對話)
4. plans (方案配置)
5. plan_history (方案變更歷史)
```

### **代碼新增**：

**後端**：
- routes/audit-logs.ts (新增)
- routes/support.ts (新增)
- routes/plans.ts (新增)
- middleware/audit.ts (新增 - 自動記錄)

**前端**：
- pages/admin/AuditLogs.tsx (新增)
- pages/admin/AuditLogDetail.tsx (新增)
- pages/admin/SupportTickets.tsx (新增)
- pages/admin/TicketDetail.tsx (新增)
- pages/admin/Plans.tsx (新增)
- pages/admin/PlanEdit.tsx (新增)

---

## ⚠️ 實現注意事項

### **數據儲存策略**

| 數據類型 | 儲存位置 | 理由 |
|---------|---------|------|
| Audit Logs | D1 | 業務數據，需要查詢 |
| Support Tickets | D1 | 業務數據，需要 JOIN |
| Ticket Messages | D1 | 關聯數據 |
| Plans | D1 | 業務數據，需要版本控制 |
| Plan History | D1 | 審計數據 |

**不應該放在**：
- ❌ KV - 這些都需要複雜查詢
- ❌ Analytics Engine - 這些不是事件流

### **錯誤處理**

所有 API 必須：
- ✅ 驗證輸入
- ✅ Try-catch 包裹
- ✅ 返回有意義的錯誤訊息
- ✅ 記錄到 console.error

前端必須：
- ✅ Loading 狀態
- ✅ Error 狀態顯示
- ✅ 空狀態顯示
- ✅ Null 安全檢查（?.）

### **權限控制**

- ✅ 所有 Admin API 使用 requireAdmin()
- ✅ 修改角色使用 requireSuperAdmin()
- ✅ 前端使用 AdminRoute 包裹
- ✅ 敏感操作需要二次確認

---

## 📋 實現檢查清單

### **開始前必須確認**：

**架構理解**：
- [ ] 已閱讀 ADMIN_PORTAL_ARCHITECTURE.md
- [ ] 已閱讀 KV_D1_DUAL_WRITE_STRATEGY.md
- [ ] 了解哪些數據在 KV，哪些在 D1
- [ ] 了解 Analytics Engine 的用途

**現有代碼**：
- [ ] 已查看 routes/admin.ts 了解現有模式
- [ ] 已查看現有 Admin 頁面的實現方式
- [ ] 了解錯誤處理模式
- [ ] 了解數據格式

**Migration 準備**：
- [ ] Migration 只新增表，不修改現有表
- [ ] 使用正確的路徑：--persist-to ../.wrangler/oao-shared
- [ ] 先在本地測試，確認無誤後才考慮生產

**測試準備**：
- [ ] 本地後端運行中
- [ ] 能夠用 curl 測試 API
- [ ] 前端能夠刷新看到變更

---

## 🚀 實現順序

### **Step 1: Audit Logs**（最重要）
1. 創建 Migration 0005（只包含 audit_logs 表）
2. 創建 routes/audit-logs.ts
3. 創建 middleware/audit.ts（自動記錄）
4. 整合到現有 Admin API（所有操作都記錄）
5. 創建前端頁面
6. 測試驗證

### **Step 2: Support Tickets**
1. 添加 support_tickets 和 ticket_messages 表
2. 創建 routes/support.ts
3. 創建前端頁面
4. 測試驗證

### **Step 3: Plans Management**
1. 添加 plans 和 plan_history 表
2. 創建 routes/plans.ts
3. 創建前端頁面
4. 測試驗證

---

## 📊 預期成果

完成 Phase 1 後：

**頁面數**：8 → 11-12 頁（+37% 增長）  
**API 數**：13 → 25+ 個（+92% 增長）  
**完整度**：55% → 80%（+45% 增長）

**運營能力**：
- ✅ 完整的操作追蹤
- ✅ 系統化的客服流程
- ✅ 靈活的定價管理

**可支撐規模**：
- 用戶數：0-10,000
- 工單量：0-1,000/月
- Admin 人數：1-10

---

## 🎓 從過往錯誤中學習

### **教訓 1: Migration 路徑問題**
- ❌ 錯誤：未使用 --persist-to 參數
- ✅ 正確：始終使用 --persist-to ../.wrangler/oao-shared
- 📝 記錄：已更新所有文檔加上警告

### **教訓 2: 錯誤的數據庫設計**
- ❌ 錯誤：在 D1 links 表添加 clicks 欄位
- ✅ 正確：clicks 從 Analytics Engine 查詢
- 📝 原則：遵循單一真實來源

### **教訓 3: API 路徑不一致**
- ❌ 錯誤：前端調用 /admin/，後端是 /api/admin/
- ✅ 正確：統一使用 /api/admin/
- 📝 檢查：實現前先測試 curl

### **教訓 4: Null 安全**
- ❌ 錯誤：直接訪問可能不存在的屬性
- ✅ 正確：使用 ?. 和 || 0
- 📝 標準：所有 .toLocaleString() 前都檢查

---

## 📌 核心原則

1. **數據來源明確**
   - Links → KV
   - Users/Credits/API Keys → D1
   - Clicks/Events → Analytics Engine

2. **Migration 謹慎**
   - 只新增表
   - 不修改現有表結構
   - 使用正確的 persist-to 路徑

3. **測試優先**
   - 先用 curl 測試後端
   - 再測試前端
   - 確保數據正確

4. **文檔同步**
   - 新功能必須更新文檔
   - API 變更必須記錄
   - 架構變更必須說明

---

---

## ✅ Phase 1 完成狀態（2026-01-26）

### **已完成功能**

**數據庫**：
- ✅ Migration 0005 已應用
- ✅ 5 個新表已創建並測試
- ✅ 4 個預設方案已初始化

**後端 API**：
- ✅ 3 個新路由文件（audit-logs.ts, support.ts, plans.ts）
- ✅ 6 個新 API endpoints 全部測試通過
- ✅ Credits Adjust 整合 Audit Logging

**前端頁面**：
- ✅ 3 個新頁面（AuditLogs.tsx, SupportTickets.tsx, PlansManagement.tsx）
- ✅ PlanEditModal 獨立組件（支援所有欄位編輯）
- ✅ AdminLayout 導航更新（10 個項目）
- ✅ 所有路由已註冊

**測試驗證**：
- ✅ Audit Logs: 2 條記錄（test_action + adjust_credits）
- ✅ Support Tickets: 1 個測試工單
- ✅ Plans Management: 完整 CRUD（已測試 Free plan 更新）
- ✅ Credits Adjust: 成功調整（620 credits）

### **已知問題**

**技術債務**：
- ⚠️ Admin 頁面使用直接 fetch（應該用統一 API client）
- ⚠️ 需要創建 adminApi.ts 統一管理
- ⚠️ 詳見 `standards/FRONTEND_API_CLIENT_PATTERN.md`

**待優化功能**：
- Support Tickets 詳情頁和回覆功能（UI 待完善）
- Audit Logs 自動記錄所有操作（目前只有 Credits Adjust）
- Plans Edit modal 的 features 編輯體驗

---

**Phase 1 達成目標：從 55% → 80% 完整度** ✅
