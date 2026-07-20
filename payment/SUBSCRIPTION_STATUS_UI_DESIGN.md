# 訂閱狀態 UI/UX 完整設計

**版本**: V2.0  
**日期**: 2026-01-30  
**目的**: 解決訂閱狀態顯示不清晰的問題  
**優先級**: P0（核心 UX 問題）

---

## 🎯 問題定義

### 當前問題

```
用戶降級 Pro → Starter：
1. 用戶在 Stripe Portal 完成降級
2. 回到 Dashboard
3. 仍然顯示 "Professional - Current Plan"
4. 用戶困惑：「降級失敗了嗎？」❌
```

### 根本原因

- **設計機制**: 升級立即生效（Proration），降級延遲生效（Period End）
- **UI 缺失**: 沒有顯示「待生效變更」狀態
- **用戶困惑**: 看不出 Monthly ↔ Yearly 切換

---

## 📊 訂閱狀態模型

### 核心數據結構

```typescript
interface SubscriptionStatus {
  // === 當前生效狀態 ===
  current: {
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
    billingPeriod: 'monthly' | 'yearly';
    price: number;              // 當前價格（分）
    periodStart: number;        // 當期開始時間
    periodEnd: number;          // 當期結束時間
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
  };
  
  // === 待生效變更（關鍵！）===
  scheduledChange?: {
    type: 'downgrade' | 'upgrade' | 'cancel' | 'period_change';
    newPlan?: 'free' | 'starter' | 'pro' | 'enterprise';
    newBillingPeriod?: 'monthly' | 'yearly';
    newPrice?: number;
    effectiveDate: number;      // 何時生效
    canRevert: boolean;         // 是否可以取消這個變更
  };
  
  // === Stripe 相關 ===
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  cancelAtPeriodEnd: boolean;
}
```

---

## 🎨 UI 設計方案

### 狀態 1：正常訂閱（無變更）

**情況**: 用戶正常使用，沒有任何待生效變更

```tsx
┌─────────────────────────────────────────┐
│ 💎 Professional Plan                    │
│ $29.99/month                            │
│                                         │
│ 📅 Billing Information                 │
│ Next billing date: Feb 15, 2026        │
│ Amount: $29.99                         │
│                                         │
│ [Manage Subscription]                  │
└─────────────────────────────────────────┘
```

**數據**:
```json
{
  "current": {
    "plan": "pro",
    "billingPeriod": "monthly",
    "price": 2999,
    "periodEnd": 1739577600000
  },
  "scheduledChange": null,
  "cancelAtPeriodEnd": false
}
```

---

### 狀態 2：已安排降級 ⭐ 核心場景

**情況**: 用戶降級，但還在使用當前高級方案

```tsx
┌─────────────────────────────────────────┐
│ 💎 Professional Plan                    │
│ $29.99/month                            │
│                                         │
│ ⚠️ SCHEDULED CHANGE                     │
│ ┌───────────────────────────────────┐   │
│ │ 📉 Downgrade to Starter Plan      │   │
│ │                                   │   │
│ │ Effective Date: Feb 15, 2026      │   │
│ │ New Price: $9.99/month            │   │
│ │                                   │   │
│ │ ℹ️ You can continue using Pro     │   │
│ │ features until Feb 15.            │   │
│ │                                   │   │
│ │ After Feb 15:                     │   │
│ │ • Monthly quota: 10,000 → 1,000   │   │
│ │ • Analytics: Premium → Basic      │   │
│ │ • Support: Priority → Email       │   │
│ │                                   │   │
│ │ [Cancel Downgrade] [Keep Change]  │   │
│ └───────────────────────────────────┘   │
│                                         │
│ Current period ends: Feb 15, 2026       │
└─────────────────────────────────────────┘
```

**數據**:
```json
{
  "current": {
    "plan": "pro",
    "billingPeriod": "monthly",
    "price": 2999,
    "periodEnd": 1739577600000
  },
  "scheduledChange": {
    "type": "downgrade",
    "newPlan": "starter",
    "newPrice": 999,
    "effectiveDate": 1739577600000,
    "canRevert": true
  },
  "cancelAtPeriodEnd": false
}
```

---

### 狀態 3：已安排取消

**情況**: 用戶取消訂閱，將降為 Free Plan

