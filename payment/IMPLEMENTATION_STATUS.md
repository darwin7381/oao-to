# Stripe 整合實作狀態報告

**日期**：2026-01-28  
**狀態**：後端實作完成，等待設定和前端整合  
**完成度**：70%

---

## ✅ 已完成項目

### 0. 標準文件（100%）

- ✅ **/standards/ENVIRONMENT_VARIABLES_AND_SECRETS.md**
  - 環境變數管理標準
  - Secret Keys 安全處理
  - .dev.vars vs wrangler secret
  - Stripe Webhook Secret 特殊處理
  - 常見錯誤與解決方案

### 1. 文檔和指南（100%）

所有文檔已建立並放在 `/payment` 資料夾：

- ✅ **STRIPE_INTEGRATION_GUIDE.md**（完整技術指南，1,285 行）
- ✅ **PRICING_MANAGEMENT_STRATEGY.md**（價格管理策略，900 行）
- ✅ **STRIPE_SETUP_GUIDE.md**（設定教學）
- ✅ **README.md**（總覽和快速導航）
- ✅ **IMPLEMENTATION_STATUS.md**（本文件）

### 2. 依賴安裝（100%）

```bash
✅ npm install stripe@^17.4.0
```

### 3. 資料庫設計（100%）

Migration 檔案已建立：
- ✅ `/api-worker/migrations/0007_stripe_integration.sql`

包含的表：
- ✅ `credits` 表擴展（新增 Stripe 訂閱欄位）
- ✅ `plans` 表擴展（新增 bonus 欄位）
- ✅ `stripe_events`（Webhook 事件日誌）
- ✅ `stripe_price_mapping`（價格映射）
- ✅ `promo_codes`（優惠碼）
- ✅ `promo_code_usage`（優惠碼使用記錄）

### 4. Types 定義（100%）

已更新 `/api-worker/src/types.ts`：
- ✅ Stripe 環境變數定義
- ✅ 訂閱狀態類型
- ✅ Stripe 事件類型
- ✅ 價格映射類型
- ✅ 優惠碼類型
- ✅ Webhook 事件處理類型

### 5. Utility 函數（100%）

已建立 `/api-worker/src/utils/stripe.ts`：
- ✅ `getStripe()` - 獲取 Stripe 實例
- ✅ `getWebhookSecret()` - 獲取 Webhook Secret
- ✅ `verifyWebhookSignature()` - 驗證簽名
- ✅ `getOrCreateCustomer()` - 建立/獲取客戶
- ✅ `calculateDiscountedAmount()` - 計算折扣
- ✅ 金額轉換函數
- ✅ 輔助函數

### 6. API Routes（100%）

#### 6.1 Checkout API (`/api-worker/src/routes/checkout.ts`)
- ✅ `POST /api/checkout/create` - 建立 Checkout Session
- ✅ `POST /api/checkout/portal` - 建立 Customer Portal Session
- ✅ `GET /api/checkout/session/:sessionId` - 查詢 Session 狀態

#### 6.2 Webhook API (`/api-worker/src/routes/stripe-webhook.ts`)
- ✅ `POST /api/webhook/stripe` - 接收 Webhook 事件
- ✅ 簽名驗證
- ✅ 冪等性處理
- ✅ 事件路由

**處理的事件**：
- ✅ `checkout.session.completed` - 訂閱成功
- ✅ `invoice.payment_succeeded` - 每月扣款成功
- ✅ `invoice.payment_failed` - 扣款失敗
- ✅ `customer.subscription.updated` - 訂閱更新
- ✅ `customer.subscription.deleted` - 訂閱取消
- ✅ `payment_intent.succeeded` - 一次性支付（購買 Credits）

#### 6.3 優惠碼 API (`/api-worker/src/routes/promo-codes.ts`)
- ✅ `POST /api/promo-codes/validate` - 驗證優惠碼
- ✅ `POST /api/promo-codes` - 建立優惠碼（Admin）
- ✅ `GET /api/promo-codes` - 列出優惠碼（Admin）
- ✅ `PATCH /api/promo-codes/:id` - 更新優惠碼（Admin）
- ✅ `GET /api/promo-codes/:code/stats` - 查看統計（Admin）

### 7. 主程式整合（100%）

已更新 `/api-worker/src/index.ts`：
- ✅ Import 新的 routes
- ✅ 註冊 routes 到 app
- ✅ CORS 配置保持

---

## 🔄 待完成項目

### 1. 資料庫執行（0%）

需要執行 Migration：

```bash
# 本地環境
cd /Users/JL/Development/media/oao_to/api-worker
wrangler d1 execute oao-to-db --local --file=./migrations/0007_stripe_integration.sql

# 生產環境（上線前）
# wrangler d1 execute oao-to-db --remote --file=./migrations/0007_stripe_integration.sql
```

