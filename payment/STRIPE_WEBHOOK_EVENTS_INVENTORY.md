# Stripe Webhook 事件完整盤點

**日期**: 2026-01-30  
**目的**: 確保所有必要的 Webhook 事件都有監聽和處理  
**重要性**: ⭐⭐⭐⭐⭐ 核心業務邏輯

---

## ✅ 已實現的事件處理

### 1. `checkout.session.completed` ⭐⭐⭐⭐⭐
**觸發時機**: 用戶首次訂閱成功

**我們的處理**:
- ✅ 更新 `users.stripe_customer_id`
- ✅ 更新 `credits.plan_type`
- ✅ 更新 `credits.stripe_subscription_id`
- ✅ 設定 `subscription_status = 'active'`
- ✅ 發放升級獎勵（如果有）
- ✅ 處理優惠碼獎勵
- ✅ 記錄交易

**Handler**: `handleCheckoutCompleted()`

---

### 2. `invoice.payment_succeeded` ⭐⭐⭐⭐⭐
**觸發時機**: 每月自動扣款成功

**我們的處理**:
- ✅ 重置 `monthly_used = 0`
- ✅ 更新 `monthly_reset_at`
- ✅ 記錄重置交易
- ❌ **不動 balance**（Pool B 永久 credits）

**Handler**: `handlePaymentSucceeded()`

---

### 3. `invoice.payment_failed` ⭐⭐⭐⭐
**觸發時機**: 扣款失敗（信用卡過期、餘額不足）

**我們的處理**:
- ✅ 更新 `subscription_status = 'past_due'`
- ⏳ TODO: 發送郵件通知用戶

**Handler**: `handlePaymentFailed()`

---

### 4. `customer.subscription.updated` ⭐⭐⭐⭐⭐
**觸發時機**: 訂閱任何變更（但降級可能不觸發！）

**我們的處理**:
- ✅ 更新 `subscription_status`
- ✅ 更新 `subscription_current_period_start`
- ✅ 更新 `subscription_current_period_end`
- ✅ 更新 `cancel_at_period_end`
- ✅ 偵測升級/降級並創建 `scheduled_plan_change`
- ✅ 記錄變更類型

**Handler**: `handleSubscriptionUpdated()`

**⚠️ 注意**: 
- 如果使用 Subscription Schedule 降級，可能不會觸發此事件
- 需要同時監聽 `subscription_schedule.*` 事件

---

### 5. `customer.subscription.deleted` ⭐⭐⭐⭐
**觸發時機**: 訂閱被取消（實際刪除時）

**我們的處理**:
- ✅ 更新 `subscription_status = 'canceled'`
- ✅ 清除 `cancel_at_period_end`
- ✅ 清除 `scheduled_plan_change`
- ✅ 記錄取消交易
- ❌ **不立即降級 plan_type**（等到期後由 Cron Job 處理）

**Handler**: `handleSubscriptionDeleted()`

---

### 6. `payment_intent.succeeded` ⭐⭐⭐
**觸發時機**: 一次性支付成功（購買 Credits）

**我們的處理**:
- ✅ 增加 `balance`
- ✅ 增加 `purchased_balance`
- ✅ 增加 `total_purchased`
- ✅ 記錄購買交易

**Handler**: `handlePaymentIntentSucceeded()`

---

### 7. `subscription_schedule.created` ⭐⭐⭐⭐⭐ **新增！**
**觸發時機**: 用戶在 Portal 安排降級或週期變更時

**我們的處理**:
- ✅ 解析 schedule phases
- ✅ 判斷變更類型（downgrade/upgrade/period_change）
- ✅ 創建 `scheduled_plan_change` JSON
- ✅ 更新資料庫

**Handler**: `handleSubscriptionSchedule()`

**為什麼重要**:
```
用戶在 Portal 降級：
├─ Stripe 創建 Subscription Schedule
├─ 觸發 subscription_schedule.created ✅
├─ 不觸發 customer.subscription.updated ⚠️
└─ 必須監聽此事件才能追蹤降級！
```

---