```tsx
┌─────────────────────────────────────────┐
│ 💎 Professional Plan                    │
│ $29.99/month                            │
│                                         │
│ ⚠️ SUBSCRIPTION ENDING                  │
│ ┌───────────────────────────────────┐   │
│ │ 🚫 Subscription will end on       │   │
│ │    Feb 15, 2026                   │   │
│ │                                   │   │
│ │ After cancellation:               │   │
│ │ • Plan: Free (100 calls/month)    │   │
│ │ • No billing                      │   │
│ │ • Limited features                │   │
│ │                                   │   │
│ │ 💡 Changed your mind?             │   │
│ │ You can reactivate anytime        │   │
│ │ before Feb 15.                    │   │
│ │                                   │   │
│ │ [Reactivate Subscription]         │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**數據**:
```json
{
  "current": {
    "plan": "pro",
    "billingPeriod": "monthly",
    "price": 2999,
    "periodEnd": 1739577600000
  },
  "scheduledChange": {
    "type": "cancel",
    "newPlan": "free",
    "effectiveDate": 1739577600000,
    "canRevert": true
  },
  "cancelAtPeriodEnd": true
}
```

---

### 狀態 4：計費週期變更

**情況**: Monthly ↔ Yearly 切換

```tsx
┌─────────────────────────────────────────┐
│ 💎 Professional Plan                    │
│ $29.99/month                            │
│                                         │
│ ℹ️ BILLING PERIOD CHANGE                │
│ ┌───────────────────────────────────┐   │
│ │ 🔄 Switching to yearly billing    │   │
│ │                                   │   │
│ │ Effective Date: Feb 15, 2026      │   │
│ │ New Price: $289/year              │   │
│ │                                   │   │
│ │ 💰 You'll save $70/year           │   │
│ │ (Equivalent to $24.08/month)      │   │
│ │                                   │   │
│ │ [Cancel Change]                   │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**數據**:
```json
{
  "current": {
    "plan": "pro",
    "billingPeriod": "monthly",
    "price": 2999,
    "periodEnd": 1739577600000
  },
  "scheduledChange": {
    "type": "period_change",
    "newBillingPeriod": "yearly",
    "newPrice": 28900,
    "effectiveDate": 1739577600000,
    "canRevert": true
  }
}
```

---

### 狀態 5：立即升級（Proration）

**情況**: 升級時立即生效，無需等待

```tsx
┌─────────────────────────────────────────┐
│ 💎 Professional Plan                    │
│ $29.99/month                            │
│                                         │
│ ✅ UPGRADED                             │
│ ┌───────────────────────────────────┐   │
│ │ 🎉 Welcome to Professional!       │   │
│ │                                   │   │
│ │ Upgraded on: Jan 30, 2026         │   │
│ │ From: Starter Plan                │   │
│ │                                   │   │
│ │ ✓ Immediate access to Pro features│   │
│ │ ✓ Monthly quota: 1,000 → 10,000   │   │
│ │ ✓ Premium analytics enabled       │   │
│ │                                   │   │
│ │ Prorated charge: $23.50           │   │
│ │ (15 days remaining in period)     │   │
│ └───────────────────────────────────┘   │
│                                         │
│ Next full billing: Feb 15, 2026         │
└─────────────────────────────────────────┘
```

---

## 🗃️ 資料庫設計

### 新增欄位 (Migration 0008)

```sql
-- credits 表新增欄位
ALTER TABLE credits ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0;
ALTER TABLE credits ADD COLUMN scheduled_plan_change TEXT;  -- JSON 格式
ALTER TABLE credits ADD COLUMN subscription_current_period_start INTEGER;
ALTER TABLE credits ADD COLUMN last_plan_change_at INTEGER;
ALTER TABLE credits ADD COLUMN last_plan_change_type TEXT;  -- 'upgrade', 'downgrade', 'cancel'

-- 索引
CREATE INDEX idx_credits_cancel_at_period_end ON credits(cancel_at_period_end);
```

### scheduled_plan_change JSON 格式

```json
{
  "type": "downgrade",
  "fromPlan": "pro",
  "toPlan": "starter",
  "fromPeriod": "monthly",
  "toPeriod": "monthly",
  "fromPrice": 2999,
  "toPrice": 999,
  "effectiveDate": 1739577600000,
  "scheduledAt": 1738022400000,
  "canRevert": true
}
```

---

## 🔧 API 設計

### GET /api/subscription/status

**用途**: 獲取完整訂閱狀態（包含待生效變更）

