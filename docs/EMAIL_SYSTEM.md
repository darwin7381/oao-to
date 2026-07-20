# OAO.TO Email 體系（權威文件）

> 2026-07-16 上線。**全 AI 維護、完全無人**：收信由 AI 判讀處理、出信由產品事件觸發、鏈路自我測試、退信自動抑制。
> 取代先前規劃文件（https://md.blocktempo.ai/GOECSADOTm2Y1KQVB-3zyQ）的狀態表 — 本文件是現況的 single source of truth。
> 基建屬 Crab Labs email 平台（mac mini `~/infra/services/email/`）；oao.to 專屬處理器文件：`infra services/email/ai-inbound/README.md`。

---

## 1. 架構總覽

```
出信（Outbound）
  Stripe webhook / cron ─→ api-worker ─→ SES v2 SigV4（billing@ / no-reply@）─→ 客戶
                                          │  DKIM(SES)+SPF+DMARC · Reply-To→support@
                                          └─ ConfigurationSet oao-events ─→ SNS ─→ /api/webhook/ses-events
                                                                                   └→ D1 email_suppression（退信/客訴自動抑制）
收信（Inbound，無人 AI 管線）
  任何 @oao.to ─MX→ xmail(Stalwart) [catch-all→support@] ─JMAP 每 3min→ mac mini oao-mailhandler
      → 防迴圈 guard → claude -p 判讀（分類/風險/擬回覆）→ Telegram 告警(附擬稿) → 歸檔 Processed
自我測試
  每 6h billing@→healthcheck@（真走 SES→MX→Stalwart）；30min 未回 → Telegram 告警
```

## 2. 地址表

| 地址 | 用途 | 實作 |
|---|---|---|
| `support@` | 客戶來信主入口；所有交易信的 Reply-To | Stalwart 帳號（AI 讀） |
| `billing@` | 金流信寄件人（收據/退款/催繳） | alias → support@ |
| `no-reply@` | 生命週期信寄件人（歡迎/取消） | 無帳號；回信由 catch-all 接 |
| `postmaster@` / `abuse@` | RFC 必備 | alias → support@ |
| `healthcheck@` | 自我測試心跳 | catch-all（handler 特判、靜默） |
| `dclaude@` | MBP DaddyClaude agent 身分（維運/測試） | Stalwart 帳號 |
| `*`（catch-all） | 其他一切 @oao.to | → support@，進 AI 管線不漏接 |

## 3. 出信 — 信種對照（api-worker）

| 信種 | 觸發 | 冪等鍵 | 寄件人 | 狀態 |
|---|---|---|---|---|
| 催繳 dunning | invoice.payment_failed + 每時 cron 重試 | invoice+attempt | billing@ | 🟢 |
| 歡迎/開通 | checkout.session.completed（訂閱） | session id | no-reply@ | 🟢 |
| 續費收據 | invoice.payment_succeeded | invoice id | billing@ | 🟢 |
| Credits 收據 | checkout（credits） | session id | billing@ | 🟢 |
| 退款確認 | charge.refunded | charge id | billing@ | 🟢 |
| 取消確認 | subscription.deleted | subscription id | no-reply@ | 🟢 |
| 方案變更 / 卡到期 / 用量提醒 / 驗證信 | — | — | — | 🟡 待做 |

- **實作**：`src/utils/email-i18n.ts`（四語模板 en/zh-TW/zh-CN/ja）+ `src/utils/lifecycle-email.ts`（claim-send-release 冪等 marker `trans_email_<kind>_<key>` 存 credit_transactions；寄前查抑制；best-effort 永不影響 webhook 主流程）+ `src/utils/email.ts`（手刻 SigV4，Worker 不能跑 AWS SDK）。
- **語言**：`users.locale`（使用者偏好，前端同步，migration 0011）→ fallback en。
- **開關**：`EMAIL_LIFECYCLE_ENABLED`（wrangler var）；dunning 獨立 `DUNNING_EMAIL_ENABLED`。

