# Stripe Customer Portal 配置指南

**目標**：實現升級立即生效（Proration）+ 降級延遲生效（Period End）

---

## 📋 配置步驟

### Step 1：前往 Customer Portal 設定

```
Stripe Dashboard → Settings → Billing → Customer portal
```

### Step 2：Subscriptions（訂閱管理）

#### **Allow customers to update subscriptions**
```
✅ 打開（Toggle ON）
```

#### **Subscription products**
```
✅ Customers can switch plans

選擇可以切換的產品：
✅ Pro Plan
  ✅ $29.00 per month
  ✅ $289.00 per year
✅ Starter Plan
  ✅ $9.00 per month  
  ✅ $89.00 per year
```

---

### Step 3：升降級行為設定

#### **When customers change plans or quantities**

**選項說明**：

**選項 A：No charges or credits** ❌ 不選
```
New pricing applies at the next billing cycle.
→ 升級也要等下個週期（不符合需求）
```

**選項 B：Prorate charges and credits** ✅ 選這個
```
Issue a credit for the unused portion of the current billing
period. Charge the new price or adjusted quantity rate for the
remaining time in the period.

→ 升級：立即生效，按比例收費 ✅
→ 降級：也立即生效，按比例退款 ⚠️（但我們可以在 Downgrades 設定）
```

**選項 C：Charge or credit the full difference** ❌ 不選
```
Charge the full price difference if moving to a higher plan or
increasing quantity. Issue a credit if moving to a lower plan or
decreasing quantity.

→ 不按比例，收/退全額差價（不合理）
```

---

### Step 4：降級特殊處理

#### **Downgrades**

**When switching to a cheaper plan**：
```
✅ Wait until end of billing period to update
```

**說明**：
- 降級時不立即生效
- 讓用戶用完當期
- 下個週期才降級
- **覆蓋上面的 Proration 設定**（針對降級）

**When switching to a shorter interval period**：
```
✅ Wait until end of billing period to update
```

---

### Step 5：Cancellations（取消訂閱）

#### **Allow customers to cancel their subscription**
```
✅ 打開（Toggle ON）
```

#### **When canceling**：
```
✅ At period end
```

**說明**：
- 取消不立即生效
- 讓用戶用完當期
- 下個週期才停止

---

### Step 6：Promotion codes（可選）

#### **Promotion codes**
```
✅ Allow customers to apply promotion codes when updating subscriptions
```

**好處**：
- 用戶在 Portal 升級時可以輸入優惠碼
- 不需要回到你的網站

**或者不啟用**：
- 用戶只能在你的 Pricing 頁面用優惠碼
- Portal 只做管理

---

## ✅ 最終配置總結

### 升級行為
```
選擇：Prorate charges and credits
結果：
├─ 立即生效 ✅
├─ 按比例收費 ✅
└─ 符合需求
```

### 降級行為
```
選擇：Wait until end of billing period to update
結果：
├─ 不立即生效 ✅
├─ 用完當期 ✅
├─ 下個週期才降級 ✅
└─ 覆蓋 Proration（針對降級）✅
```

### 取消行為
```
選擇：At period end
結果：
├─ 不立即停止 ✅
├─ 用完當期 ✅
└─ 避免退款糾紛 ✅
```

---

## ⚠️ 重要提醒

### 這個配置看起來矛盾？

**不矛盾！** Stripe 的邏輯：

```
Prorate charges and credits（全域設定）
├─ 適用於：所有訂閱變更
└─ 但：Downgrades 設定會覆蓋

Downgrades: Wait until end（特殊設定）
├─ 只適用於：降級
└─ 覆蓋全域設定
```

**最終行為**：
```
用戶升級（Pro → Enterprise）：
└─ 使用全域設定 → Proration ✅

用戶降級（Pro → Starter）：
└─ 使用 Downgrades 設定 → Period End ✅
```

---

## 🎯 配置後的用戶體驗

### 升級流程
```
用戶在 Portal 點擊「Upgrade to Pro」
    ↓
Stripe 計算 Proration：
├─ Starter 剩餘 15 天退款：$4.50
├─ Pro 剩餘 15 天費用：$14.50
└─ 實際扣款：$10
    ↓
立即升級 ✅
    ↓
用戶立即獲得 Pro 功能
```

### 降級流程
```
用戶在 Portal 點擊「Downgrade to Starter」
    ↓
Stripe 顯示：
「Your plan will change to Starter on Feb 15」
    ↓
不立即扣款/退款
    ↓
用戶繼續使用 Pro 到 2/15
    ↓
2/15 自動降級到 Starter
```

---

## 📸 配置截圖重點

從你的截圖看到：

**圖三**：
```
✅ Customers can switch plans（已打開）

When customers change plans:
⚪ No charges or credits
🔵 Prorate charges and credits ← 選這個！
⚪ Charge or credit the full difference
```

**圖四**：
```
When switching to a cheaper plan:
[Wait until end of billing period to update] ← 選這個！

When switching to a shorter interval:
[Wait until end of billing period to update] ← 選這個！
```

---

## ✅ 配置完成檢查

- [ ] Subscriptions → ✅ ON
- [ ] Customers can switch plans → ✅ ON
- [ ] 選擇產品：Pro Plan, Starter Plan → ✅
- [ ] When changing plans → **Prorate charges and credits** → ✅
- [ ] When switching to cheaper → **Wait until end** → ✅
- [ ] Cancellations → **At period end** → ✅
- [ ] 點擊 **Save changes** → ✅

**配置完成後，降級就會正確運作了！** 🎉
