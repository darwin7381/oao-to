# Stripe 設定指南

**目的**：從零開始設定 Stripe 整合  
**預計時間**：30-60 分鐘  
**日期**：2026-01-28

---

## 📋 前置準備檢查清單

在開始之前，確保：
- [ ] 已安裝 `stripe` npm package（已完成）
- [ ] 已執行 Migration 0007（見下方）
- [ ] 有 Stripe 帳號（未完成的話先去註冊）

---

## 步驟 1：註冊和設定 Stripe 帳號

### 1.1 註冊 Stripe
1. 前往 [stripe.com](https://stripe.com)
2. 點擊「Start now」註冊帳號
3. 使用你的 Email 註冊
4. **重要**：先使用測試模式（Test Mode）開發

### 1.2 啟用測試模式
1. 登入 Stripe Dashboard
2. 左上角確認是「Test mode」（有橙色標籤）
3. 如果是「Live mode」，點擊切換到「Test mode」

---

## 步驟 2：執行資料庫 Migration

```bash
# 在 api-worker 目錄
cd /Users/JL/Development/media/oao_to/api-worker

# 執行 Migration（本地開發）
wrangler d1 execute oao-to-db --local --file=./migrations/0007_stripe_integration.sql

# 執行 Migration（生產環境，上線前執行）
# wrangler d1 execute oao-to-db --remote --file=./migrations/0007_stripe_integration.sql
```

**驗證 Migration**：
```bash
wrangler d1 execute oao-to-db --local --command="SELECT * FROM stripe_price_mapping;"
```

應該會看到 4 筆記錄（但 stripe_price_id 都是佔位符）

---

## 步驟 3：在 Stripe 建立產品和價格

### 3.1 建立 Starter Plan

1. Stripe Dashboard → Products → Create product
2. 填寫資訊：
   - **Name**: `Starter Plan`
   - **Description**: `For growing projects - 1,000 API calls per month`
3. 點擊「Add pricing」
4. 建立月付價格：
   - **Pricing model**: Standard pricing
   - **Price**: `$9.00`
   - **Billing period**: Monthly
   - 點擊「Add pricing」
5. 再次點擊「Add another price」建立年付：
   - **Price**: `$89.00`（節省 17%）
   - **Billing period**: Yearly
   - 點擊「Add pricing」
6. 點擊「Save product」

**記下 Price IDs**：
- 在產品頁面，會看到兩個 Price
- 月付 Price ID：`price_xxx...`（例如 `price_1OaK...monthly`）
- 年付 Price ID：`price_xxx...`（例如 `price_1OaK...yearly`）

### 3.2 建立 Pro Plan

重複上述步驟，但使用：
- **Name**: `Pro Plan`
- **Description**: `For serious creators - 10,000 API calls per month`
- **月付價格**: `$29.00`
- **年付價格**: `$289.00`（節省 17%）

記下兩個 Price IDs。

---

## 步驟 4：更新資料庫的 Price Mapping

現在你有 4 個 Stripe Price IDs，需要更新資料庫：

```bash
# 進入 D1 shell（本地）
wrangler d1 execute oao-to-db --local --command="
UPDATE stripe_price_mapping 
SET stripe_price_id = 'price_YOUR_STARTER_MONTHLY_ID'
WHERE id = 'spm_starter_monthly';

UPDATE stripe_price_mapping 
SET stripe_price_id = 'price_YOUR_STARTER_YEARLY_ID'
WHERE id = 'spm_starter_yearly';

UPDATE stripe_price_mapping 
SET stripe_price_id = 'price_YOUR_PRO_MONTHLY_ID'
WHERE id = 'spm_pro_monthly';

UPDATE stripe_price_mapping 
SET stripe_price_id = 'price_YOUR_PRO_YEARLY_ID'
WHERE id = 'spm_pro_yearly';
"
```

**驗證**：
```bash
wrangler d1 execute oao-to-db --local --command="SELECT * FROM stripe_price_mapping;"
```

確認所有 `stripe_price_id` 都不再是 `REPLACE_WITH...`。

---

## 步驟 5：取得 API Keys

### 5.1 取得測試環境 Keys

1. Stripe Dashboard → Developers → API keys
2. 確認在「Test mode」
3. 記下以下 Keys：
   - **Publishable key**（前端用）：`pk_test_xxx...`
   - **Secret key**（後端用）：點擊「Reveal test key」，複製 `sk_test_xxx...`

### 5.2 設定 Webhook Secret

1. Stripe Dashboard → Developers → Webhooks
2. 點擊「Add endpoint」
3. 填寫資訊：
   - **Endpoint URL**: `http://localhost:8788/api/webhook/stripe`（本地測試）
   - **Description**: `OAO.TO Webhook (Local)`
4. 選擇要監聽的事件（點擊「Select events」）：
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `payment_intent.succeeded`
5. 點擊「Add events」
6. 點擊「Add endpoint」
7. 在 Endpoint 詳情頁，點擊「Reveal」來查看 **Signing secret**
8. 記下 Webhook Secret：`whsec_xxx...`

---

## 步驟 6：設定環境變數（本地開發）

### ✅ 正確做法：使用 .dev.vars

**本地開發不需要 `wrangler secret put`**，直接編輯 `.dev.vars` 檔案：

```bash
# 編輯檔案
cd /Users/JL/Development/media/oao_to/api-worker
# 在 .dev.vars 中加入：

STRIPE_SECRET_KEY_TEST="sk_test_xxx..."
STRIPE_PUBLISHABLE_KEY_TEST="pk_test_xxx..."
STRIPE_WEBHOOK_SECRET_TEST=""  # 稍後由 Stripe CLI 提供
ENVIRONMENT="development"
```

**為什麼？**
- ✅ 本地開發用 `.dev.vars` 更快
- ✅ `wrangler dev` 會自動載入
- ✅ 修改後重啟即生效
- ✅ 已在 `.gitignore` 中（安全）

**注意**：
- ⚠️ `wrangler secret put` 是給生產環境用的
- ⚠️ 本地開發不需要（浪費時間）

### 生產環境才需要 wrangler secret put

```bash
# 上線時才執行（不是現在）
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# etc.
```

---

## 步驟 7：配置 Customer Portal

Customer Portal 讓用戶可以自己管理訂閱（取消、升級、更新付款方式）。

1. Stripe Dashboard → Settings → Customer portal
2. 在「Test mode」下點擊「Activate test link」
3. 配置選項：
   - ✅ **Cancel subscriptions**: 允許（Allow）
   - ✅ **Update subscriptions**: 允許（Allow）
   - ✅ **Update payment methods**: 允許（Allow）
   - ✅ **Invoice history**: 顯示（Show）
4. 點擊「Save changes」

---

## 步驟 8：本地測試

### 8.1 啟動本地開發環境

```bash
cd /Users/JL/Development/media/oao_to/api-worker
wrangler dev --local
```

### 8.2 使用 Stripe CLI 測試 Webhook

#### 安裝和登入

```bash
# 安裝 Stripe CLI
brew install stripe/stripe-cli/stripe

# 登入（會打開瀏覽器授權）
stripe login
```

#### 啟動 Webhook 監聽（需要 2 個終端機）

**終端機 1**：啟動 Worker
```bash
cd /Users/JL/Development/media/oao_to/api-worker
wrangler dev --local --port 8788
```

**終端機 2**：啟動 Stripe CLI
```bash
stripe listen --forward-to http://localhost:8788/api/webhook/stripe
```

你會看到：
```
Ready! Your webhook signing secret is whsec_xxx...
```

**重要**：把這個 `whsec_xxx...` 複製，然後：

1. 編輯 `api-worker/.dev.vars`
2. 更新 `STRIPE_WEBHOOK_SECRET_TEST="whsec_xxx..."`
3. 回到終端機 1，按 Ctrl+C 停止 Worker
4. 重新執行 `wrangler dev --local --port 8788`

**為什麼要重啟？**
- `.dev.vars` 的修改需要重啟 Worker 才會載入
- Stripe CLI 的 secret 每次啟動可能不同

### 8.3 測試 Webhook 事件

在 Stripe CLI 終端機：

```bash
# 觸發訂閱成功事件
stripe trigger checkout.session.completed

# 觸發付款成功事件
stripe trigger invoice.payment_succeeded

# 觸發訂閱取消事件
stripe trigger customer.subscription.deleted
```

查看你的 Worker 日誌，應該會看到處理訊息。

---

## 步驟 9：完整流程測試

### 9.1 前端測試（需要先啟動前端）

```bash
# 在另一個終端機
cd /Users/JL/Development/media/oao_to/frontend
npm run dev
```

### 9.2 測試付款流程

1. 前往 `http://localhost:5173/pricing`
2. 點擊 Pro Plan 的「Get Started」
3. 應該會重導向到 Stripe Checkout 頁面
4. 使用測試卡號：
   - **卡號**: `4242 4242 4242 4242`
   - **過期日期**: 任意未來日期（如 `12/34`）
   - **CVC**: 任意 3 位數（如 `123`）
5. 填寫 Email 和其他資訊
6. 點擊「Subscribe」
7. 應該重導向回 `/dashboard?success=true`
8. 檢查資料庫，確認：
   - `credits.plan_type` 更新為 `pro`
   - `credits.stripe_subscription_id` 有值
   - `credits.balance` 增加了升級獎勵

### 9.3 測試 Customer Portal

1. 在 Dashboard 點擊「管理訂閱」按鈕
2. 應該重導向到 Stripe Customer Portal
3. 測試功能：
   - 查看訂閱詳情
   - 更新付款方式
   - 取消訂閱（測試用，可以立即再重新訂閱）

---

## 步驟 10：設定生產環境（上線前）

### 10.1 完成 Stripe 帳號認證

1. Stripe Dashboard → 切換到 Live mode
2. 完成 KYC（Know Your Customer）認證
3. 提供公司/個人資訊
4. 設定銀行帳戶（接收款項）

### 10.2 在生產環境建立產品

重複步驟 3，但在 Live mode 下：
1. 建立 Starter Plan（月付 $9、年付 $89）
2. 建立 Pro Plan（月付 $29、年付 $289）
3. 記下生產環境的 Price IDs

### 10.3 更新生產資料庫

```bash
# 執行 Migration
wrangler d1 execute oao-to-db --remote --file=./migrations/0007_stripe_integration.sql

# 更新 Price IDs
wrangler d1 execute oao-to-db --remote --command="
UPDATE stripe_price_mapping 
SET stripe_price_id = 'price_LIVE_STARTER_MONTHLY'
WHERE id = 'spm_starter_monthly';
-- ... 其他 3 個
"
```

### 10.4 設定生產環境 Webhook

1. Stripe Dashboard → Developers → Webhooks（Live mode）
2. Add endpoint：
   - URL: `https://api.oao.to/api/webhook/stripe`
   - 選擇相同的事件
3. 取得 Signing secret

### 10.5 設定生產環境 Secrets

```bash
# 生產環境 Keys
wrangler secret put STRIPE_SECRET_KEY --env production
# 輸入: sk_live_xxx...

wrangler secret put STRIPE_PUBLISHABLE_KEY --env production
# 輸入: pk_live_xxx...

wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# 輸入: whsec_live_xxx...

wrangler secret put ENVIRONMENT --env production
# 輸入: production
```

### 10.6 啟用生產環境 Customer Portal

1. Settings → Customer portal（Live mode）
2. Activate link
3. 配置相同選項
4. Save

---

## ✅ 驗證清單

設定完成後，確認：

**資料庫**：
- [ ] `stripe_events` 表存在
- [ ] `stripe_price_mapping` 有 4 筆正確的記錄
- [ ] `promo_codes` 表存在
- [ ] `credits` 表有新欄位（`stripe_subscription_id`, `subscription_status`）

**Stripe Dashboard**：
- [ ] 有 2 個產品（Starter, Pro）
- [ ] 每個產品有 2 個價格（Monthly, Yearly）
- [ ] Webhook 端點已設定
- [ ] Customer Portal 已啟用

**環境變數**：
- [ ] `STRIPE_SECRET_KEY_TEST` 已設定
- [ ] `STRIPE_PUBLISHABLE_KEY_TEST` 已設定
- [ ] `STRIPE_WEBHOOK_SECRET_TEST` 已設定
- [ ] `ENVIRONMENT` = `development`

**測試**：
- [ ] 可以建立 Checkout Session
- [ ] 可以完成測試付款
- [ ] Webhook 接收並處理事件
- [ ] 資料庫正確更新
- [ ] Customer Portal 可訪問

---

## 🚨 常見問題

### Q: Webhook 簽名驗證失敗？
**A**: 確認：
1. 使用的 `STRIPE_WEBHOOK_SECRET` 是正確的
2. 如果用 Stripe CLI，要用 CLI 顯示的 secret
3. 如果用 Dashboard Webhook，要用 Dashboard 的 secret

### Q: 找不到 Price ID？
**A**: 
1. 確認在正確的模式（Test/Live）
2. 在產品頁面，Price 會列在下方
3. Price ID 格式：`price_xxx...`

### Q: Checkout 重導向失敗？
**A**: 檢查：
1. `FRONTEND_URL` 環境變數是否正確
2. CORS 設定是否包含前端網址
3. 網路連線

### Q: 資料庫沒更新？
**A**: 檢查：
1. Webhook 是否收到事件（查看 `stripe_events` 表）
2. 是否有錯誤記錄（`stripe_events.error`）
3. Worker 日誌

---

## 📚 下一步

設定完成後，你可以：
1. 測試優惠碼功能（建立 promo code）
2. 實現前端整合（顯示訂閱狀態）
3. 測試升級/降級流程
4. 準備上線

---

**設定完成！** 🎉

有問題隨時查看：
- [Stripe 文檔](https://stripe.com/docs)
- [Stripe API 參考](https://stripe.com/docs/api)
- `/Users/JL/Development/media/oao_to/payment/STRIPE_INTEGRATION_GUIDE.md`