### 8. `subscription_schedule.updated` ⭐⭐⭐⭐
**觸發時機**: Schedule 被修改（用戶取消降級等）

**我們的處理**:
- ✅ 重新解析 schedule phases
- ✅ 更新 `scheduled_plan_change`

**Handler**: `handleSubscriptionSchedule()`（共用）

---

## 📊 事件處理流程圖

### 首次訂閱流程

```
用戶完成付款
    ↓
checkout.session.completed
    ↓
handleCheckoutCompleted()
    ↓
- 更新 plan_type
- 更新 stripe_subscription_id
- 發放獎勵
```

### 每月續費流程

```
Stripe 自動扣款
    ↓
invoice.payment_succeeded
    ↓
handlePaymentSucceeded()
    ↓
- 重置 monthly_used = 0
- 記錄重置交易
```

### 降級流程（關鍵！）

```
用戶在 Portal 降級
    ↓
Stripe 創建 Subscription Schedule
    ↓
subscription_schedule.created ✅
    ↓
handleSubscriptionSchedule()
    ↓
- 解析 future phase
- 創建 scheduled_plan_change
- 前端顯示提示
    ↓
到期日當天
    ↓
customer.subscription.updated
    ↓
handleSubscriptionUpdated()
    ↓
- 實際變更 plan_type
- 清除 scheduled_plan_change
```

### 取消訂閱流程

```
用戶在 Portal 取消
    ↓
customer.subscription.updated
    ↓
- cancel_at_period_end = true
    ↓
到期日當天
    ↓
customer.subscription.deleted
    ↓
handleSubscriptionDeleted()
    ↓
- 標記為 canceled
- 等待 Cron Job 降級
```

---

## 🔧 Webhook 配置檢查清單

### Stripe Dashboard 設定

必須在 **Dashboard → Developers → Webhooks** 中監聽以下事件：

#### **核心事件（必須）**
- [x] `checkout.session.completed`
- [x] `invoice.payment_succeeded`
- [x] `invoice.payment_failed`
- [x] `customer.subscription.updated`
- [x] `customer.subscription.deleted`
- [x] `payment_intent.succeeded`

#### **排程事件（關鍵！）**
- [x] `subscription_schedule.created` ⭐ **2026-01-30 新增**
- [x] `subscription_schedule.updated` ⭐ **2026-01-30 新增**
- [ ] `subscription_schedule.released`（Optional）
- [ ] `subscription_schedule.canceled`（Optional）

#### **其他有用事件（建議）**
- [ ] `invoice.created`
- [ ] `invoice.finalized`
- [ ] `customer.created`
- [ ] `customer.updated`

---

## 📝 各事件的數據欄位

### checkout.session.completed
```typescript
session.metadata.user_id          // 用戶 ID
session.metadata.plan_type        // 方案類型
session.metadata.billing_period   // 計費週期
session.metadata.promo_code       // 優惠碼
session.metadata.bonus_credits    // 獎勵 credits
session.customer                  // Stripe Customer ID
session.subscription              // Stripe Subscription ID
```

### subscription_schedule.created/updated
```typescript
schedule.id                       // Schedule ID
schedule.subscription             // 關聯的訂閱 ID
schedule.phases[]                 // 階段陣列
  - phases[0]                     // 當前階段
  - phases[1]                     // 未來階段（降級目標）
schedule.phases[1].items[0].price // 新的價格 ID
schedule.phases[1].start_date     // 生效時間（Unix timestamp）
```

### customer.subscription.updated
```typescript
subscription.id                   // 訂閱 ID
subscription.status               // 狀態
subscription.cancel_at_period_end // 是否安排取消
subscription.current_period_start // 當期開始
subscription.current_period_end   // 當期結束
subscription.items.data[0].price.id // 價格 ID
subscription.schedule             // 關聯的 Schedule ID（如果有）
```

---

## 🎯 如何在 Stripe Dashboard 查看

### 查看降級資訊

**方法 1: Subscriptions 頁面**
```
1. Dashboard → Billing → Subscriptions
2. 點擊訂閱進入詳情
3. 查看是否有 "Scheduled changes" 區塊
4. 或查看 "Schedule" 欄位（如果有附加 schedule）
```