### 2. Stripe 帳號設定（✅ 100%）

已完成：
- [x] 註冊 Stripe 帳號
- [x] 啟用測試模式
- [x] 建立 2 個產品（Starter, Pro）
- [x] 每個產品建立 2 個價格（Monthly, Yearly）
- [x] 記錄 4 個 Price IDs
- [x] 更新資料庫 `stripe_price_mapping`
- [x] 取得 API Keys

### 3. Webhook 設定（✅ 100% 本地開發）

本地開發已完成：
- [x] 安裝 Stripe CLI
- [x] 登入 Stripe CLI
- [x] 使用 `stripe listen` 轉發 Webhook
- [x] 取得 Webhook Secret 並設定
- [x] 測試事件成功觸發和接收
- [x] 簽名驗證正常運作（async 修正）

生產環境待完成：
- [ ] 在 Dashboard 建立正式 Webhook endpoint
- [ ] 配置 Customer Portal

### 4. 環境變數設定（✅ 100% 本地開發）

已完成：
- [x] Stripe Keys 已加入 `.dev.vars`
- [x] Webhook Secret 已設定
- [x] 環境識別已設定（development）
- [x] Worker 正確載入所有變數

**重要經驗**：
- ✅ 本地開發用 `.dev.vars`（不用 wrangler secret）
- ✅ 生產環境才用 `wrangler secret put`
- ⚠️ Stripe CLI 的 webhook secret 會變動
- ⚠️ 修改 `.dev.vars` 後需要重啟 Worker

### 5. 前端整合（0%）

需要實現：
- [ ] Pricing 頁面加上「Get Started」功能
- [ ] 呼叫 `/api/checkout/create` API
- [ ] 重導向到 Stripe Checkout
- [ ] 處理成功/取消回調
- [ ] Dashboard 顯示訂閱狀態
- [ ] 加上「管理訂閱」按鈕（呼叫 `/api/checkout/portal`）
- [ ] 優惠碼輸入框（可選）

### 6. 測試（0%）

需要測試：
- [ ] 本地 Webhook 接收（使用 Stripe CLI）
- [ ] 完整付款流程
- [ ] Credits 發放邏輯
- [ ] 優惠碼功能
- [ ] 訂閱管理（取消、升級）

### 7. 生產環境準備（0%）

上線前需要：
- [ ] Stripe 帳號 KYC 認證
- [ ] 建立生產環境產品
- [ ] 設定生產環境 Webhook
- [ ] 設定生產環境 Secrets
- [ ] 最終測試

---

## 📋 下一步行動清單

### 立即執行（今天）

1. **執行 Migration**
   ```bash
   cd /Users/JL/Development/media/oao_to/api-worker
   wrangler d1 execute oao-to-db --local --file=./migrations/0007_stripe_integration.sql
   ```

2. **驗證 Migration**
   ```bash
   wrangler d1 execute oao-to-db --local --command="SELECT * FROM stripe_price_mapping;"
   ```

### 短期（本週）

3. **設定 Stripe 帳號**
   - 跟著 `STRIPE_SETUP_GUIDE.md` 步驟 1-7
   - 預計時間：1-2 小時

4. **本地測試**
   - 使用 Stripe CLI 測試 Webhook
   - 預計時間：1 小時

### 中期（下週）

5. **前端整合**
   - 實現 Pricing 頁面功能
   - Dashboard 訂閱管理
   - 預計時間：1-2 天

6. **完整測試**
   - 端到端測試所有流程
   - 預計時間：1 天

### 長期（上線前）

7. **生產環境部署**
   - Stripe 認證
   - 生產環境設定
   - 最終測試
   - 預計時間：1-2 天

---

## 📁 檔案結構

```
/Users/JL/Development/media/oao_to/
├── payment/                          ← 新建立的資料夾
│   ├── README.md                     ← 總覽和導航
│   ├── IMPLEMENTATION_STATUS.md      ← 本文件
│   ├── STRIPE_INTEGRATION_GUIDE.md   ← 完整技術指南
│   ├── PRICING_MANAGEMENT_STRATEGY.md ← 價格管理策略
│   └── STRIPE_SETUP_GUIDE.md         ← 設定教學
│
├── api-worker/
│   ├── migrations/
│   │   └── 0007_stripe_integration.sql  ← 新 Migration
│   │
│   ├── src/
│   │   ├── types.ts                  ← 已更新（Stripe types）
│   │   ├── index.ts                  ← 已更新（整合 routes）
│   │   │
│   │   ├── utils/
│   │   │   └── stripe.ts             ← 新檔案
│   │   │
│   │   └── routes/
│   │       ├── checkout.ts           ← 新檔案
│   │       ├── stripe-webhook.ts     ← 新檔案
│   │       └── promo-codes.ts        ← 新檔案
│   │
│   └── package.json                  ← 已更新（stripe 依賴）
│
└── frontend/
    └── src/
        └── pages/
            └── Pricing.tsx           ← 待更新
```

