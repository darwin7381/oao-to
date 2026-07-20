# 訂閱系統設計決策

**日期**：2026-01-29  
**狀態**：已確認並實施  
**重要性**：⭐⭐⭐⭐⭐ 核心業務邏輯

---

## 🎯 核心決策

### 1. Stripe 訂閱升降級策略

#### **升級：Proration（按比例計費）**

**行為**：
- 用戶升級立即生效
- Stripe 計算剩餘天數差額
- 立即扣款差額

**範例**：
```
1/15 訂閱 Starter ($9/月)
1/30 升級 Pro ($29/月)

Stripe 計算：
- Starter 退款：$4.50（剩餘 15 天）
- Pro 費用：$14.50（剩餘 15 天）
- 實際扣款：$10

2/30 開始：
- 正常扣 $29/月
```

**設定**：
```typescript
proration_behavior: 'create_prorations'  // Stripe 默認值
```

---

#### **降級：Period End（當期結束才生效）**

**行為**：
- 降級不立即生效
- 讓用戶用完當期
- 下個週期才降級

**範例**：
```
用戶是 Pro Plan ($29/月)
1/15 申請降級到 Starter

1/15-2/15：
- 仍然是 Pro Plan
- 仍然有 10,000 配額
- 已經付了錢

2/15 開始：
- 降級到 Starter
- 配額變成 1,000
- 扣款 $9/月
```

**設定**：
```typescript
proration_behavior: 'none'
cancel_at_period_end: true
```

**好處**：
- ✅ 用戶滿意（用完再降）
- ✅ 避免退款流程
- ✅ 用戶可能改變主意

---

### 2. Coupon 管理策略

#### **三種 Coupon 類型**

**A. Once（單次折扣）**
```
duration: 'once'
用途：新用戶優惠、限時促銷

範例：
- "LAUNCH50"：首月 50% OFF
- 第 1 個月：$14.50
- 第 2 個月：$29（恢復原價）
```

**B. Repeating（限定次數）**
```
duration: 'repeating'
duration_in_months: 3
用途：限時免費、推廣活動

範例：
- "3MONTHS_FREE"：前 3 個月免費
- 第 1-3 個月：$0
- 第 4 個月：$29（恢復原價）
```

**C. Forever（永久折扣）**
```
duration: 'forever'
用途：VIP、合作夥伴、終身優惠

範例：
- "VIP_FREE"：永久免費
- 每個月：$0
- ✅ 有 Stripe 訂閱（會自動重置配額）
- ✅ 不需要 Cron Job
```

---

#### **後台 Coupon 管理**

**功能**：
```
Admin → Coupons
├─ 創建 Coupon
│  ├─ 類型：Once / Repeating / Forever
│  ├─ 折扣：10% / 50% / 100%
│  ├─ 適用：All / Starter / Pro
│  ├─ 期限：設定有效期
│  └─ 用量：限制使用次數
│
├─ 查看列表
│  ├─ 使用統計
│  └─ 啟用/停用
│
└─ 生成專屬 Code
   └─ 給特定用戶
```

---

#### **VIP/測試用戶策略**

**決策**：使用 **Forever 100% OFF Coupon** ✅

**理由**：
1. ✅ 完全通過 Stripe 管理
2. ✅ 自動月配額重置
3. ✅ 不需要 Cron Job
4. ✅ 有完整記錄和 Portal
5. ✅ 可隨時取消/管理

**實施**：
```
管理員操作：
1. 建立 Coupon "VIP_USER_JOEY_2026"
   - 100% OFF
   - Forever
   - 只能用一次
2. 給用戶這個 Code
3. 用戶用 Code 訂閱 Pro Plan
   - Stripe Checkout 顯示 $0
   - 完成訂閱
   - 每月自動續訂（$0）
```

**不需要 Cron Job！** ✅

---

### 3. Trial Period（免費試用）

**是的！這是獨立的功能**：

```javascript
// 方式 1：創建訂閱時設定
stripe.subscriptions.create({
  trial_period_days: 14
});

// 方式 2：在 Stripe Dashboard 產品設定預設試用期
Product → Default trial: 14 days
```