**方法 2: Subscription Schedules**
```
1. Dashboard → Billing → Subscription schedules
2. 篩選 Status: "Active"
3. 查看 scheduled phases
```

**方法 3: 訂閱詳情 JSON**
```
1. 在訂閱詳情頁面
2. 點擊右上角 "View as JSON"
3. 查找 "schedule" 欄位
4. 如果有值（如 "sub_sched_xxx"），點擊進入查看詳情
```

---

## ⚠️ 常見問題

### Q: 為什麼降級不觸發 customer.subscription.updated？

**A**: 因為 Stripe 使用 Subscription Schedule：
- 降級時創建 Schedule（觸發 `subscription_schedule.created`）
- 訂閱本身還沒變更（不觸發 `customer.subscription.updated`）
- 到期日當天 Schedule 生效才會觸發

### Q: scheduled_plan_change 為什麼是 "null" 字串？

**A**: SQLite 的 JSON 處理問題：
```typescript
// ❌ 錯誤
scheduledChange ? JSON.stringify(scheduledChange) : null

// ✅ 正確
scheduledChange ? JSON.stringify(scheduledChange) : NULL
```

但更好的做法是在前端正確處理：
```typescript
const change = result.scheduled_plan_change;
if (change && change !== 'null' && change !== 'NULL') {
  const parsed = JSON.parse(change);
}
```

### Q: 如何測試 Subscription Schedule？

**A**: 使用 Stripe CLI：
```bash
# 創建測試 schedule
stripe trigger subscription_schedule.created

# 或在 Portal 中實際操作降級
```

---

## 🔍 除錯指南

### 降級沒有追蹤到？

**檢查清單**:
1. Webhook 端點是否監聽 `subscription_schedule.created`？
2. `stripe_events` 表中是否有此事件記錄？
3. 事件是否成功處理（`processed = 1`）？
4. `scheduled_plan_change` 欄位是否有值？

**SQL 查詢**:
```sql
-- 檢查最近的 schedule 事件
SELECT * FROM stripe_events 
WHERE event_type LIKE '%schedule%' 
ORDER BY created_at DESC 
LIMIT 5;

-- 檢查 scheduled_plan_change
SELECT user_id, scheduled_plan_change 
FROM credits 
WHERE scheduled_plan_change IS NOT NULL 
  AND scheduled_plan_change != 'null';
```

---

## 📚 相關文件

- `/payment/SUBSCRIPTION_STATUS_UI_DESIGN.md` - UI 設計
- `/payment/STRIPE_INTEGRATION_GUIDE.md` - 整合指南
- `/SUBSCRIPTION_STATUS_IMPLEMENTATION.md` - 實施報告

---

## ✅ 檢查清單

### Stripe Dashboard 配置
- [x] Webhook 端點已設定
- [x] 監聽 `checkout.session.completed`
- [x] 監聽 `invoice.payment_succeeded`
- [x] 監聽 `customer.subscription.*`
- [x] 監聽 `subscription_schedule.created` ⭐ **必須**
- [x] 監聽 `subscription_schedule.updated` ⭐ **必須**

### 代碼實現
- [x] `handleCheckoutCompleted()` - 首次訂閱
- [x] `handlePaymentSucceeded()` - 每月續費
- [x] `handlePaymentFailed()` - 扣款失敗
- [x] `handleSubscriptionUpdated()` - 訂閱變更
- [x] `handleSubscriptionDeleted()` - 訂閱取消
- [x] `handlePaymentIntentSucceeded()` - 購買 Credits
- [x] `handleSubscriptionSchedule()` - 安排降級 ⭐ **2026-01-30 新增**

### 測試
- [ ] 本地測試所有事件
- [ ] 驗證資料庫更新正確
- [ ] 前端顯示正確

---

**最後更新**: 2026-01-30  
**維護者**: 開發團隊  
**狀態**: 已補全 Subscription Schedule 監聽

🎯 **降級追蹤現在應該完整了！**
