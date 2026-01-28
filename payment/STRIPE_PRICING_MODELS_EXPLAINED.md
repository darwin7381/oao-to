# Stripe Pricing Models 完整說明

**目的**：澄清 Stripe 計費模式與我們業務邏輯的差異  
**日期**：2026-01-29  
**重要性**：⭐⭐⭐⭐⭐ 避免混淆和錯誤選擇

---

## 🎯 核心概念

### **關鍵理解**

```
Stripe Pricing Model ≠ 你的業務邏輯

Stripe 只管：收多少錢
你的系統管：給用戶什麼、怎麼限制
```

---

## 📊 Stripe 的四種 Pricing Models

### 1. **Flat Rate**（固定費率）⭐ 我們使用這個

#### **定義**

每個計費週期收取固定金額，不論實際使用量。

#### **Stripe 如何計費**

```
用戶訂閱 Pro Plan:
├─ 每月收費：$29（固定）
├─ 用 1 次 API？   → 收 $29
├─ 用 10,000 次？  → 收 $29
├─ 用 50,000 次？  → 收 $29
└─ 完全不用？      → 收 $29
```

**Stripe 不知道也不關心用戶用了多少。**

#### **實際應用場景**

- ✅ Netflix：$15.99/month（不管看幾部電影）
- ✅ Spotify：$9.99/month（不管聽幾首歌）
- ✅ GitHub Pro：$4/month（不管建幾個 repo）
- ✅ **我們的系統**：$29/month（不管呼叫幾次 API）

#### **適合誰**

- ✅ 傳統 SaaS 訂閱服務
- ✅ 用戶友善（價格可預測）
- ✅ 簡單易懂
- ✅ 不需要追蹤詳細使用量（給 Stripe）

---

### 2. **Package Pricing**（套餐定價）

#### **定義**

按「包裹/批次」計費，每個包裹包含固定數量的單位。

#### **Stripe 如何計費**

```
每 100 個 API calls = 1 個包裹 = $10

用戶購買：
├─ 1 個包裹（100 calls）  → 收 $10
├─ 3 個包裹（300 calls）  → 收 $30
├─ 5 個包裹（500 calls）  → 收 $50
└─ 用戶一次購買多個包裹
```

**用戶必須「提前購買」固定數量的包裹。**

#### **實際應用場景**

- 📦 簡訊服務：100 則簡訊包 = $5
- 📦 雲端儲存：100GB 空間包 = $10
- 📦 API Credits：1000 credits 包 = $20

#### **適合誰**

- ⚠️ 賣「批次/包裹」的服務
- ⚠️ 用戶一次買多個單位
- ⚠️ 不是按月訂閱，是按需購買

#### **我們需要嗎？**

❌ **不需要**
- 我們是固定月費訂閱
- 不是賣「100 calls 包」或「1000 calls 包」
- （但我們有「一次性購買 Credits」功能，那是用 Payment Intent，不是 Subscription）

---

### 3. **Tiered Pricing**（分層定價）

#### **定義**

根據使用量區間，每個區間有不同的單價，用得越多單價越便宜。

#### **Stripe 如何計費**

```
定價結構：
├─ Tier 1: 0-1,000 calls    = $0.01/call
├─ Tier 2: 1,001-5,000 calls = $0.008/call
└─ Tier 3: 5,001+ calls     = $0.005/call

用戶使用 3,000 calls：
├─ 前 1,000 calls × $0.01  = $10
├─ 後 2,000 calls × $0.008 = $16
└─ 總計 = $26
```

**用多少付多少，但用越多單價越便宜。**

#### **實際應用場景**

- 📊 AWS EC2：用量越大，每單位越便宜
- 📊 Twilio：簡訊數量越多，單價越低
- 📊 SendGrid：Email 越多，單價越便宜

#### **適合誰**

- ⚠️ 用量計費服務
- ⚠️ 鼓勵大量使用
- ⚠️ 需要追蹤精確使用量（報告給 Stripe）
- ⚠️ B2B 服務（企業客戶）

