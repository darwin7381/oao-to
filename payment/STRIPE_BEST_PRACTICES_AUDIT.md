# Stripe Integration Audit Report
**Date:** 2026-03-12
**Based on:** Stripe Best Practices Skill + Official Documentation
**Scope:** `api-worker/src/routes/checkout.ts`, `stripe-webhook.ts`, `subscription.ts`, `utils/stripe.ts`

---

## 總覽評分

| 面向 | 評分 | 說明 |
|------|------|------|
| API 選擇 | ✅ 良好 | 正確使用 Checkout Sessions + Billing API |
| Webhook 安全 | ✅ 良好 | 簽名驗證、冪等性處理完整 |
| 訂閱生命週期 | ⚠️ 部分 | 取消後降級缺少 Cron Job |
| 客戶管理 | ⚠️ 問題 | Customer ID 不一致，有已知 mismatch bug |
| 優惠碼實作 | ⚠️ 問題 | 自建 Coupon 方式有汙染問題 |
| 一次性付款 | ⚠️ 問題 | 重複處理風險 |
| API 版本 | ⚠️ 過舊 | `2024-11-20.acacia` 應更新 |
| 前端文案準確性 | ❌ 問題 | FAQ 說明與實際行為不符 |

---

## 優點（做得好的地方）

### 1. 正確使用 Checkout Sessions ✅
符合 Stripe 最佳實踐首選。訂閱用 `mode: 'subscription'`，一次性用 `mode: 'payment'`，清楚分離。

### 2. Webhook 簽名驗證 ✅
使用 `constructEventAsync`（Cloudflare Workers 專用的非同步版本），正確且安全。

### 3. 冪等性處理 ✅
`stripe_events` 表 + 處理中狀態追蹤，防止同一事件被處理兩次。設計完整。

### 4. 環境分離 ✅
Test/Production API Keys 和 Webhook Secrets 分開管理，不會混用。

### 5. Customer Portal 整合 ✅
降級和週期切換走 Customer Portal，讓 Stripe 處理複雜的 proration 邏輯，設計正確。

### 6. Subscription Schedule 追蹤 ✅
透過 `subscription_schedule.created/updated` 事件追蹤 Portal 安排的降級，DB 記錄 `scheduled_plan_change` JSON，設計細心。

---

## 問題與建議

### 🔴 高優先級

#### 問題 1：Checkout 沒有傳入 Stripe Customer ID
**位置：** `checkout.ts:151`

```typescript
// 現在的做法：
const session = await stripe.checkout.sessions.create({
  customer_email: userEmail,  // ❌ 只傳 email
  ...
});
```

**問題：** 每次 Checkout 用 `customer_email` 而非 `customer` ID，Stripe 可能創建多個 Customer 物件對應同一個用戶。這正是 `checkout.ts:242` 裡那段 customer mismatch 修補邏輯的根本原因。

**建議：**
```typescript
// 先查詢或建立 Customer，再傳入 ID：
const customer = await getOrCreateCustomer(stripe, userId, userEmail, userName);
const session = await stripe.checkout.sessions.create({
  customer: customer.id,  // ✅ 傳入 Customer ID
  // 移除 customer_email
  ...
});
```

這樣可以確保 Stripe 裡的 Customer 與 DB 裡的 user 是 1:1 對應，並且方便後續查詢訂閱歷史。

---

#### 問題 2：Credits 一次性購買有重複處理風險
**位置：** `stripe-webhook.ts:90-92` 和 `checkout.ts:341-371`

```typescript
// webhook 同時處理：
case 'checkout.session.completed':   // 訂閱用
case 'payment_intent.succeeded':     // Credits 用？
```

**問題：** 訂閱的每次扣款也會觸發 `payment_intent.succeeded`。目前靠 `purchase_type: 'credits'` 的 metadata 過濾，但這個 metadata 是設在 `payment_intent_data.metadata` 裡，需要確認每次訂閱更新不會意外帶入此 metadata。