**Response**:
```json
{
  "success": true,
  "subscription": {
    "current": {
      "plan": "pro",
      "planDisplayName": "Professional",
      "billingPeriod": "monthly",
      "price": 2999,
      "priceFormatted": "$29.99",
      "periodStart": 1736899200000,
      "periodEnd": 1739577600000,
      "status": "active",
      "features": {
        "monthlyQuota": 10000,
        "analytics": "premium",
        "support": "priority"
      }
    },
    "scheduledChange": {
      "type": "downgrade",
      "newPlan": "starter",
      "newPlanDisplayName": "Starter",
      "newPrice": 999,
      "newPriceFormatted": "$9.99",
      "effectiveDate": 1739577600000,
      "effectiveDateFormatted": "Feb 15, 2026",
      "daysUntilChange": 15,
      "canRevert": true,
      "changes": {
        "monthlyQuota": { "from": 10000, "to": 1000 },
        "analytics": { "from": "premium", "to": "basic" },
        "support": { "from": "priority", "to": "email" }
      }
    },
    "cancelAtPeriodEnd": false,
    "stripeSubscriptionId": "sub_xxx",
    "stripeCustomerId": "cus_xxx"
  }
}
```

### POST /api/subscription/cancel-scheduled-change

**用途**: 取消待生效的變更（降級、取消等）

**Request**:
```json
{
  "reason": "Changed my mind"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "message": "Scheduled downgrade has been canceled",
  "subscription": {
    // 更新後的訂閱狀態
  }
}
```

---

## 🎯 實施計劃

### Phase 1: 後端支援 (P0)

**優先級**: Critical  
**預估時間**: 2-3 小時

- [x] Migration 0008: 新增資料庫欄位
- [ ] Webhook: 擷取並儲存 `cancel_at_period_end` 狀態
- [ ] Webhook: 擷取並儲存 subscription schedule 資訊
- [ ] API: 實現 `/api/subscription/status` 端點
- [ ] API: 實現 `/api/subscription/cancel-scheduled-change` 端點
- [ ] 測試: Stripe CLI 測試各種狀態

### Phase 2: 前端 UI (P0)

**優先級**: Critical  
**預估時間**: 3-4 小時

- [ ] Component: `SubscriptionStatusCard`（主要顯示組件）
- [ ] Component: `ScheduledChangeAlert`（警告橫幅）
- [ ] Component: `PlanComparisonTable`（顯示變更前後差異）
- [ ] Hook: `useSubscriptionStatus`（狀態管理）
- [ ] Integration: 整合到 Dashboard/Credits 頁面
- [ ] Testing: 各種狀態的視覺測試

### Phase 3: UX 優化 (P1)

**優先級**: High  
**預估時間**: 2-3 小時

- [ ] Modal: 操作確認（升級/降級前說明）
- [ ] Animation: 狀態變更過渡動畫
- [ ] Tooltip: 詳細資訊提示
- [ ] 時間倒數: "X days until change"
- [ ] Mobile 優化

### Phase 4: 進階功能 (P2)

**優先級**: Medium  
**預估時間**: 4-5 小時

- [ ] 時間軸視覺化（訂閱歷史）
- [ ] Email 提醒（變更前 3 天、1 天）
- [ ] 推薦引擎（建議升級時機）
- [ ] A/B Testing 準備

---

## 🎨 前端組件架構

### 目錄結構

```
frontend/src/
├── components/subscription/
│   ├── SubscriptionStatusCard.tsx       # 主卡片
│   ├── ScheduledChangeAlert.tsx         # 警告橫幅
│   ├── PlanComparisonTable.tsx          # 對比表
│   ├── BillingInfoSection.tsx           # 帳單資訊
│   ├── SubscriptionActions.tsx          # 操作按鈕
│   └── index.ts
│
├── hooks/
│   ├── useSubscriptionStatus.ts         # 狀態管理
│   └── useSubscriptionActions.ts        # 操作邏輯
│
├── types/
│   └── subscription.ts                  # TypeScript 定義
│
└── lib/
    └── api.ts                           # API 調用（擴展）
```

### 核心組件實現

```tsx
// components/subscription/SubscriptionStatusCard.tsx
import { ScheduledChangeAlert } from './ScheduledChangeAlert';
import { BillingInfoSection } from './BillingInfoSection';
import { SubscriptionActions } from './SubscriptionActions';

export function SubscriptionStatusCard() {
  const { subscription, loading, error } = useSubscriptionStatus();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  const hasScheduledChange = !!subscription.scheduledChange;
  
  return (
    <div className="subscription-card">
      {/* 當前方案標題 */}
      <PlanHeader plan={subscription.current} />
      
      {/* 警告橫幅：如果有待生效變更 */}
      {hasScheduledChange && (
        <ScheduledChangeAlert 
          change={subscription.scheduledChange}
          current={subscription.current}
        />
      )}
      
      {/* 帳單資訊 */}
      <BillingInfoSection subscription={subscription} />
      
      {/* 操作按鈕 */}
      <SubscriptionActions subscription={subscription} />
    </div>
  );
}
```

