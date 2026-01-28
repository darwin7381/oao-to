# Payment System Documentation

這個資料夾包含所有與支付系統相關的文檔和指南。

---

## 📁 文件清單

### 1. [STRIPE_INTEGRATION_GUIDE.md](./STRIPE_INTEGRATION_GUIDE.md)
**完整的技術整合指南**

包含內容：
- 架構概覽和工作流程
- Stripe 功能詳細說明（Checkout, Webhooks, Customer Portal 等）
- 資料庫 Schema 設計
- API 端點實現細節
- Webhook 事件處理邏輯
- 安全性最佳實踐
- 測試流程
- 上線檢查清單
- 常見問題 FAQ

**適合對象**：開發者、技術實現者

---

### 2. [PRICING_MANAGEMENT_STRATEGY.md](./PRICING_MANAGEMENT_STRATEGY.md)
**價格管理和靈活性策略**

包含內容：
- 如何保持定價控制權
- Stripe vs 自主系統的分工
- 優惠碼系統設計
- 價格調整策略
- 促銷活動實現
- 個人化定價
- 實際應用場景範例

**適合對象**：產品經理、運營人員、開發者

**解答的核心問題**：
> "用了 Stripe 之後，價格、credits、折扣碼是不是都要在 Stripe 管理？"
> 
> **答案：不用！你可以保持 100% 的控制權。**

---

### 3. [STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md)
**從零開始的設定教學**

包含內容：
- Stripe 帳號註冊
- 產品和價格設定
- 資料庫 Migration 執行
- API Keys 取得和設定
- Webhook 配置
- Customer Portal 啟用
- 本地開發測試
- 生產環境部署

**適合對象**：第一次設定 Stripe 的開發者

**預計時間**：30-60 分鐘

---

## 🚀 快速開始

### 如果你是第一次接觸 Stripe

**推薦閱讀順序**：
1. 先讀 [STRIPE_INTEGRATION_GUIDE.md](./STRIPE_INTEGRATION_GUIDE.md) 的「架構概覽」章節（了解整體）
2. 再讀 [PRICING_MANAGEMENT_STRATEGY.md](./PRICING_MANAGEMENT_STRATEGY.md)（消除疑慮）
3. 最後跟著 [STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md) 一步步設定

### 如果你已經在實作中

**查找資料**：
- 需要實現細節 → [STRIPE_INTEGRATION_GUIDE.md](./STRIPE_INTEGRATION_GUIDE.md)
- 需要調整價格/折扣 → [PRICING_MANAGEMENT_STRATEGY.md](./PRICING_MANAGEMENT_STRATEGY.md)
- 遇到設定問題 → [STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md) 的常見問題

---

## 📊 實現狀態

### ✅ 已完成

- [x] 資料庫 Migration（`0007_stripe_integration.sql`）
- [x] Types 定義（`src/types.ts`）
- [x] Stripe Utils（`src/utils/stripe.ts`）
- [x] Checkout API（`src/routes/checkout.ts`）
- [x] Webhook 處理（`src/routes/stripe-webhook.ts`）
- [x] 優惠碼 API（`src/routes/promo-codes.ts`）
- [x] 主 index.ts 整合
- [x] 安裝 `stripe` npm package

### 🔄 待完成

- [ ] 執行 Migration 0007
- [ ] 設定 Stripe 帳號
- [ ] 建立 Stripe 產品和價格
- [ ] 設定環境變數
- [ ] 前端整合
- [ ] 測試完整流程
- [ ] 部署到生產環境

---

## 🛠️ 技術架構

### 資料流

```
用戶 → 前端 (React) → API Worker → Stripe API
                          ↓
                    D1 Database
                          ↑
                   Stripe Webhook
```

### 核心概念

**Stripe 負責**：
- ✅ 處理支付
- ✅ 管理訂閱扣款
- ✅ 發送事件通知

**你的系統負責**：
- ✅ Credits 配置和發放
- ✅ 功能權限控制
- ✅ 優惠碼邏輯
- ✅ 業務規則

**協同方式**：
- 通過 `metadata` 傳遞參數
- Webhook 執行你的業務邏輯

---

## 📈 開發時間估算