另外，Credits 購買 `checkout.session.completed` 不會做任何事（因為 `plan_type` 是 `undefined`），完全依賴 `payment_intent.succeeded`。這是脆弱的設計。

**建議：** Credits 購買也應在 `checkout.session.completed` 裡處理（可以用 `session.metadata.purchase_type === 'credits'` 判斷），完全不依賴 `payment_intent.succeeded`，因為後者會對所有 PaymentIntent 觸發。

---

#### 問題 3：取消後降級缺少 Cron Job
**位置：** `stripe-webhook.ts:626`

```typescript
// 注意：不立即降級 plan_type，等到期後再降級（由 cron job 處理）
```

`handleSubscriptionDeleted` 只設定 `subscription_status = 'canceled'`，但 `plan_type` 不變。用戶訂閱到期後仍保有付費方案的配額，直到 cron job 執行。但 cron job **目前不存在**。

**建議：** 需要實作 Cloudflare Workers Cron Trigger，定期掃描 `subscription_status = 'canceled'` 且 `subscription_current_period_end < now()` 的用戶，將其降回 Free plan 並重置配額。

---

### 🟡 中優先級

#### 問題 4：自建 Coupon 汙染 Stripe Dashboard
**位置：** `checkout.ts:115-132`

```typescript
const couponId = `${promoCode}_${userId}_${Date.now()}`;
await stripe.coupons.create({ id: couponId, ... });
```

**問題：** 每次有人使用優惠碼都會在 Stripe Dashboard 創建一個新的 Coupon 物件。使用量大時會有成千上萬個 Coupon，Dashboard 難以管理。

**建議：** 改用 Stripe 官方的 **Promotion Code** 方案：
1. 在 Stripe Dashboard 預先建立 Coupon（例如 `PROMO_10_OFF`）
2. 用 `stripe.promotionCodes.create({ coupon: couponId, code: 'YOUR_CODE' })` 建立對應的 Promotion Code
3. Checkout Session 改用 `allow_promotion_codes: true`，或直接傳入 `discounts: [{ promotion_code: promoCodeId }]`

這樣 Stripe Dashboard 裡的 Coupon 數量保持乾淨，使用統計也由 Stripe 原生管理。

---

#### 問題 5：`invoice.payment_succeeded` 首次訂閱可能重複處理
**位置：** `stripe-webhook.ts:74-75`

`checkout.session.completed` 已更新 DB 訂閱狀態。但訂閱建立後 Stripe 也會立即發送 `invoice.payment_succeeded`（`billing_reason: 'subscription_create'`），`handlePaymentSucceeded` 就會再次重置月配額（雖然剛建立用量是 0，結果一樣，但在邏輯上是多餘的）。

**建議：** 在 `handlePaymentSucceeded` 加入 billing_reason 判斷：

```typescript
if (invoice.billing_reason === 'subscription_create') {
  // 首次訂閱已由 checkout.session.completed 處理
  console.log('Skipping subscription_create invoice - handled by checkout.session.completed');
  return;
}
```

---

#### 問題 6：Stripe API 版本過舊
**位置：** `utils/stripe.ts:20`

```typescript
apiVersion: '2024-11-20.acacia',
```

截至 2026 年，此版本已超過一年，Stripe 可能已有新版本包含 bug 修正和新功能。