#### **我們需要嗎？**

❌ **不需要**
- 我們是固定月費，不是按用量計費
- 超額不透過 Stripe 收費（是扣我們自己的 Pool B）
- 不需要回報使用量給 Stripe

---

### 4. **Usage-based Pricing**（用量計費）

#### **定義**

完全按實際使用量計費，用多少付多少（像水電費）。

#### **Stripe 如何計費**

```
每個 API call = $0.01

用戶本月使用：
├─ 500 calls   → 月底收 $5
├─ 10,000 calls → 月底收 $100
├─ 100,000 calls → 月底收 $1,000
└─ 0 calls     → 收 $0
```

**完全按實際使用量，沒有固定月費。**

#### **Stripe 需要什麼**

你必須：
1. 設定 Usage Meter（使用量計量器）
2. 定期回報用戶使用量給 Stripe
3. Stripe 根據使用量計費

```typescript
// 每次 API call 都要報告給 Stripe
await stripe.subscriptionItems.createUsageRecord(
  subscriptionItemId,
  { quantity: 1, timestamp: now }
);
```

#### **實際應用場景**

- ☁️ Stripe 自己：按交易量收費
- ☁️ Twilio：按簡訊/通話數量
- ☁️ AWS：按實際使用的資源
- ☁️ Cloudflare Workers：按請求數量

#### **適合誰**

- ⚠️ 公用事業型服務
- ⚠️ 完全彈性計費
- ⚠️ 使用量差異很大
- ⚠️ 願意複雜的計費邏輯

#### **我們需要嗎？**

❌ **不需要**
- 我們有固定月費（$29/month）
- 不是「用多少付多少」
- 超額不透過 Stripe 計費
- 不需要回報使用量給 Stripe

---

## 🏗️ 我們的系統架構

### **雙池制（Dual Pools）設計**

```
┌─────────────────────────────────────────────┐
│         用戶訂閱 Pro Plan ($29/month)        │
├─────────────────────────────────────────────┤
│                                             │
│  Pool A: 每月池（Monthly Pool）             │
│  ├─ 每月配額：10,000 API calls              │
│  ├─ 免費的（包含在 $29 訂閱費中）            │
│  ├─ 每月 1 號重置                           │
│  └─ 用不完就消失                            │
│                                             │
│  Pool B: 永久池（Permanent Pool）           │
│  ├─ 購買的或贈送的 credits                  │
│  ├─ 永久有效，不會重置                      │
│  └─ Pool A 用完後才扣這個                   │
│                                             │
│  扣款順序：Pool A → Pool B                  │
│  Pool B 用完？無法使用（需購買 credits）     │
└─────────────────────────────────────────────┘
```

### **使用者體驗流程**

```
Step 1: 用戶訂閱 Pro Plan
├─ Stripe 收取：$29/month (Flat rate)
└─ 用戶獲得：10,000 calls/month (Pool A)

Step 2: 用戶使用 API（本月第 1-10,000 次）
├─ 扣除：Pool A（monthly_used + 1）
├─ Pool B：不變
└─ 費用：$0（包含在訂閱費中）

Step 3: 用戶超額使用（本月第 10,001 次）
├─ Pool A：已用完
├─ 扣除：Pool B（balance - 1）
├─ Stripe：不知道，不收費
└─ 費用：$0（但消耗了永久 credits）

Step 4: Pool B 也用完了
├─ 拒絕服務
├─ 提示：「Credits 不足，請購買」
└─ 用戶可選擇購買 credits（一次性付款）

Step 5: 下個月 1 號
├─ Stripe 自動扣款：$29
├─ Pool A 重置：10,000 calls
└─ Pool B：保持不變（永久有效）
```

---

## 🎯 為什麼我們選擇 Flat Rate？

### **原因 1：Stripe 收的是固定月費**

```
Pro Plan 訂閱：
├─ 每月收費：$29（固定）
├─ 不管用多少 API calls
├─ 不需要追蹤使用量（給 Stripe）
└─ 符合 Flat rate 的定義
```

