# 部署手冊（Deploy Runbook）— 權威版

> 2026-07-14 建立。本檔是部署的 single source of truth。先讀最上面的 🔴 再動手。

---

## 🔴🔴 最重要：帳號一定要 pin 到 TempoXAI 🔴🔴

**所有生產資源都在 TempoXAI 帳號，不是個人帳號。**

| 資源 | 帳號 | ID |
|------|------|-----|
| Worker `oao-to-api-production` | **TempoXAI** | `b1d3f8b35c1b43afe837b997180714f3` |
| KV `LINKS` (prod) | **TempoXAI** | namespace `cb616d868c134b1c9e5e6ef54afb3f64` |
| D1 `oao-to-prod` | **TempoXAI** | `bc49236e-acc9-499b-ba68-6aa90a000444` |
| Analytics Engine `link_clicks` | **TempoXAI** | — |
| Pages `oao-to-app` | **TempoXAI** | — |
| 個人帳號 `Joey@cryptoxlab.com` | **空的，不要部署到這** | `ae19816d2bd1052c1749319615949705` |

**為什麼會踩雷**：部署用的 API token 能存取**兩個**帳號（個人 + TempoXAI）。`wrangler whoami` 會把**個人帳號**報成 token 身份，於是 wrangler 會間歇性把東西部署到**錯的空個人帳號** → 出現這些誤導性錯誤：
- `KV namespace ... not found [code: 10041]`
- `You need to enable Analytics Engine [code: 10089]`

這些錯誤**不是** CF 不穩、不是權限不足、不是資源不見 —— 是**部署到錯帳號**。

**解法：部署前一律 export 這兩個環境變數：**
```bash
export CLOUDFLARE_API_TOKEN="<有 Workers/D1/KV/Pages/Analytics 權限的 token>"
export CLOUDFLARE_ACCOUNT_ID="b1d3f8b35c1b43afe837b997180714f3"   # TempoXAI，一定要 pin
```

---

## 部署前檢查

```bash
cd api-worker
npx tsc --noEmit            # 型別檢查（有既有 baseline errors，看有無「新增」即可）
npx wrangler deploy --env production --dry-run   # build 檢查
```
- Token 需要權限：Workers Scripts:Edit、Workers KV:Edit、D1:Edit、Cloudflare Pages:Edit、Workers Routes:Edit、Zone:Read、**Account Analytics（給 AE binding 驗證用）**。

---

## 部署步驟（依序）

```bash
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="b1d3f8b35c1b43afe837b997180714f3"   # TempoXAI

# 1) 備份生產 D1（每次改 schema 前必做）
cd api-worker
npx wrangler d1 export DB --env production --remote --output ../backups/oao-to-prod_$(date +%Y%m%d_%H%M%S).sql

# 2) 套用 migrations（如有新 migration）
npx wrangler d1 migrations apply DB --env production --remote

# 3) 部署 worker
npx wrangler deploy --env production

# 4) 部署前端
cd ../frontend
npm run build
npx wrangler pages deploy dist --project-name oao-to-app
```

---

## 部署後 smoke test

```bash
curl -s -o /dev/null -w "plans: %{http_code}\n" https://api.oao.to/public/plans          # 期望 200
curl -s -o /dev/null -w "app: %{http_code}\n" https://app.oao.to/                          # 期望 200
curl -s -X POST https://api.oao.to/shorten -H "Content-Type: application/json" -d '{"url":"https://example.com"}' -w " (shorten)\n"  # 期望 201
# 安全檢查（都應該擋住）
curl -s -o /dev/null -w "test-list(want 404): %{http_code}\n" https://api.oao.to/test-list
curl -s -o /dev/null -w "analytics-noauth(want 401): %{http_code}\n" https://api.oao.to/api/analytics/summary/all
```

---

## 已知 CLI 陷阱

- `wrangler d1 execute --json` 把 SQL NULL 輸出成字串 `"null"`。
- Cloudflare bot 防護會擋 `python-urllib` User-Agent（測 webhook 要帶 `Stripe/1.0` UA）。
- Durable Objects：本帳號只支援 SQLite-backed，migration 用 `new_sqlite_classes`（不是 `new_classes`）。
- 若 `wrangler tail` / `d1 execute` 報帳號錯誤，就是沒 pin `CLOUDFLARE_ACCOUNT_ID`（見最上面）。

---

## Stripe 相關

- 生產目前跑 **test mode**（getStripe 讀 `STRIPE_SECRET_KEY_TEST`，因 `ENVIRONMENT` 未設）。
- Webhook endpoint（test mode）：`we_1Tt6Zh…` → `https://api.oao.to/api/webhook/stripe`，14 事件。
- 切 live 見 `payment/PAYMENT_PROGRESS_AND_TESTS.md`。