**與 Coupon 的差別**：

| 方式 | 第一個月 | 需要信用卡 | 適合 |
|------|----------|-----------|------|
| **Trial Period** | 完全免費 | 需要（但不扣款） | 新用戶獲取 |
| **Coupon 100% OFF** | $0 | 需要 | 促銷活動 |
| **Forever Coupon** | 永久 $0 | 需要 | VIP 用戶 |

**推薦組合**：
```
新用戶：Trial 14 天 + Pro Plan
促銷：Coupon "LAUNCH50" 首月 50% OFF
VIP：Forever Coupon 100% OFF
```

---

## 3. 月配額記錄策略

### 決策：**保留已用量 + 完整記錄**

#### **升級時**

**credits 表變化**：
```
plan_type: 'starter' → 'pro'
monthly_used: 500（保留）
balance: +500（獎勵）
```

**交易記錄**：
```sql
-- 記錄 1：訂閱（配額變化）
type: 'subscription'
amount: 0  -- balance 沒變
metadata: {
  "action": "upgrade",
  "from_plan": "starter",
  "to_plan": "pro",
  "quota_from": 1000,
  "quota_to": 10000,
  "monthly_used": 500,
  "immediate_increase": 9500  -- 當下實際增加
}
description: "升級到 Pro Plan"

-- 記錄 2：獎勵
type: 'bonus'
amount: 500
description: "Pro Plan 升級獎勵"
```

**前端顯示**：
```
升級到 Pro Plan              → 月配額：10,000/月
                                立即增加：+9,500 credits

Pro Plan 升級獎勵            → +500 credits
```

---

#### **每月重置時**

**credits 表變化**：
```
monthly_used: 3,500 → 0
monthly_reset_at: 更新
balance: 不變
```

**交易記錄**：
```sql
type: 'quota_reset'
amount: 0
metadata: {
  "quota": 10000,
  "used_before": 3500,
  "restored": 3500
}
description: "月配額重置"
```

**前端顯示**：
```
月配額重置                   → 恢復 3,500 credits
                                (配額：10,000/月)
```

---

### 為什麼這個設計最好？

1. ✅ **公平透明**：清楚顯示配額總量和當下增加量
2. ✅ **符合 Proration**：已用的就扣除
3. ✅ **每月清楚**：重置時顯示恢復了多少
4. ✅ **統一術語**：全部 credits
5. ✅ **完整記錄**：metadata 保存所有資訊

---

## 📊 完整流程圖

### 用戶訂閱 Pro Plan

```
Step 1: 用戶點擊「Upgrade to Pro」
  ↓
Step 2: Stripe Checkout（可選 Trial 或 Coupon）
  ↓
Step 3: 付款成功
  ↓
Step 4: Webhook 處理
  ├─ 更新 plan_type: 'pro'
  ├─ monthly_used 保留（公平）
  ├─ balance +500（獎勵）
  ├─ 記錄訂閱交易（metadata 記錄完整資訊）
  └─ 記錄獎勵交易
  ↓
Step 5: 前端顯示
  ├─ 訂閱成功頁面
  ├─ Account Activity 顯示兩筆記錄
  └─ 配額卡片顯示 0/10,000
```

### 每月自動續費

```
Step 1: Stripe 自動扣款（每月 15 號，用戶訂閱日）
  ↓
Step 2: invoice.payment_succeeded webhook
  ↓
Step 3: 重置 monthly_used = 0
  ↓
Step 4: 記錄重置交易（恢復了多少）
  ↓
Step 5: 用戶看到「月配額重置 → 恢復 X credits」
```

---

## ✅ 實施計劃

### Phase 1（立即）

- [x] 升級/降級策略確認
- [x] Coupon 策略確認
- [ ] 實現 metadata 記錄
- [ ] 前端顯示邏輯
- [ ] 測試完整流程

### Phase 2（後續）

- [ ] Admin Coupon 管理介面
- [ ] Trial Period 設定
- [ ] 完整測試各種情境

---

**決策已記錄！準備實施！** 🚀