### **原因 2：超額不透過 Stripe 計費**

```
用戶超過 10,000 calls：
├─ Stripe：不知道、不收費
├─ 我們的系統：扣 Pool B
└─ 這不是 Stripe 的 Usage-based pricing
```

### **原因 3：業務邏輯在我們系統實現**

```
配額管理：
├─ 追蹤使用量：我們的系統
├─ 扣除 credits：我們的資料庫
├─ 限制訪問：我們的 API middleware
└─ Stripe 完全不參與這些邏輯
```

### **原因 4：用戶體驗友善**

```
用戶視角：
├─ 固定月費 $29（可預測）
├─ 包含 10,000 calls
├─ 超額？扣永久 credits（已購買的）
└─ 不會突然收到高額帳單
```

---

## ❌ 如果選錯會怎樣？

### **如果選了 Usage-based**

```
問題：
├─ Stripe 期望你回報使用量
├─ 需要設定 Usage Meter
├─ 每次 API call 都要通知 Stripe
├─ 計費會變成「用多少付多少」
├─ 沒有固定 $29/month 的概念
└─ 實現變得超級複雜
```

**結果**：
- ❌ 不符合你的商業模式
- ❌ 用戶費用不可預測
- ❌ 需要大量額外開發

---

### **如果選了 Tiered pricing**

```
問題：
├─ Stripe 期望根據使用量分層計費
├─ 例如：0-10K = $29, 10K-50K = $49
├─ 需要回報使用量給 Stripe
├─ 月費會隨使用量變動
└─ 不符合你的設計（超額扣 Pool B，不加月費）
```

**結果**：
- ❌ 商業模式不符
- ❌ Pool B 的概念無法實現

---

### **如果選了 Package pricing**

```
問題：
├─ 不是訂閱制，是「購買批次」
├─ 用戶要買「100 calls 包」、「1000 calls 包」
├─ 不是每月自動續訂
└─ 完全不同的商業模式
```

**結果**：
- ❌ 不是訂閱服務
- ❌ 用戶體驗差

---

## 📊 對照表：Stripe vs 我們的系統

| 項目 | Stripe 看到/處理 | 我們的系統處理 |
|------|-----------------|---------------|
| **訂閱費** | $29/month (Flat rate) | 收到錢後給 Plan |
| **包含內容** | 不知道 | 10,000 calls (Pool A) |
| **追蹤使用量** | 不追蹤 | 我們的資料庫追蹤 |
| **超過配額** | 不知道 | 扣 Pool B credits |
| **Pool B 用完** | 不知道 | 禁止使用 |
| **購買 Credits** | 另一筆交易 (Payment Intent) | 增加 Pool B |
| **月初重置** | 自動扣款 $29 | Pool A 重置為 10,000 |
| **取消訂閱** | 停止扣款 | Pool A 降為 Free 配額 |

---

## 🤔 常見疑問

### Q1: "我們有配額限制，不是 Flat rate 嗎？"

**A**: 
- **Stripe 的 Flat rate** = 訂閱費是固定的
- **你的配額制** = 在你自己的系統實現
- **兩者不衝突**！

```
比喻：
├─ Flat rate = 健身房月費 $99（固定）
└─ 配額制 = 每月可以去 30 次（健身房自己管理）

健身房不會告訴信用卡公司「這個人來了 31 次」
信用卡公司只知道：每月扣 $99
```

---

### Q2: "超額會扣 Pool B，這算 Usage-based 嗎？"

**A**: 
不算！因為：
- **Usage-based** = Stripe 根據使用量計費
- **你的超額** = 扣你自己系統的 credits，Stripe 不知道

```
用戶超過 10,000 calls：
├─ Stripe：還是只收 $29/month（不變）
├─ 你的系統：扣 Pool B credits
└─ Stripe 完全不參與超額計費
```

---

### Q3: "如果未來想改成 Usage-based 怎麼辦？"

