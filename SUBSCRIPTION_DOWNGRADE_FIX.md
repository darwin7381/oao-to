# 訂閱降級追蹤修復報告

**日期**: 2026-01-30  
**問題**: 降級後 UI 沒有顯示 scheduled change  
**根本原因**: 沒有監聽 Stripe Subscription Schedule 事件  
**狀態**: ✅ 已修復

---

## 🔍 問題診斷

### 發現的問題

1. **Webhook 缺失** ❌
   - 沒有監聽 `subscription_schedule.created`
   - 沒有監聽 `subscription_schedule.updated`
   - Stripe 降級是通過 Schedule 實現，不會觸發 `customer.subscription.updated`

2. **Billing Period 切換邏輯錯誤** ❌
   - Monthly ↔ Yearly 切換時顯示 "Current Plan"
   - 無法切換計費週期

3. **UI 組件設計錯誤** ❌
   - 創建了重複的組件
   - 沒有融入現有設計

---

## ✅ 已完成的修復

### 1. Webhook 事件監聽 (100%)

**新增監聽**:
```typescript
case 'subscription_schedule.created':
case 'subscription_schedule.updated':
  await handleSubscriptionSchedule(c.env, event.data.object);
  break;
```

**新增處理函數**: `handleSubscriptionSchedule()`
- 解析 schedule phases
- 判斷變更類型（downgrade/period_change/upgrade）
- 創建 scheduled_plan_change JSON
- 更新資料庫

**檔案**: `api-worker/src/routes/stripe-webhook.ts`

---

### 2. Pricing 頁面邏輯修復 (100%)

**更新 getPlanAction()**:
```typescript
// 如果是相同方案但不同週期
if (currentOrder === targetOrder) {
  if (currentBillingPeriod !== billingPeriod) {
    return { 
      text: 'Switch to Yearly', // 或 Monthly
      action: 'switch_period' 
    };
  }
  return { text: 'Current Plan', action: 'current' };
}
```

**更新 handlePlanAction()**:
- 處理 `switch_period` action
- 跳轉到 Customer Portal

**檔案**: `frontend/src/pages/Pricing.tsx`

---

### 3. UI 組件設計修復 (100%)

**移除重複組件**:
- ❌ SubscriptionStatusCard（獨立大卡片）
- ❌ ScheduledChangeAlert（獨立組件）

**融入現有設計**:
- ✅ Credits 頁面：在 Current Plan 卡片頂部添加小橫幅
- ✅ Pricing 頁面：在目標方案卡片顯示提示

**檔案**: 
- `frontend/src/pages/dashboard/Credits.tsx`
- `frontend/src/pages/Pricing.tsx`

---

## 📊 Stripe 降級機制解析

### Stripe 如何處理降級

```
用戶在 Portal 降級：
    ↓
Stripe 創建 Subscription Schedule
├─ Phase 0: 當前方案（到期前）
└─ Phase 1: 新方案（到期後）
    ↓
觸發 Webhook: subscription_schedule.created
    ↓
我們的處理:
├─ 解析 Phase 1 的價格 ID
├─ 查詢對應的方案類型
├─ 創建 scheduled_plan_change JSON
└─ 儲存到資料庫
    ↓
前端查詢並顯示提示
```

### 如何在 Stripe 查看降級

**方法 1: 訂閱詳情**
```
Dashboard → Billing → Subscriptions
→ 點擊訂閱
→ 查看 "Schedule" 欄位
→ 如果有 Schedule ID (sub_sched_xxx)，點擊查看
```

**方法 2: Subscription Schedules**
```
Dashboard → Billing → Subscription schedules
→ 篩選 Status: Active
→ 查看 Phases 和生效日期
```

**方法 3: 訂閱 JSON**
```
訂閱詳情頁 → 右上角 "..." → View as JSON
→ 查找 "schedule" 欄位
→ 如果有值，表示有安排的變更
```

---

## 🎯 現在的完整流程

### 降級流程（完整）

```
1. 用戶點擊 Downgrade
   ↓
2. 跳轉到 Stripe Portal
   ↓
3. 選擇新方案（如 Starter）
   ↓
4. 確認變更
   ↓
5. Stripe 創建 Schedule
   ↓
6. Webhook: subscription_schedule.created
   ↓
7. handleSubscriptionSchedule():
   - 解析 future phase
   - 創建 scheduled_plan_change
   - 保存到資料庫
   ↓
8. 用戶返回網站
   ↓
9. 前端查詢 /api/subscription/status
   ↓
10. 顯示 UI:
    Pricing 頁面:
    - Starter 卡片頂部: "📅 SCHEDULED"
    - Pro 卡片: "⚠️ → Starter on Feb 15"
    
    Credits 頁面:
    - Current Plan 卡片頂部: "⚠️ → Starter on 2/15"
    - [Cancel change] 連結
```

