# OAO.TO — 產品完整規格書（Spec）

> 版本：2026-07-14 · 由現況 reverse-engineer + 合理化整理
> 目的：把混亂演進的現況重新理成一份乾淨的 source-of-truth。標註 **【現況】** = 目前實作、**【應為】** = 建議的正確設計（差異處即待重寫項）。

---

## 0. 產品定位

**OAO.TO** — 專業短網址 SaaS。核心價值：**極速全球重定向** + **詳細分析** + **API 平台** + **智能配額計費**。

三個對外域名：
- `oao.to` — 短網址重定向（邊緣 Worker，效能命脈）
- `api.oao.to` — 業務 API（Hono Worker）
- `app.oao.to` — 前端管理介面（Cloudflare Pages）

---

## 1. 技術架構

| 層 | 技術 | 職責 |
|----|------|------|
| 重定向 | Cloudflare Worker + KV | slug → 目標 URL，邊緣低延遲 |
| API | Cloudflare Worker + Hono + TS | 認證、連結 CRUD、支付、分析、admin |
| 資料 | D1 (SQLite) | source of truth：users, credits, plans, api_keys, 交易, stripe_* |
| 快取/連結 | Workers KV | 連結資料（`link:<slug>`）、API key 快取、rate limit 計數 |
| 分析 | Analytics Engine | 點擊事件（國家/裝置/時間） |
| 前端 | React 18 + Vite + Tailwind | Pages |
| 金流 | Stripe（Checkout + Portal + Billing） | 訂閱 + 一次性 credits |

**【應為】資料一致性原則**：D1 為唯一 source of truth（PK 唯一約束）；KV 為純讀取快取（miss 回填）；所有寫入先 D1 後 KV，刪改先 D1 後 invalidate KV。（**【現況】**：KV/D1 雙寫無統一模型，三個建連結入口各自為政 → 待重寫。）

---

## 2. 使用者與角色

### 角色（存於 users.role，由 JWT 攜帶）
| 角色 | 權限 |
|------|------|
| `user` | 自己的連結/分析/API keys/訂閱 |
| `admin` | + 管理後台：查用戶、連結、付款、審計、支援、方案（唯讀+部分操作） |
| `superadmin` | + 改用戶角色、設方案、敏感金融操作 |

### 登入
- **Google OAuth** 唯一登入方式。
- 首次登入自動建 user + credits（free plan）。
- `SUPERADMIN_EMAILS` 白名單的 email 登入時自動升 superadmin。
- **【應為】** session：httpOnly cookie + 短 JWT TTL（1-4h）+ refresh；role 定期重驗 DB。
- **【現況】** JWT 明文塞 URL query、TTL 30 天無 refresh、role 不重驗 DB、D1 錯誤即清 token（登入不穩根因）→ 待重寫。

---

## 3. 核心功能：短網址

### 3.1 建立
**【應為】統一單一入口**（登入或 API key），流程：
1. 驗證 URL 格式
2. slug：自訂（驗證格式 + 唯一）或系統生成（碰撞重試至唯一）
3. 扣 credits（依方案）
4. D1 INSERT（PK 防碰撞）→ 成功後寫 KV
5. 背景 `waitUntil` 抓 OG metadata → 更新 D1 + KV

**【現況】三個入口**（待收斂）：
- `POST /shorten` — 公開、不扣費、不驗證、只寫 KV、userId=anonymous ❌ 應廢棄
- `POST /api/links` — 登入、雙寫 KV+D1
- `POST /v1/links` — API key、扣 1 credit、雙寫

### 3.2 連結屬性
`slug, url, title, description, image, tags[], userId, isActive, password?, expiresAt?, flagReason?, createdAt, updatedAt`

### 3.3 重定向（oao.to）
1. KV 查 `link:<slug>`（miss → **【應為】** 回填 D1）
2. 檢查 isActive / expiresAt / flagReason → 失效則擋
3. password：**【應為】** hash 比對 + POST 驗證（**【現況】** 明文存 + `?p=` GET ❌）
4. 寫 Analytics Engine 點擊事件
5. 重定向：**【應為】** 302 或短 max-age（**【現況】** 301 + 1h 瀏覽器快取 → 停用連結仍生效 ❌）

