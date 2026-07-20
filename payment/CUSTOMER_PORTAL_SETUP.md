# Stripe Customer Portal 設定指南

**什麼是 Customer Portal？**  
**日期**：2026-01-29

---

## 🎯 什麼是 Stripe Customer Portal？

### 簡單說明

**Customer Portal** = Stripe 提供的**現成訂閱管理頁面**

**用途**：
- 讓用戶自己管理訂閱
- 不需要你寫任何 UI 程式碼
- Stripe 完全託管和維護

---

## 💡 為什麼需要 Customer Portal？

### 沒有 Portal 的情況

```
用戶想要取消訂閱：
├─ 需要聯繫客服
├─ 或寫信給你
├─ 或你自己開發取消功能（複雜）
└─ 體驗差、效率低
```

### 有 Portal 的情況

```
用戶想要取消訂閱：
├─ 點擊「管理訂閱」按鈕
├─ 跳轉到 Stripe Portal
├─ 自己點擊取消
├─ 立即生效
└─ ✅ 完全自助，無需客服
```

---

## 🔧 Customer Portal 功能

### 用戶可以做什麼

1. **查看當前訂閱**
   - 訂閱方案
   - 價格
   - 下次扣款日期

2. **更改訂閱**
   - 升級到更高方案
   - 降級到更低方案
   - Stripe 自動處理 Proration

3. **取消訂閱**
   - 立即取消
   - 或當期結束後取消

4. **更新付款方式**
   - 更新信用卡
   - 信用卡過期時必需

5. **查看發票歷史**
   - 所有付款記錄
   - 下載 PDF 收據

---

## 📋 設定步驟

### Step 1：前往 Stripe Dashboard

1. 登入 Stripe Dashboard
2. 確認在 **Test mode**（橙色標籤）
3. 點擊左側選單：**Settings**

### Step 2：找到 Customer Portal

1. Settings 頁面
2. 找到 **Product settings** 區塊
3. 點擊 **Billing** → **Customer portal**

### Step 3：啟用 Portal

1. 點擊 **Activate test link**
2. Portal 立即啟用

### Step 4：配置功能

**Subscriptions（訂閱管理）**：
```
✅ Allow customers to:
   ✅ Switch plans
   ✅ Cancel subscriptions
   ✅ Pause subscriptions（可選）
   ✅ Update subscriptions
```

**Payment methods（付款方式）**：
```
✅ Customers can update their payment methods
✅ Customers can remove payment methods
```

**Invoice history（發票歷史）**：
```
✅ Show
```

### Step 5：設定取消行為

**Cancellation behavior**：
```
選項 A：Immediately（立即取消）
└─ 訂閱立即停止
└─ 可能需要退款

選項 B：At period end（當期結束）⭐ 推薦
└─ 讓用戶用完當期
└─ 避免退款
└─ 用戶體驗更好
```

**推薦**：選擇 **At period end**

### Step 6：儲存設定

點擊 **Save changes**

---

## 🚀 如何使用

### 程式碼實現

**後端**（已實現）：
```typescript
// api-worker/src/routes/checkout.ts
router.post('/portal', requireAuth, async (c) => {
  const stripe = getStripe(c.env);
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${c.env.FRONTEND_URL}/dashboard`,
  });
  
  return c.json({ portalUrl: session.url });
});
```

**前端**（已實現）：
```typescript
// 降級按鈕
const response = await api.createPortalSession();
window.location.href = response.portalUrl;
```

---

## 📊 Portal 流程

```
用戶點擊「Downgrade」
    ↓
前端呼叫 POST /api/checkout/portal
    ↓
後端創建 Portal Session
    ↓
返回 portalUrl
    ↓
前端重導向到 Stripe Portal
    ↓
用戶在 Portal 管理訂閱
    ↓
完成後返回 return_url (/dashboard)
    ↓
Stripe 發送 Webhook
    ↓