**建議：** 更新到最新 API 版本，並查閱 [Stripe Changelog](https://stripe.com/docs/upgrades) 確認 breaking changes。

---

#### 問題 7：缺少重要 Webhook 事件處理
**位置：** `stripe-webhook.ts:69-103`

目前未處理的重要事件：

| 事件 | 原因重要 |
|------|---------|
| `invoice.payment_action_required` | SCA/3D Secure 需要用戶操作時 |
| `charge.dispute.created` | 有人對付款發起爭議時，應鎖定帳戶 |
| `customer.subscription.trial_will_end` | 如果未來加入試用期功能 |
| `invoice.upcoming` | 可提前通知用戶即將扣款 |
| `radar.early_fraud_warning.created` | 詐騙偵測 |

---

### 🟢 低優先級 / 建議改善

#### 問題 8：Webhook 錯誤不重試
**位置：** `stripe-webhook.ts:114-125`

```typescript
} catch (err) {
  // 仍然返回 200，讓 Stripe 不要重試
}
```

這是一個設計取捨。目前的設計是「寧可漏掉，不要重複處理」。但如果是暫時性錯誤（DB 超時、網路問題），就會永久失去這個事件。

**建議：** 針對不同錯誤類型區分處理：
- 暫時性錯誤（DB 連線失敗）：回傳 `500`，讓 Stripe 重試
- 業務邏輯錯誤（用戶不存在）：記錄後回傳 `200`，人工處理
- 可以在 `stripe_events` 表加入 `retry_count` 欄位追蹤

---

#### 問題 9：前端 FAQ 文案與實際行為不符
**位置：** `frontend/src/pages/Pricing.tsx:576-580`

```
"Upgrade or downgrade anytime. Changes take effect immediately, and we'll prorate any payments."
```

**問題：**
- 升級：確實立即生效 ✅
- 降級：實際上需等到週期結束才生效（走 Customer Portal），不是「immediately」❌
- Proration：只有升級時 Stripe 會 prorate，降級是等到期 ❌

**建議：** 改為：
> "Upgrade anytime — changes take effect immediately with prorated billing. Downgrade or cancel at any time; your current plan stays active until the end of your billing period."

---

#### 問題 10：Credits 購買未關聯 Stripe Customer
**位置：** `checkout.ts:341`

`/api/checkout/credits` 使用 `customer_email` 而非 Customer ID，導致一次性購買記錄在 Stripe Dashboard 裡無法與訂閱記錄對應到同一個 Customer。

**建議：** 同問題 1，查詢 / 建立 Customer 後傳入 `customer: customerId`。

---

#### 問題 11：`handleSubscriptionSchedule` 使用 `any` 型別
**位置：** `stripe-webhook.ts:98, 688`

```typescript
await handleSubscriptionSchedule(c.env, event.data.object as any);
```

**建議：** 改為 `Stripe.SubscriptionSchedule`，獲得完整型別安全。

---

## Go Live 檢查清單（對應官方 [Go Live Checklist](https://docs.stripe.com/get-started/checklist/go-live.md)）

| 項目 | 狀態 |
|------|------|
| Webhook 簽名驗證 | ✅ 完成 |
| 使用 Live API Key（非 Test） | ⬜ 需確認環境變數已設定 |
| Webhook endpoint 已在 Stripe Dashboard 註冊 | ⬜ 需確認 |
| 所有需要的 Webhook 事件已訂閱 | ⚠️ 部分缺失（見問題 7） |
| 錯誤通知機制 | ⚠️ 只有 console.error，沒有 alerting |
| Radar 詐騙規則 | ⬜ 未設定 |
| 客戶 Email 通知（付款失敗等） | ❌ 有 TODO 但未實作 |
| 取消後降級 Cron Job | ❌ 未實作 |
| HTTPS only | ✅ 透過 Cloudflare |

---

## 優先修復建議排序

1. **立即修復（影響資料正確性）**
   - 問題 3：實作 Cron Job 降級邏輯（不然付費方案取消後永遠不會真的降級）
   - 問題 1：Checkout 傳入 Customer ID（解決 mismatch 根本原因）

2. **近期修復（影響業務邏輯）**
   - 問題 2：Credits 購買用 `checkout.session.completed` 處理
   - 問題 5：跳過 `subscription_create` 的 invoice 重置
   - 問題 9：前端文案修正（避免用戶誤解）

3. **長期改善（影響可維護性）**
   - 問題 4：Coupon 改為 Promotion Code
   - 問題 6：更新 API 版本
   - 問題 7：補足缺少的 Webhook 事件
   - 問題 8：Webhook 錯誤重試策略

---

*Generated by `/stripe:stripe-best-practices` + code analysis*