### 3.4 分析（app.oao.to）
- 每連結：總點擊、國家分布、裝置分布、7 日趨勢
- 摘要：總連結、總點擊、熱門連結
- **【應為】** 需登入 + 所有權（**【現況】** 無認證 ❌ live 洩漏）
- Analytics Engine SQL **【應為】** 白名單過濾插入值（**【現況】** 字串插值有注入風險）

---

## 4. 方案與計費

### 4.1 方案（plans 表）
| 方案 | 月費 | 年費 | 月配額 credits | API/日 | API keys |
|------|------|------|------|------|------|
| Free | $0 | $0 | 100 | 1,000 | 5 |
| Starter | $9.99 | $99.99 | 1,000 | 10,000 | 10 |
| Pro | $29.99 | $299.99 | 10,000 | 100,000 | 25 |
| Enterprise | $299 | $2,999 | 100,000 | 1,000,000 | 999 |

### 4.2 雙池 Credits 模型
- **Pool A — 月配額**（`monthly_used` / plan.monthly_credits）：每月重置，不累積。
- **Pool B — 永久 credits**（`balance` / `purchased_balance`）：一次性購買、升級 bonus、promo 贈送，不過期、方案變更不收回。
- **扣款順序**：月配額 → 永久 credits（Enterprise 無限）。**【應為】** 條件式原子扣款（已修）。
- **配額重置**：月繳 invoice 觸發 + cron 兜底（Free/年繳靠 cron，`monthly_reset_at` 到期 +30d）。
- **overage 超額**：已移除（死機制）。
- **有效方案（entitlement）** = `COALESCE(plan_override, plan_type)`，但未付款狀態（unpaid/paused/incomplete_expired）降為 free 權益。

### 4.3 有效方案判定（entitlement gate）
```
plan_override 存在 → 用 override（admin 手動指定，webhook 不碰）
subscription_status ∈ {unpaid, paused, incomplete_expired} → free 權益
past_due → 保留權益（grace period）
其餘 → plan_type（Stripe 同步值）
```

---

## 5. 訂閱與支付（Stripe）

### 5.1 購買流程
- **訂閱**：Checkout Session（hosted）→ 選月/年 → 付款 → webhook 開通。
- **一次性 Credits**：Checkout Session（payment mode）→ 加 balance。
- **管理**：Customer Portal（升降級、換週期、取消、付款方式）。

### 5.2 狀態同步（核心設計）
**原則**：Stripe = source of truth，本地 DB = read replica。任何 webhook 事件只當觸發器 → `syncSubscriptionFromStripe()` 從 Stripe 拉完整訂閱 → 全量覆寫本地。

**升降級規則**：
- 升級 → 立即生效
- 降級 → 期末生效（Subscription Schedule），期間顯示「即將降級」
- 取消 → 期末降 free（`cancel_at_period_end` → period end 發 `subscription.deleted`）

### 5.3 Webhook 事件（14 個）
`checkout.session.completed` / `async_payment_succeeded` / `async_payment_failed`、`invoice.payment_succeeded` / `payment_failed` / `payment_action_required`、`customer.subscription.updated` / `deleted`、`charge.dispute.created`、`subscription_schedule.created/updated/released/canceled/completed`

### 5.4 付款確認 gate
- `payment_status !== 'paid'` 不發貨（延遲付款方式等 `async_payment_succeeded`）
- 訂閱需 `active`/`trialing` 才開通
- 金流冪等：deterministic transaction id + D1 batch（重試/重複投遞不重複發放）

### 5.5 模式
- **【現況】** 生產跑 **test mode**（測試卡，無真實扣款）
- **切 live** 待辦：KYC + live keys + live prices + `ENVIRONMENT=production` + 更新 stripe_price_mapping

---

## 6. 優惠碼 / Coupon

- 自建 `promo_codes` 表 + 對應 Stripe Coupon 預建。
- 折扣型（percentage / fixed_amount）+ 贈 credits 型（bonus_credits）。
- Duration：once / repeating(N月) / forever。
- 限制：max_uses（全域）、per_user_limit（每人）、valid_from/until、applies_to_plans/periods。
- **【應為】** percentage/fixed 遷移 Stripe Promotion Codes；bonus 型保留自建。發放原子防超賣（已修 guard chain）。