我們的系統更新資料庫
```

---

## ⚠️ 常見問題

### Q: Portal 頁面是空白的？

**A**: 需要先啟用 Portal：
```
Settings → Customer portal → Activate test link
```

### Q: Portal 沒有顯示訂閱？

**A**: 用戶可能沒有 Stripe 訂閱：
- 檢查 `stripe_customer_id` 是否存在
- 檢查是否有 active subscription

### Q: Portal 顯示「No payment method」？

**A**: 用戶還沒有綁定付款方式：
- 訂閱後會自動綁定
- 或在 Portal 中手動添加

---

## 🎯 配置檢查清單

- [ ] Stripe Dashboard → Settings → Customer portal
- [ ] Activate test link
- [ ] ✅ Allow switch plans
- [ ] ✅ Allow cancel subscriptions
- [ ] Cancellation: At period end
- [ ] ✅ Show invoice history
- [ ] Save changes
- [ ] 測試：點擊 Downgrade 按鈕
- [ ] 驗證：Portal 正確顯示訂閱資訊

---

**配置完成後，Downgrade 功能就完整可用了！** 🚀

**需要我提供更詳細的截圖步驟嗎？**

---

## 🔍 Portal 兩種模式詳解

### 模式對比

#### **模式 A：標準 Portal（Full Portal）**

**特性**：
```
顯示功能：
✅ 當前訂閱詳情
✅ 更新訂閱（升級/降級）
✅ 取消訂閱
✅ 付款方式管理
✅ 發票歷史
✅ 帳單資訊更新
```

**程式碼**：
```typescript
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: 'http://localhost:5173/dashboard'
});
// 不設定 flow_data
```

**行為**：
```
用戶體驗：
├─ 看到完整的管理頁面
├─ 可以做任何操作
└─ 完成後需手動點擊「← Return to ...」按鈕

跳轉方式：
❌ 不會自動跳轉
✅ 用戶點擊 Return 按鈕時跳轉到 return_url
```

**遵守 Configuration 設定**：
```
✅ Proration 設定
✅ Downgrade 延遲設定
✅ Cancellation 設定
✅ 所有 Portal Configuration 設定
```

---

#### **模式 B：Portal Flow（Deep Link）**

**特性**：
```
顯示功能：
✅ 只顯示特定操作（如訂閱更新）
❌ 隱藏其他功能
❌ 無導航選單
```

**程式碼**：
```typescript
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: 'http://localhost:5173/dashboard',
  flow_data: {
    type: 'subscription_update',
    subscription_update: {
      subscription: subscriptionId
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        return_url: 'http://localhost:5173/dashboard'
      }
    }
  }
});
```

**行為**：
```
用戶體驗：
├─ 只看到更新訂閱的頁面
├─ 選擇新方案
├─ 點擊 Continue
├─ 確認
└─ 自動跳轉回你的網站 ✅

跳轉方式：
✅ 自動跳轉（after_completion.redirect）
✅ 無需手動點擊
```

**遵守 Configuration 設定**：
```
✅ Proration 設定（仍然生效）
✅ Downgrade 延遲設定（仍然生效）
❌ 但用戶看不到完整說明
```

---

### Flow Types

| Type | 用途 | 自動跳轉 |
|------|------|---------|
| `subscription_update` | 更新訂閱（升降級） | ✅ |
| `subscription_cancel` | 取消訂閱 | ✅ |
| `payment_method_update` | 更新付款方式 | ✅ |

---

## 💡 兩種模式的選擇

### 使用場景

**標準 Portal（推薦用於）**：
- Dashboard 的「管理訂閱」總按鈕
- 用戶需要完整功能時
- 不在意需要手動點擊返回

**Portal Flow（推薦用於）**：
- Pricing 頁面的 Downgrade 按鈕
- 用戶只需要做一件事時
- 需要自動跳轉時

---

## 🎯 我們的實現

**Downgrade 按鈕**：
```
使用：subscription_update Flow
原因：
✅ 自動跳轉
✅ 用戶專注於降級
✅ 流程簡潔
⚠️ 看不到完整 Portal 功能（可接受）
```

**未來可加入（Dashboard）**：
```
「管理訂閱」按鈕：
使用：標準 Portal
原因：
✅ 完整功能
✅ 用戶可以做任何事
⚠️ 需要手動點擊返回（可接受）
```

---

## ⚠️ 重要提醒

### Flow 仍然遵守 Configuration 設定

**即使使用 Flow**：
- ✅ Proration 還是會生效
- ✅ Downgrade 延遲還是會生效
- ✅ 所有業務邏輯保持一致

**只是 UI 不同**：
- Flow：簡化 UI，自動跳轉
- Portal：完整 UI，手動返回

**核心邏輯不變！** ✅