### Monthly ↔ Yearly 切換

```
1. 用戶在 Yearly 頁籤
2. 看到 Starter 卡片
3. 按鈕顯示: "Switch to Yearly"（不是 Current Plan）
4. 點擊 → Portal → 切換週期
5. Webhook: subscription_schedule.created
6. scheduled_plan_change.type = 'period_change'
7. UI 顯示: "⚠️ Switching to Yearly on Feb 15"
```

---

## 📁 修改的檔案

### 後端 (2 個)

```
api-worker/src/routes/
├── stripe-webhook.ts ✅ 
│   └── 新增 handleSubscriptionSchedule()
└── checkout.ts ✅
    └── 修復 customer mismatch + 恢復 flow_data
```

### 前端 (2 個)

```
frontend/src/pages/
├── Pricing.tsx ✅
│   ├── 修復 billing period 切換邏輯
│   └── 在目標方案卡片顯示 SCHEDULED 徽章
└── dashboard/Credits.tsx ✅
    └── 在 Current Plan 卡片添加小提示
```

### 文件 (2 個)

```
payment/
├── STRIPE_WEBHOOK_EVENTS_INVENTORY.md ✅ (新建)
│   └── 完整的 Webhook 事件盤點
└── SUBSCRIPTION_STATUS_UI_DESIGN.md ✅ (已存在)
    └── UI/UX 設計方案
```

---

## 🧪 測試步驟

### 測試降級追蹤

1. **在 Stripe Portal 降級**
   - 從 Pro 降到 Starter
   
2. **檢查資料庫**
   ```bash
   wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared \
     --command="SELECT scheduled_plan_change FROM credits WHERE user_id = 'YOUR_ID'"
   ```
   應該看到 JSON 內容（不是 "null"）

3. **檢查前端**
   - Pricing 頁面：Starter 卡片頂部應有 "📅 SCHEDULED"
   - Credits 頁面：Current Plan 卡片應有小提示

### 測試週期切換

1. **在 Pricing 頁面切換到 Yearly**
2. **點擊當前方案的按鈕**
   - 應顯示 "Switch to Yearly"（不是 Current Plan）
3. **點擊後跳轉到 Portal**
4. **完成切換**
5. **檢查 UI 顯示**

---

## ⚠️ 重要注意事項

### Stripe Dashboard Webhook 配置

**必須添加這兩個事件**:
```
Dashboard → Developers → Webhooks → Edit endpoint

Events to send:
✅ checkout.session.completed
✅ invoice.payment_succeeded
✅ invoice.payment_failed
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ payment_intent.succeeded
✅ subscription_schedule.created     ⭐ 必須！
✅ subscription_schedule.updated    ⭐ 必須！
```

**如果沒有添加這兩個事件，降級追蹤不會工作！**

---

## 🎯 如何驗證降級成功

### 在 Stripe Dashboard

**方法 1: Subscriptions 列表**
```
1. Billing → Subscriptions
2. 找到你的訂閱
3. Status 欄位應顯示 "Active"
4. 點擊進入詳情
```

**方法 2: 訂閱詳情頁**
```
1. 進入訂閱詳情
2. 查看 "Schedule" 欄位
3. 如果有值（如 sub_sched_xxx），表示有安排的變更
4. 點擊 Schedule ID 查看詳情
```

**方法 3: Subscription Schedules 頁面**
```
1. Billing → Subscription schedules
2. 篩選 Status: "Active"
3. 查看你的 schedule
4. 看 Phases 欄位：
   - Phase 1: Current (Pro Plan)
   - Phase 2: Scheduled (Starter Plan, starts Feb 15)
```

---

## ✅ 完成檢查清單

- [x] 添加 subscription_schedule 事件監聽
- [x] 實現 handleSubscriptionSchedule()
- [x] 修復 Pricing 頁面 billing period 邏輯
- [x] 整合 UI 提示到現有設計
- [x] 創建 Webhook 事件盤點文件
- [ ] 在 Stripe Dashboard 添加 schedule 事件
- [ ] 測試降級流程
- [ ] 測試週期切換
- [ ] 驗證 UI 顯示正確

---

**下一步**: 請在 Stripe Dashboard 添加 schedule 事件到 Webhook，然後重新測試降級！
