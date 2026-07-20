# Payment System 完整審計報告

**審計日期**: 2026-02-13  
**審計範圍**: 所有 payment/subscription 相關的後端程式碼  
**結論**: 發現 5 個嚴重問題、3 個高優先級問題、多個中優先級問題

---

## 🔴 嚴重問題（必須立刻修復）

### C1. SQL Injection 漏洞 — admin set-plan
**檔案**: `api-worker/src/routes/admin.ts`  
**位置**: set-plan endpoint  
**問題**: 使用 string interpolation 構建 SQL，例如 `` `plan_type = '${planType}'` ``  
**風險**: 如果 planType 包含惡意 SQL，可以直接操作資料庫  
**修復**: 改用 parameterized query（`.bind()` 傳值）

### C2. SQL Injection 漏洞 — admin links
**檔案**: `api-worker/src/routes/admin.ts`  
**位置**: `/admin/links` endpoint  
**問題**: `` `SELECT ... WHERE id IN (${userIdsStr})` `` 使用字串拼接  
**風險**: 同 C1

### C3. 升級後 plan_type 未更新
**檔案**: `api-worker/src/routes/stripe-webhook.ts`  
**位置**: `handleSubscriptionUpdated()` 函數  
**問題**: 偵測到 `isUpgrade` 後，只更新了 `last_plan_change_type` 和 `last_plan_change_at`，**沒有更新 `plan_type` 和 `billing_period`**  
**影響**: 透過 Stripe Portal 升級的方案不會反映在我們的 DB 裡。只有 `checkout.session.completed` 才會更新 plan_type  
**修復**: 在 isUpgrade 分支中加入 `plan_type = ?` 和 `billing_period = ?`

### C4. 取消訂閱後 plan_type 永遠不會降為 free
**檔案**: `api-worker/src/routes/stripe-webhook.ts`  
**位置**: `handleSubscriptionDeleted()` 函數  
**問題**: 設定 `subscription_status = 'canceled'` 但不動 `plan_type`。程式碼註解寫「由 cron job 處理」，但我們**沒有 cron job**  
**影響**: 用戶取消訂閱後，永遠保留付費方案的額度  
**修復**: Stripe 在 period end 才發 `subscription.deleted`，所以此時可以直接 `plan_type = 'free'`

### C5. plans.ts 未定義變數
**檔案**: `api-worker/src/routes/plans.ts`  
**位置**: 第 106-107 行  
**問題**: 使用 `userEmail` 和 `userRole` 但未從 `c.get()` 取得  
**影響**: 更新方案時會拋出 runtime error  
**修復**: 加入 `const userEmail = c.get('userEmail'); const userRole = c.get('userRole');`

---

## 🟡 高優先級問題

### H1. Admin set-plan 不同步 Stripe
**問題**: 管理員改方案只改 DB，不動 Stripe。Stripe 會繼續收舊方案的錢，下次 webhook 會覆蓋修改  
**正規做法**: 
- 有 Stripe 訂閱 → 呼叫 `stripe.subscriptions.update()` with `proration_behavior: 'none'`，讓 webhook 自動同步 DB
- 無 Stripe 訂閱 → 直接改 DB（用於 VIP/測試用途），考慮加 `plan_override` 欄位

### H2. handleCheckoutCompleted 的 race condition
**檔案**: `api-worker/src/routes/stripe-webhook.ts`  
**問題**: 先 UPDATE plan_type，再 SELECT 讀 currentCredits，讀到的是新 plan_type 而非舊的  
**影響**: 交易紀錄的 `from_plan` 可能是錯的  
**修復**: 在 UPDATE 前先 SELECT 舊資料

### H3. cancel-scheduled-change 可能失敗
**檔案**: `api-worker/src/routes/subscription.ts`  
**問題**: 查詢 `stripe_customer_id` 時如果用戶沒有，會拋出未處理的錯誤  
**修復**: 加入 null check

---

## 🟢 中優先級問題

### M1. monthly_used 在方案變更時不調整
**問題**: `handleSubscriptionUpdated` 不動 `monthly_used`。如果用戶降級後 `monthly_used > new_quota`，會顯示負數  
**建議**: 升級時不動，降級時 cap 到新額度

### M2. checkout.ts 使用 customer_email 而非 customer ID
**問題**: `stripe.checkout.sessions.create()` 使用 `customer_email` 而非先查找/建立 customer。可能建立重複的 Stripe Customer  
**建議**: 先呼叫 `getOrCreateCustomer()`，用 `customer` 參數

### M3. Stripe API 呼叫缺少 error handling
**位置**: 多個檔案  
**問題**: 多處 Stripe API 呼叫沒有獨立的 try/catch  
**影響**: API 失敗時錯誤訊息不明確

### M4. 硬編碼的 free plan quota
**位置**: stripe-webhook.ts 多處 `|| 100`  
**問題**: Free plan quota 硬編碼為 100，應該從 plans 表查詢  
**影響**: 如果 plans 表裡 free plan 的 quota 改了，webhook 不會跟著變

### M5. SubscriptionStatus type 不完整
**位置**: types.ts  
**問題**: 缺少 `trialing`、`incomplete`、`paused` 等 Stripe 狀態  

---

## 🏗️ 設計層面的差距

### D1. Stripe 不是完全的 truth source
**現況**: `checkout.session.completed` 更新 plan_type，但 `subscription.updated` 不更新  
**正規做法**: 所有方案相關的變更都應從 Stripe 事件同步，DB 是 Stripe 的 read-only replica  

### D2. 沒有 cron job 但 code 依賴 cron job
**現況**: `subscription.deleted` 不降級 plan_type，依賴不存在的 cron job  
**正規做法**: 要嘛在 `subscription.deleted` 直接降級（推薦），要嘛實作 cron job

### D3. Admin 操作未定義清楚的模式
**需要決定**: Admin 改方案時的標準流程是什麼？（見上方 H1）

---

## 各 Webhook Handler 的行為對照表

| 欄位 | checkout.completed | invoice.succeeded | sub.updated (upgrade) | sub.updated (downgrade) | sub.deleted | admin set-plan |
|------|-------------------|-------------------|----------------------|------------------------|-------------|---------------|
| plan_type | ✅ 更新 | — | ❌ 不動 | ❌ 不動(記scheduled) | ❌ 不動 | ✅ 更新 |
| billing_period | ✅ 更新 | — | ❌ 不動 | ❌ 不動 | — | ✅ 更新 |
| monthly_used | — | ✅ 重置=0 | — | — | — | ✅ 重置=0 |
| balance | +bonus | — | — | — | — | — |
| subscription_status | ✅ active | — | ✅ 更新 | ✅ 更新 | ✅ canceled | ✅/NULL |
| scheduled_plan_change | NULL | — | — | ✅ 設定 | NULL | NULL |
| cancel_at_period_end | 0 | — | ✅ 更新 | ✅ 更新 | 0 | 0 |
| Stripe 同步 | ✅(由Stripe觸發) | ✅ | ✅ | ✅ | ✅ | ❌ 無 |

---

## 修復優先順序建議

1. **C1+C2**: SQL Injection 修復（安全性）
2. **C3**: subscription.updated 升級時更新 plan_type
3. **C4**: subscription.deleted 降級 plan_type 到 free
4. **C5**: plans.ts 未定義變數
5. **H1**: Admin set-plan Stripe 同步
6. **H2**: checkout completed race condition
7. **M2**: checkout 使用 customer ID 避免重複

---

**下次修改前請參考此文件，確保修復不會引入新問題**
