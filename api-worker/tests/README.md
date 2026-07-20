# Payment E2E Tests

`e2e-payment.py` — 支付/訂閱全流程 E2E 測試（39 項斷言）。

## 測什麼

| 場景 | 驗證 |
|------|------|
| A. Checkout 完成 | plan 啟用、狀態、訂閱 ID 落庫 |
| B. 冪等性 | 同事件重放 + 重複投遞都不會重複發放 |
| C. 升級 | Portal 升級後 plan_type 即時同步 |
| D. 排程降級 | scheduled_plan_change 記錄 + 新方案價格正確（cents） |
| E. 降級生效 | phase 切換後 plan_type 真的降級、monthly_used cap 到新配額 |
| F. 期末取消 | scheduled cancel 狀態 |
| G. 訂閱刪除 | 降 free + 用量/週期完整重置 |
| H. Credits 購買 | 發放、冪等、金額竄改被擋（500） |
| I. Invoice 成功 | 月配額重置 + 同 invoice 冪等 |
| J. Invoice 失敗 | past_due |
| K. Cron | monthly_reset_at 到期重置、錨點 +30d |

## 怎麼跑

```bash
cd api-worker
npx wrangler dev --test-scheduled --port 8787 --persist-to .wrangler/e2e-state   # 起本地 worker（背景）
python3 tests/e2e-payment.py
```

需求：`.dev.vars` 內有 `STRIPE_SECRET_KEY_TEST` + `STRIPE_WEBHOOK_SECRET_TEST` + `JWT_SECRET`。

**隔離設計**：worker 與測試都跑在獨立的 `.wrangler/e2e-state` D1（migrations 由腳本
自動套用），不會碰你平常 `wrangler dev` 的本地資料 — cron 測試會觸發全表配額重置，
所以必須隔離。腳本啟動時會用 JWT probe 驗證 worker 確實接在隔離 DB 上，
worker 忘了帶 `--persist-to` 會被直接擋下。

測試會在 Stripe **test mode** 建立真實 customer/subscription（結束自動刪除），
webhook 事件用 test webhook secret 手工簽名注入本地 worker。

注意：`wrangler d1 execute --json` 會把 SQL NULL 輸出成字串 `"null"`，
腳本內已處理；自行查 DB 時留意。
