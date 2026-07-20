# 支付系統 — 進度與測試文件（2026-07-14）

本文件記錄支付/訂閱系統的重寫、修復、測試與生產部署全過程。

---

## 一、狀態總覽

| 項目 | 狀態 |
|------|------|
| 後端支付邏輯 | ✅ 重寫完成（冪等同步層） |
| 前端支付 UI | ✅ 修復完成 |
| E2E 測試 | ✅ 56 斷言全過（`api-worker/tests/e2e-payment.py`） |
| 生產部署 | ✅ 上線（**Stripe test mode**，api.oao.to） |
| 正式收費（live mode） | ⏳ 待 Stripe KYC + live keys + live prices |

---

## 二、重寫 / 修復內容

### 核心：webhook 同步層重寫（`api-worker/src/utils/stripe-sync.ts`）
- `syncSubscriptionFromStripe()`：任何 subscription/schedule 事件只當觸發器，從 Stripe API 拉完整訂閱（expand schedule）後**全量覆寫**本地狀態。
- 消滅：排程降級永不套用、webhook 亂序競態、toPrice 顯示錯誤。
- 補上 `subscription_schedule.released/canceled/completed` 事件。

### 首輪修復 C1–C5
- C1/C2：admin SQL injection → 參數化 `.bind()`
- C3：升級後 plan_type/billing_period 同步
- C4：取消訂閱降級 free + 完整重置用量（Codex 抓到第一版漏了 monthly_used）
- C5：plans.ts 補 userEmail/userRole

### Codex 雙重審計修復（7 項）
- C1 付款確認 gate：`payment_status !== 'paid'` 不發貨 + `async_payment_*` 事件 + 訂閱需 active/trialing
- C2 entitlement gate：`credit-manager.ts` `effectivePlanSql()` — unpaid/paused/incomplete_expired → free 權益；past_due 保留 grace；**incomplete 刻意不列入**（續費 SCA 正確狀態是 past_due，列入會誤傷已付費用戶）
- C3 扣款原子化：條件式 UPDATE（`WHERE monthly_used + ? <= quota` / `WHERE balance >= ?`）
- C4 promo 超賣 guard chain（EXISTS 串鎖 batch）
- H1 重複訂閱 409、H2 price mapping fail-closed、M maxNetworkRetries=2

### overage 死代碼移除
overage 從無設定入口、SQL 引用已刪欄位、branch 不可達 → 從 deduction / account.ts / types.ts / Credits.tsx 完整移除。

### 前端修復
- API 失敗不再假裝 Free（杜絕重複付費）
- past_due/incomplete 警示 banner + 開 Portal
- SuccessPage 不再顯示錯誤 bonus 數字
- Coupon duration 欄位真的送出

---

## 三、E2E 測試（`api-worker/tests/e2e-payment.py`）

**56 斷言全過。** 隔離環境（獨立 `.wrangler/e2e-state` D1 + JWT probe + per-run nonce 防殘留資料）+ 手工簽名 webhook + Stripe test mode 真實物件。

涵蓋場景：
- A 未付款不發貨 / async 付款成功才發貨
- B 冪等（重放 + 重複投遞不重複發放）
- C 升級即時同步
- D 排程降級記錄 + 正確新價格
- E 降級生效套用 + monthly_used cap
- F 期末取消狀態 / G 訂閱刪除降 free + 完整重置
- H credits 購買 + 冪等 + 金額竄改擋
- I invoice 配額重置 + 冪等 / J past_due
- K cron 配額重置
- L 續費 SCA 保留權益 / M 未映射價格 fail-closed / N 重複訂閱 409
- O **並發扣款**：剩 5 打 20 並發 → 恰好 5 成功、用量精確停上限、balance 不負
- P **promo 並發超賣**：max_uses=1 兩用戶同時兌換 → 只發一份

**跑法：**
```bash
cd api-worker
npx wrangler dev --test-scheduled --port 8787 --persist-to .wrangler/e2e-state &
python3 tests/e2e-payment.py
```
需求：`.dev.vars` 內 `STRIPE_SECRET_KEY_TEST` + `STRIPE_WEBHOOK_SECRET_TEST` + `JWT_SECRET`。
陷阱：`wrangler d1 execute --json` 把 SQL NULL 輸出成字串 `"null"`（腳本已處理）；Cloudflare bot 防護擋 python-urllib UA（測試帶 Stripe UA）。

---

## 四、生產部署紀錄

**帳號拓樸**：worker + D1 在 Joey 個人帳號（ae19816d…）；Pages 專案 oao-to-app 在 TempoXAI（b1d3f8b3…）。舊 .dev.vars token 一直 7403 = 帳號不對。

**部署步驟**：
1. 備份 prod D1（1.76MB，9 用戶，`backups/`）
2. Migrations 0007–0010（生產原本停在 0006，支付首次上線；0007 重建 credits 表，9 用戶保留）
3. `wrangler deploy --env production`（api.oao.to）
4. Stripe test 金鑰：建 webhook endpoint `we_1Tt6Zh…`（14 事件）+ 設 `STRIPE_SECRET_KEY_TEST` / `STRIPE_WEBHOOK_SECRET_TEST`
5. 前端 build + deploy（app.oao.to Production）
6. Smoke：webhook 壞簽 400 / 正確簽 200 / Stripe UA 通過 CF bot 防護 / /public/plans 200

**測試方式**：app.oao.to 用測試卡 `4242 4242 4242 4242`（任意未來到期 + 任意 CVC），不會真實扣款。

---

## 五、切 Live Mode 待辦

1. Stripe KYC 完成
2. Live mode 建 products/prices
3. 提供 live secret key → 設 `STRIPE_SECRET_KEY`（並設 `ENVIRONMENT=production` 讓 getStripe 讀 live key）
4. Live mode 建 webhook endpoint（14 事件）→ 設 `STRIPE_WEBHOOK_SECRET`
5. 更新 `stripe_price_mapping` 為 live price IDs（目前是 test price IDs）

---

## 六、P2 遺留（非阻塞）

- Dunning email（付款失敗通知，需選 email 服務）
- 退款收回 credits（`charge.refunded` handler）
- Stripe Tax（automatic_tax，賣全球需要）
- Stripe API 版本升級（目前 2024-11-20.acacia；升級有 breaking change：current_period_* 搬到 subscription items，建議用 Codex upgrade-stripe skill）