| 階段 | 任務 | 預估時間 |
|------|------|----------|
| 1 | Stripe 帳號設定 | 0.5 天 |
| 2 | 資料庫 Migration | 0.5 天 |
| 3 | 後端 API 實現 | 已完成 |
| 4 | Webhook 測試 | 1 天 |
| 5 | 前端整合 | 1 天 |
| 6 | 完整測試 | 1 天 |
| 7 | 生產環境準備 | 0.5 天 |
| **總計** | | **4.5 天** |

---

## 🔐 安全性注意事項

### 必須遵守

1. ✅ **永遠驗證 Webhook 簽名**
2. ✅ **Secret Key 絕不放前端**
3. ✅ **使用環境變數管理敏感資訊**
4. ✅ **處理冪等性**（同一事件可能收多次）
5. ✅ **測試和生產環境分離**

### 環境變數清單

**測試環境**：
- `STRIPE_SECRET_KEY_TEST`
- `STRIPE_PUBLISHABLE_KEY_TEST`
- `STRIPE_WEBHOOK_SECRET_TEST`
- `ENVIRONMENT=development`

**生產環境**：
- `STRIPE_SECRET_KEY`（Live）
- `STRIPE_PUBLISHABLE_KEY`（Live）
- `STRIPE_WEBHOOK_SECRET`（Live）
- `ENVIRONMENT=production`

---

## 📞 支援和資源

### 官方資源

- [Stripe 文檔](https://stripe.com/docs)
- [Stripe API 參考](https://stripe.com/docs/api)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe CLI 文檔](https://stripe.com/docs/stripe-cli)

### 測試工具

- **測試卡號**：`4242 4242 4242 4242`
- **Stripe CLI**：`brew install stripe/stripe-cli/stripe`
- **觸發測試事件**：`stripe trigger checkout.session.completed`

### 專案文件

- 主專案 README：`/Users/JL/Development/media/oao_to/README.md`
- Credits 系統設計：`/Users/JL/Development/media/oao_to/CREDITS_SYSTEM_DEFINITIVE_DESIGN.md`
- API 文檔：`/Users/JL/Development/media/oao_to/api-worker/README.md`

---

## 🎯 關鍵里程碑

### Milestone 1: 本地開發環境運行
- [ ] Migration 執行成功
- [ ] Stripe 測試模式設定完成
- [ ] 可以建立 Checkout Session
- [ ] Webhook 可接收事件

### Milestone 2: 完整流程測試
- [ ] 可以完成測試付款
- [ ] 資料庫正確更新
- [ ] Credits 正確發放
- [ ] Customer Portal 可訪問

### Milestone 3: 生產環境就緒
- [ ] Stripe 帳號認證完成
- [ ] 生產環境產品建立
- [ ] 生產環境 Webhook 設定
- [ ] 所有測試通過

---

## 💡 最佳實踐

### 開發建議

1. **先用低價測試**
   - 建議測試產品用 $0.01 或 $1.00
   - 避免在開發中浪費真實金錢

2. **使用 Stripe CLI**
   - 本地開發必備工具
   - 可以模擬各種事件
   - 轉發 Webhook 到 localhost

3. **記錄所有 Price IDs**
   - 建立產品後立即記錄
   - 更新資料庫 mapping
   - 文檔化所有配置

4. **分階段測試**
   - 先測試 Checkout
   - 再測試 Webhook
   - 最後測試完整流程

### 運營建議

1. **監控 Webhook 狀態**
   - 定期檢查 `stripe_events` 表
   - 查看是否有處理失敗的事件
   - 設定警報機制

2. **保持價格靈活性**
   - 所有配置放在自己的資料庫
   - Stripe 只管收錢
   - 你決定業務邏輯

3. **優惠碼策略**
   - 用自己的系統管理
   - 可以給 bonus credits
   - 更靈活的促銷

---

## 📝 更新日誌

### 2026-01-28
- ✅ 創建完整的技術文檔
- ✅ 實現所有後端 API
- ✅ 建立資料庫 Migration
- ✅ 安裝必要依賴
- ⏳ 等待執行 Migration 和 Stripe 設定

---

**文檔維護者**：開發團隊  
**最後更新**：2026-01-28  
**版本**：V1.0

有任何問題，請參考對應的詳細文檔或聯繫團隊！