## 4. 收信 — AI 管線（mac mini）

處理器：`infra services/email/ai-inbound/oao_mailhandler.py`（launchd `ai.crablabs.oao-mailhandler`，180s）。
防迴圈 guard（絕不自動回）：mailer-daemon/no-reply 寄件人、Auto-Submitted、Precedence bulk/junk/list、List-Id、X-Auto-Response-Suppress、own-domain、同寄件人日限 5 封。
AI 判讀（`claude -p` headless，掛了 fallback needs_human 照告警）：分類 support/billing/bounce/complaint/abuse/spam/other + 風險 + 中文摘要 + 擬回覆（護欄：不承諾退款/折扣/改訂閱、不洩他人資料、高風險升級告警、署名 AI）。
**自動回信目前關閉**（見 §7），擬稿全走 Telegram 告警由 Joey 一鍵決定。

## 5. 退信/客訴自動抑制（feedback loop）

SES config set `oao-events` → SNS topic `oao-ses-events` → `POST https://api.oao.to/api/webhook/ses-events?token=<secret>`（`src/routes/ses-events.ts`：SNS 訂閱自動確認、amazonaws.com host 白名單、Permanent bounce + complaint → D1 `email_suppression`）。dunning/lifecycle 寄信一律先查表。已實測（SES simulator bounce 自動入表）。
⚠️ 坑：scoped IAM user（oao-dunning-ses）的 policy Resource 必須含 configuration-set ARN，否則 SendEmail AccessDenied。

## 6. 多語言（信件 + 網站共用偏好）

- 偏好欄位：`users.locale`（'en'|'zh-TW'|'zh-CN'|'ja'）。API：`GET/PUT /api/account/locale`。
- 前端：i18next + 瀏覽器偵測（localStorage `oao-locale` → navigator）+ 語言切換器（Header + Settings）；登入後有存偏好則以後端為準，變更即回寫。核心 chrome/nav/settings/pricing 已翻，其餘頁面逐步收編（未翻字串維持英文）。
- 信件：同一 locale 進 email-i18n 模板。

## 7. 現況 / 待辦

**🟢 已上線**：收信 AI 管線、出信 6 信種（i18n）、抑制 feedback loop、收發自我測試、前端 i18n 機制、DKIM/SPF/DMARC/custom MAIL FROM 全過。
**⛔ 唯一硬卡點**：SES sandbox（2026-07-15 production access DENIED，case 178401083100825）→ 未驗證收件人會被 SES 擋 = 不能對真客戶寄信/自動回信。**申訴稿已備妥** `infra services/email/relay/ses-appeal-draft.md`，需 Joey root 登 AWS console 回 case。核准後：mailhandler `.env` 的 `AUTOREPLY_ENABLED=true` 即全自動。
**🟡 待做**：D1 ticket 落地接 admin SupportTickets 頁、方案變更/卡到期/用量提醒信、DMARC p=none→reject 漸進、SNS 完整簽章驗證、前端翻譯覆蓋擴大。

## 8. Ops 速查

```bash
# 手動觸發收信處理一輪（mac mini）
ssh mac-mini-ts 'launchctl kickstart gui/$(id -u)/ai.crablabs.oao-mailhandler'
# 看處理紀錄
ssh mac-mini-ts 'tail ~/.local/state/oao-mailhandler/handler.jsonl'
# 查生產抑制清單
npx wrangler d1 execute DB --env production --remote --command "SELECT * FROM email_suppression"
# 部署（一定 pin TempoXAI，見 deployments/DEPLOY_RUNBOOK.md）
export CLOUDFLARE_ACCOUNT_ID="b1d3f8b35c1b43afe837b997180714f3"
```

**身分鐵則**：維運/測試一律用 agent 自己的 `dclaude@oao.to`；絕不使用任何他人信箱/帳號執行動作。