**A**: 
可以改，但需要：
1. 重新設計訂閱結構
2. 設定 Stripe Usage Meter
3. 每次 API call 回報給 Stripe
4. 調整前端顯示
5. 用戶溝通（定價模式改變）

**建議**：
- 先用 Flat rate（簡單、用戶友善）
- 驗證市場需求
- 真的需要時再改

---

### Q4: "一次性購買 Credits 用哪個 Model？"

**A**: 
不用訂閱 Pricing Model！

```
一次性購買：
├─ 使用：Payment Intent（不是 Subscription）
├─ 用戶付：$50
├─ 獲得：5,000 credits
└─ 加入 Pool B
```

這是**獨立的交易**，不是訂閱的一部分。

---

## ✅ 決策總結

### **我們選擇 Flat Rate 因為**：

1. ✅ **Stripe 收固定月費**（$29/month）
2. ✅ **不需要回報使用量給 Stripe**
3. ✅ **超額在我們系統處理**（Pool B）
4. ✅ **簡單、可預測、用戶友善**
5. ✅ **符合傳統 SaaS 訂閱模式**

### **我們不選其他 Model 因為**：

- ❌ **Usage-based**: 太複雜，不符合商業模式
- ❌ **Tiered**: 超額不會增加月費，不符合設計
- ❌ **Package**: 不是批次購買，是訂閱制

---

## 📝 實作檢查清單

建立 Stripe 產品時：

- [x] **Product name**: Pro Plan
- [x] **Description**: For serious creators - 10,000 API calls per month
- [x] **Pricing**: Recurring ✓
- [x] **Pricing model**: Flat rate ✓
- [x] **Amount**: $29.00 (monthly) / $289.00 (yearly)
- [x] **Billing period**: Monthly / Yearly

**不要**：
- [ ] ❌ 選擇 Usage-based
- [ ] ❌ 設定 Usage Meter
- [ ] ❌ 選擇 Tiered pricing
- [ ] ❌ 選擇 Package pricing

---

## 🎓 學習資源

### Stripe 官方文檔

- [Pricing Models Overview](https://stripe.com/docs/billing/prices-guide)
- [Flat Rate Pricing](https://stripe.com/docs/billing/subscriptions/model)
- [Usage-based Billing](https://stripe.com/docs/billing/subscriptions/usage-based)
- [Tiered Pricing](https://stripe.com/docs/billing/subscriptions/tiers)

### 相關文件

- `/payment/STRIPE_INTEGRATION_GUIDE.md` - 技術實現指南
- `/payment/PRICING_MANAGEMENT_STRATEGY.md` - 價格管理策略
- `/CREDITS_SYSTEM_DEFINITIVE_DESIGN.md` - Credits 系統設計

---

## 🎯 快速參考

### 選擇 Pricing Model 的決策樹

```
你的訂閱費是固定的嗎？
├─ 是 → 用 Flat rate
└─ 否 → 繼續

用戶付的錢會隨使用量變化嗎？
├─ 是 → Usage-based 或 Tiered
└─ 否 → Flat rate

你需要 Stripe 追蹤使用量嗎？
├─ 是 → Usage-based 或 Tiered
└─ 否 → Flat rate

用戶是「訂閱服務」還是「購買批次」？
├─ 訂閱 → Flat rate, Usage-based, 或 Tiered
└─ 批次 → Package pricing
```

**我們的答案**：
- ✅ 訂閱費固定 ($29/month)
- ✅ 不隨使用量變化（超額扣 Pool B，不加月費）
- ✅ 不需要 Stripe 追蹤使用量
- ✅ 訂閱服務

**結論**：**Flat rate** ⭐

---

**最後更新**：2026-01-29  
**維護者**：開發團隊  
**狀態**：正式文檔

---

**記住**：
> Stripe 只管收錢（Flat rate $29/month）  
> 業務邏輯由我們管（Pool A + Pool B）  
> 兩者分工明確，各司其職！

🎉 **沒有混淆，沒有疑慮！**