---

## 💰 成本估算

### 開發成本
- 後端實作：已完成（約 6 小時）
- 前端整合：預估 1-2 天
- 測試和除錯：預估 1 天
- **總計：2-3 天**

### 運營成本（Stripe）
- 交易費：2.9% + $0.30 per transaction
- 月費：$0（沒有固定月費）
- 假設每月 100 筆訂閱 × $29 = $2,900
- Stripe 手續費：約 $114/月
- **淨收入：約 $2,786/月**

---

## 🎯 關鍵指標

### 程式碼統計
- **新增檔案**：8 個
- **更新檔案**：2 個
- **新增程式碼**：約 2,500 行
- **文檔**：約 5,000 行

### 功能覆蓋
- **API 端點**：8 個
- **Webhook 事件**：6 個
- **資料庫表**：6 個
- **Types 定義**：15+ 個

---

## ⚠️ 重要注意事項

### 安全性
1. ✅ 所有 Webhook 都有簽名驗證
2. ✅ Secret Keys 使用環境變數
3. ✅ 實現了冪等性處理
4. ✅ 測試/生產環境分離

### 資料一致性
1. ✅ Webhook 事件都有日誌
2. ✅ 失敗的事件會記錄錯誤
3. ✅ 支援重試機制
4. ✅ 交易記錄完整

### 彈性設計
1. ✅ 價格可在資料庫管理
2. ✅ Credits 配置完全自主
3. ✅ 優惠碼系統獨立
4. ✅ Stripe 只負責收錢

---

## 📞 需要幫助？

### 查找資訊
- **技術實現問題** → `STRIPE_INTEGRATION_GUIDE.md`
- **價格管理問題** → `PRICING_MANAGEMENT_STRATEGY.md`
- **設定步驟問題** → `STRIPE_SETUP_GUIDE.md`
- **總覽和導航** → `README.md`

### 常見問題
- Migration 執行失敗 → 檢查 SQLite 語法
- Webhook 簽名失敗 → 確認使用正確的 secret
- 價格映射找不到 → 檢查 `stripe_price_id` 是否正確

---

## ✨ 總結

### 已完成
- ✅ 完整的後端架構
- ✅ 所有 API 端點
- ✅ Webhook 事件處理
- ✅ 優惠碼系統
- ✅ 詳盡的文檔

### 還需要
- ⏳ 執行 Migration
- ⏳ Stripe 帳號設定
- ⏳ 環境變數配置
- ⏳ 前端整合
- ⏳ 測試和部署

### 預計完成時間
**4-5 個工作日**（扣除設定和測試時間）

---

**狀態**：後端和測試環境完成，準備前端整合  
**下一步**：前端整合 → 完整流程測試 → 生產環境準備  
**風險評估**：低（架構驗證，Webhook 測試通過）

---

## 🎓 重要經驗教訓

### 1. 環境變數管理

**錯誤做法**：
- ❌ 把 Secret Keys 貼在聊天/文檔
- ❌ 本地開發用 `wrangler secret put`
- ❌ 使用 `.env` 檔案

**正確做法**：
- ✅ 本地開發：編輯 `.dev.vars`
- ✅ 生產環境：`wrangler secret put`
- ✅ Secret 洩漏立即 Roll key

**參考文件**：`/standards/ENVIRONMENT_VARIABLES_AND_SECRETS.md`

### 2. Stripe Webhook 簽名驗證

**問題**：
```
CryptoProviderOnlySupportsAsyncError: 
SubtleCryptoProvider cannot be used in a synchronous context
```

**原因**：
- Cloudflare Workers 的 crypto 操作必須非同步

**解決**：
```typescript
// ❌ 錯誤
stripe.webhooks.constructEvent(payload, signature, secret);

// ✅ 正確
await stripe.webhooks.constructEventAsync(payload, signature, secret);
```

### 3. Migration FOREIGN KEY 錯誤

**問題**：
- 重建表時 FOREIGN KEY constraint 失敗

**解決**：
```sql
-- 開始時
PRAGMA foreign_keys=OFF;

-- 重建表...

-- 結束時
PRAGMA foreign_keys=ON;
```

### 4. Stripe CLI Webhook Secret

**重要發現**：
- ⚠️ 每次重啟 `stripe listen` 會產生新的 secret
- ✅ 需要同步更新 `.dev.vars`
- ✅ 更新後需要重啟 Worker
- ✅ 開發時保持 CLI 運行（不重啟）

---

🎉 **後端實作和測試環境完成！準備前端整合！**