---

## 7. API 平台

### 7.1 API Key
- 格式 `oao_<env>_<random>`，SHA-256 hash 存 D1，明文只顯示一次。
- Scopes：`links:read/write/update/delete`、`analytics:read`。
- 數量上限依方案。
- **【應為】** 撤銷立即清 KV cache（**【現況】** 5 分鐘窗口仍有效 ❌）。

### 7.2 Rate Limiting
- 每 key 每分鐘/每日限制（依方案）。
- **【應為】** Durable Objects 或 Cloudflare Rate Limiting binding（原子）。
- **【現況】** KV read-then-write，並發 burst 可完全繞過 ❌ → **必須重寫**。
- rate limit 值 **【應為】** 動態依當前方案（**【現況】** 建 key 時寫死，降級不更新 + 用戶可自訂超限 ❌）。

### 7.3 公開 API（/v1/*）
- API key 認證 → scope 檢查 → rate limit → 扣 credits → 執行。

---

## 8. 兩個後台

### 8.1 管理後台（app.oao.to/admin，admin+）
Users、Links、CustomLinks、Payments、CreditsManagement、PlansManagement、CouponManagement、ApiKeysMonitoring、Analytics、Stats、AuditLogs、SupportTickets、Settings。
- **【應為】** layout 層角色 guard；superadmin-only 操作前端也 gate。

### 8.2 用戶儀表板（app.oao.to/dashboard，user）
Dashboard（連結列表+建立）、Analytics、Credits、ApiKeys、ApiDocs、Settings、SubscriptionSuccess。

（**【現況】** 兩後台多頁 runtime crash / 假功能 / 裝飾按鈕 → 見審計報告，待收尾。）

---

## 9. 資料模型（D1 主要表）

- **users**：id, email, name, avatar, role, stripe_customer_id, created_at
- **credits**：user_id, balance, purchased_balance, plan_type, plan_override, billing_period, monthly_used, monthly_reset_at, subscription_status, stripe_subscription_id, subscription_current_period_start/end, cancel_at_period_end, scheduled_plan_change(JSON), last_plan_change_type/at
- **plans**：name, display_name, price_monthly, price_yearly, monthly_credits, api_calls_per_day, max_api_keys, features
- **api_keys**：id, user_id, key_hash, key_prefix, scopes, rate_limit_per_minute/day, is_active, last_used_at
- **credit_transactions**：id, user_id, type, amount, balance_after, description, metadata, created_at
- **stripe_events**：stripe_event_id(UNIQUE), event_type, processed, raw_data — webhook 冪等
- **stripe_price_mapping**：stripe_price_id, plan_type, billing_period, display_price
- **promo_codes** / **promo_code_usage**：優惠碼 + 使用紀錄（UNIQUE(promo_code_id, user_id)）
- **links**（D1）：slug(PK), url, title, user_id, password, expires_at, is_active — **【應為】** 與 KV 同步的 source of truth
- 審計 / 支援：audit_logs, support_tickets

KV：`link:<slug>`（連結資料）、`apikey:cache:<hash>`、`ratelimit:*`
Analytics Engine：link_clicks（blob1=slug, blob4=country, blob8=device …）

---

## 10. 待重寫清單（本 spec【現況】≠【應為】處）

1. **Rate Limiter** → Durable Objects（並發正確）
2. **KV↔D1 一致性** → D1 source of truth + KV 快取 + 統一寫入 + 廢 /shorten
3. **認證流程** → httpOnly cookie + 401 處理 + JWT TTL 縮短 + role DB 驗
4. **重定向快取** → 301→302 / 縮 max-age
5. **連結密碼** → hash + POST
6. **Analytics SQL** → 白名單過濾
7. **後台 UI** → 型別對齊後端、假功能接真 API、所有權/角色 gate 補齊

---

*配套文件：`AUDIT_2026-07-14.md`（完整 bug 清單）、`payment/PAYMENT_PROGRESS_AND_TESTS.md`（支付進度+測試）。*
