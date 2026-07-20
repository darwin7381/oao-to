# Stripe 切換 Live Mode Runbook

> 2026-07-20。根因:生產 Worker 沒設 `ENVIRONMENT`,`getStripe()`(`src/utils/stripe.ts`)判定非 production → 永遠使用 `STRIPE_SECRET_KEY_TEST`。**目前生產實際跑 test mode,真卡刷不了錢。**

## 前置(Joey / Dashboard,約 30 分鐘)

1. **Stripe KYC**:Dashboard → Activate payments,完成商家驗證(Koala Brothers LLC,EIN 61-2232749,Stripe Tax head office 已設定過)。
2. **建立 Live products/prices**:切到 Live mode,重建與 test mode 相同的 products + prices(月/年 × 各方案 + PAYG credits)。記下每個 live `price_...` ID。
3. **建立 Live webhook endpoint**:Live mode → Developers → Webhooks → Add endpoint
   - URL:`https://api.oao.to/api/webhook/stripe`
   - 事件(與 test endpoint we_1Tt6Zh… 相同 14+5 事件):`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`, `subscription_schedule.released/canceled/completed` 等 — 完整清單見 `payment/STRIPE_WEBHOOK_EVENTS_INVENTORY.md`
   - 記下 live `whsec_...`

## 切換(工程,約 15 分鐘,可由我執行)

```bash
cd api-worker
export CLOUDFLARE_ACCOUNT_ID=b1d3f8b35c1b43afe837b997180714f3  # TempoXAI,必 pin

# 1. Live secrets
wrangler secret put STRIPE_SECRET_KEY --env production       # sk_live_...
wrangler secret put STRIPE_WEBHOOK_SECRET --env production   # live whsec_...

# 2. wrangler.toml [env.production.vars] 加一行:
#    ENVIRONMENT = "production"

# 3. 更新 D1 price mapping(現為 test price IDs)
wrangler d1 execute oao-to-prod --env production --remote --command \
  "UPDATE stripe_price_mapping SET stripe_price_id='price_LIVE_xxx' WHERE plan_id='...' AND billing_period='...';"
# （每個方案一行；先 SELECT * FROM stripe_price_mapping 對照）

# 4. 部署
wrangler deploy --env production
```

## 驗證

1. `isTestMode` 煙霧測試:打 `/api/checkout` 建 session,回傳的 Stripe session URL 應為 live mode(無 test 標記)。
2. 用真卡小額買最低方案 → 確認 webhook 200、credits 入帳、收據 email、admin Payments 顯示。
3. 立即退款該筆(admin 或 Stripe Dashboard)→ 確認 `charge.refunded` webhook 收回 credits。
4. e2e 測試(本地)不受影響 — 本地 `.dev.vars` 仍是 test key。

## 回滾

`wrangler.toml` 移除 `ENVIRONMENT="production"` + `wrangler deploy --env production` → 立即回到 test mode(live secrets 留著無妨)。

## 注意

- **不要先設 `ENVIRONMENT="production"` 再補 secrets** — 順序反了會讓 `getStripe()` 讀不到 key,checkout 直接 500。
- Stripe Tax 已 active;各州稅籍註冊是獨立業務決策(未做不影響收款)。
- P2 遺留:Stripe API 版本升級(2026-02-25.clover,用 Codex `upgrade-stripe` skill)。