---

## 📱 用戶流程設計

### 流程 1：降級操作

```
1. 用戶在 Pricing 頁面點擊 "Downgrade to Starter"
   ↓
2. 顯示確認 Modal:
   ┌────────────────────────────────────┐
   │ Downgrade to Starter Plan?         │
   │                                    │
   │ ⚠️ This change will take effect    │
   │ at the end of your billing period  │
   │                                    │
   │ Current: Professional ($29.99/mo)  │
   │ New:     Starter ($9.99/mo)        │
   │                                    │
   │ Effective: Feb 15, 2026            │
   │                                    │
   │ What changes:                      │
   │ • Monthly quota: 10,000 → 1,000    │
   │ • Analytics: Premium → Basic       │
   │                                    │
   │ [Cancel] [Confirm Downgrade]       │
   └────────────────────────────────────┘
   ↓
3. 用戶確認 → 重導向到 Stripe Portal
   ↓
4. 在 Portal 完成降級
   ↓
5. 返回 Dashboard
   ↓
6. 顯示更新後的狀態（帶有 Scheduled Change 警告）
```

### 流程 2：取消待生效變更

```
1. 用戶看到 "Scheduled Downgrade" 警告
   ↓
2. 點擊 "Cancel Downgrade"
   ↓
3. 顯示確認 Modal:
   ┌────────────────────────────────────┐
   │ Cancel Scheduled Downgrade?        │
   │                                    │
   │ Your plan will remain:             │
   │ Professional ($29.99/month)        │
   │                                    │
   │ [Go Back] [Confirm Cancellation]   │
   └────────────────────────────────────┘
   ↓
4. 確認 → 調用 API 取消 scheduled change
   ↓
5. Stripe API 更新訂閱
   ↓
6. UI 移除警告橫幅
   ↓
7. 顯示成功訊息: "Downgrade has been canceled"
```

---

## 🧪 測試場景

### 手動測試清單

- [ ] **正常訂閱**: 顯示當前方案，無警告
- [ ] **降級安排**: 顯示警告橫幅，正確日期
- [ ] **取消安排**: 顯示結束提示
- [ ] **週期變更**: 顯示 Monthly ↔ Yearly 切換
- [ ] **立即升級**: 顯示升級成功，Proration 說明
- [ ] **取消降級**: 功能正常，UI 更新
- [ ] **過期訂閱**: 顯示 past_due 狀態
- [ ] **試用期**: 顯示 trialing 狀態

### Stripe CLI 測試

```bash
# 測試降級
stripe trigger customer.subscription.updated

# 測試取消
stripe trigger customer.subscription.deleted

# 測試立即升級
stripe trigger checkout.session.completed
```

---

## 📊 成功指標

### UX 指標

- 用戶困惑率降低 > 80%
- 「降級沒生效」支援工單減少 > 90%
- 取消變更操作使用率 > 15%（證明功能有用）

### 技術指標

- API 響應時間 < 200ms
- UI 渲染時間 < 100ms
- 錯誤率 < 0.1%

---

## 🎯 關鍵設計原則

### 1. **透明度優先**
永遠清楚告訴用戶「現在是什麼」和「未來會變成什麼」

### 2. **可逆性**
允許用戶在生效前取消變更（降級、取消訂閱）

### 3. **預期管理**
明確說明何時生效、會有什麼變化

### 4. **視覺層次**
- 當前狀態：主要顯示
- 待生效變更：警告橫幅
- 詳細資訊：可展開/摺疊

### 5. **行動導向**
每個狀態都提供明確的下一步操作

---

## 📚 參考資源

### 行業標準
- [Stripe Billing Portal UX](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Netflix Subscription Management](https://help.netflix.com/en/node/22731)
- [GitHub Billing UI](https://docs.github.com/en/billing)

### 內部文件
- `/payment/SUBSCRIPTION_DESIGN_DECISIONS.md`
- `/payment/CUSTOMER_PORTAL_SETUP.md`
- `/CREDITS_SYSTEM_DEFINITIVE_DESIGN.md`

---

**最後更新**: 2026-01-30  
**維護者**: 開發團隊  
**狀態**: 設計完成，準備實施

---

## ✅ 實施檢查清單

### 開始前
- [x] 設計文件審查
- [ ] 技術方案確認
- [ ] 資料庫 Migration 準備

### 開發中
- [ ] 後端 API 完成
- [ ] 前端組件完成
- [ ] 整合測試通過

### 上線前
- [ ] 用戶測試
- [ ] 性能測試
- [ ] 文檔更新
- [ ] 部署準備

🚀 **準備開始實施！**
