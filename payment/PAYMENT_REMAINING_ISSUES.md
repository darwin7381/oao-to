# Payment System - Remaining Issues & Tasks

**Date**: 2026-02-13 (Updated)  
**Context**: Compiled from full conversation history  
**Purpose**: Handoff document for next agent to continue work

---

## ✅ Fixed Bugs (2026-02-13)

### 1. Dashboard Sidebar Credit Bar Empty — ✅ FIXED
**Fix**: Added retry mechanism (1 retry with 1s delay) + cleanup on unmount in `DashboardLayout.tsx`.
**File**: `frontend/src/components/layout/DashboardLayout.tsx`

### 2. Coupon Disable Button Not Working — ✅ FIXED
**Fix**: Removed `(api as any).request()` pattern, added proper public methods (`getPromoCodes`, `createPromoCode`, `togglePromoCode`) to `api.ts`.
**Files**: `frontend/src/lib/api.ts`, `frontend/src/pages/Admin/CouponManagement.tsx`

### 3. Pricing Page Plan Status Not Syncing After Downgrade — ✅ FIXED
**Fix**: 
- Backend: Portal return URLs now include `?portal_return=true` parameter
- Frontend: Both `Pricing.tsx` and `Credits.tsx` detect `portal_return` URL parameter and auto-refresh subscription status (with 1.5-2s delay for webhook processing)
- Also detects `document.referrer` containing `billing.stripe.com`
**Files**: `api-worker/src/routes/checkout.ts`, `frontend/src/pages/Pricing.tsx`, `frontend/src/pages/dashboard/Credits.tsx`

### 4. Old Transaction Records Missing Metadata — ✅ FIXED
**Fix**: Added proper null/`"null"` string handling for `quota_reset` transaction type metadata parsing (same pattern as `subscription` type). Added `metadata` field to Transaction interface.
**File**: `frontend/src/pages/dashboard/Credits.tsx`

---

## ✅ Completed Features (2026-02-13)

### 5. Buy Credits (One-Time Purchase) — ✅ IMPLEMENTED
**Implementation**:
- Backend: `POST /api/checkout/credits` endpoint creates Stripe Checkout Session in `payment` mode
- Frontend: Pricing page slider now connects to real checkout flow
- Credits page detects `?purchase=success` return and auto-refreshes
- Webhook handler `payment_intent.succeeded` already existed and processes correctly
**Files**: `api-worker/src/routes/checkout.ts`, `frontend/src/lib/api.ts`, `frontend/src/pages/Pricing.tsx`, `frontend/src/pages/dashboard/Credits.tsx`

### 7. Subscription Status Display After Cancel/Downgrade — ✅ ENHANCED
**Implementation**:
- Credits page "Current Plan" card now shows: billing info, countdown to change, detailed scheduled change panel
- Scheduled change detail panel with effective date, new plan, price changes, quota changes
- "Manage Subscription" button opens Portal directly from Credits page
- Reactivate/Cancel change button with proper confirmation
**File**: `frontend/src/pages/dashboard/Credits.tsx`

---

## 🟡 Medium Priority - Remaining Incomplete Features

### 6. Coupon Duration Mode Not Properly Connected
**Issue**: The coupon creation form has Once/Repeating/Forever selection UI, but it's unclear if this is correctly saved and used when applying coupons during checkout.
**Location**: 
- Frontend: `frontend/src/pages/Admin/CouponManagement.tsx` (duration field in form)
- Backend: `api-worker/src/routes/promo-codes.ts` (create endpoint)
- Backend: `api-worker/src/routes/checkout.ts` (coupon application during checkout)
**What to check**:
- The `promo_codes` table doesn't have a `duration` column - duration was in the UI but not saved to DB
- When creating Stripe Coupon during checkout, the duration should be passed
- Need to add `duration` and `duration_months` columns to promo_codes table, or handle it differently

### 8. Enterprise Plan Payment Flow
**Issue**: Enterprise Plan was confirmed to support both self-service payment AND "Contact Sales". The Upgrade button was added to Pricing page but Enterprise has no Stripe Price IDs set up.
**Location**: `frontend/src/pages/Pricing.tsx` (enterprise section)
**Action**: 
- Decide: Should Enterprise have a Stripe product/price?
- If yes: Create in Stripe Dashboard, add to `stripe_price_mapping`
- If no: Keep only "Contact Sales" button

---

## 🟢 Low Priority - Enhancement Requests

### 9. Monthly Quota Reset Transaction Record
**Issue**: When monthly quota resets (invoice.payment_succeeded webhook), a transaction record is created. But this hasn't been tested in real monthly cycle.
**Location**: `api-worker/src/routes/stripe-webhook.ts` (handlePaymentSucceeded)
**Concern**: The `quota_reset` transaction type display in Credits.tsx needs real data to verify.

### 10. Proration/Period End Actual Behavior Verification
**Issue**: Portal Configuration was set to:
- Upgrade: Prorate charges and credits (immediately)
- Downgrade: Wait until end of billing period
**Concern**: Need to verify this actually works correctly with real test. User tested once and it seemed to work but was uncertain about the payment flow in Test Mode.

### 11. Coupon Applies To Plans Selection
**Issue**: The coupon creation form has plan checkboxes (Free/Starter/Pro/Enterprise) but this may not be correctly validated or used during checkout.
**Location**: `api-worker/src/routes/checkout.ts` (promo code validation during checkout)

### 12. Transaction History - Mixed Pool Display
**Issue**: User explicitly requested that transactions should display as unified "credits" without exposing Pool A/Pool B concepts. Current implementation:
- Subscription records: Show "Quota → X/mo" (orange text)
- Bonus records: Show "+500 credits"
- Quota reset: Show "Restored X credits"
**User's concern**: The display of subscription quota changes (amount=0) still feels separate from credits. User wanted a more unified experience.
**Decision made**: All displayed as "credits" with different labels per type. Current implementation is the agreed design but may need UX polish.

---

## 📝 Design Decisions Already Made (Reference)

### Confirmed by user:
1. **Upgrade**: Proration (immediate, charge difference)
2. **Downgrade**: Period End (use current plan until period ends)
3. **Cancel**: Period End (use current plan until period ends)
4. **Coupon types**: Once / Repeating / Forever (all three supported)
5. **VIP users**: Forever 100% OFF Coupon (no Cron Job needed)
6. **Test users**: Direct Credits (no subscription)
7. **Trial Period**: Acknowledged as feature but deferred
8. **No Cron Job**: All subscription management via Stripe
9. **Portal mode**: Using Flow (subscription_update) for auto-redirect
10. **Full Portal**: Available via separate "Manage Subscription" button (not yet implemented)
11. **Flat Rate pricing**: Confirmed as correct Stripe pricing model
12. **Coupon editing**: Not allowed (only Enable/Disable)
13. **Total Purchased → Total Credits Received**: Renamed

### Stripe Portal Configuration:
- Customers can switch plans: ✅ ON
- Prorate charges and credits: ✅ Selected
- Charge timing: Invoice prorations immediately
- Downgrade → cheaper plan: Wait until end of billing period
- Downgrade → shorter interval: Wait until end of billing period
- Cancellation: At period end (assumed, verify)

---

## 🔧 Technical Debt

### 1. stripe_customer_id Sync Issue
**Issue**: Checkout creates a new Stripe Customer, but the webhook initially didn't update `users.stripe_customer_id`. This was fixed by adding `UPDATE users SET stripe_customer_id = session.customer` in the webhook.
**Risk**: Any users who subscribed BEFORE this fix have mismatched customer IDs. The joey@cryptoxlab.com test account was manually fixed.
**Action**: Verify all existing users have correct `stripe_customer_id` before production deployment.

### 2. Migration 0007 Has Placeholder Values
**Issue**: The original migration had `REPLACE_ME` placeholders for Stripe Price IDs. These were later updated to real IDs, but the migration file now has hardcoded test Price IDs.
**Action**: Before production deployment, either:
- Create a separate production migration
- Or update the Price IDs to production values

### 3. D1 Migration Path Warning
**Critical**: Always use `--persist-to ../.wrangler/oao-shared` when running migrations locally!
**Reference**: `/standards/COMMON_ISSUES_CHECKLIST.md`, `/api-worker/migrations/README.md`

### 4. Multiple Orphaned Files
Files that may need cleanup:
- `api-worker/fix-current-db.sql` (temporary fix script)
- `PAYMENT_SETUP_COMPLETE.md` (root level, should be in /payment)
- `CRITICAL_LESSONS_LEARNED.md` (root level)

---

## 🚀 Production Deployment Checklist

**詳細步驟和指令見 `payment/STRIPE_INTEGRATION_GUIDE.md` 的「上線檢查清單」章節。**

簡要：
- [ ] Stripe KYC + Live mode products/prices
- [ ] 用 CLI 建立生產 Webhook endpoint（8 個事件，見 Integration Guide）
- [ ] Customer Portal Live mode
- [ ] `wrangler secret put` 設定所有生產 secrets
- [ ] 生產 D1 migration
- [ ] 驗證 `stripe_customer_id` 一致性
- [ ] 端到端測試

---

## 📁 Key Files Reference

### Backend
- `api-worker/src/routes/checkout.ts` - Checkout & Portal sessions
- `api-worker/src/routes/stripe-webhook.ts` - Webhook event handlers
- `api-worker/src/routes/promo-codes.ts` - Coupon CRUD
- `api-worker/src/utils/stripe.ts` - Stripe utility functions
- `api-worker/migrations/0007_stripe_integration.sql` - DB migration

### Frontend
- `frontend/src/pages/Pricing.tsx` - Pricing page
- `frontend/src/pages/dashboard/Credits.tsx` - Credits & Usage
- `frontend/src/pages/dashboard/SubscriptionSuccess.tsx` - Post-payment success
- `frontend/src/pages/Admin/CouponManagement.tsx` - Admin coupons
- `frontend/src/contexts/SubscriptionContext.tsx` - Global subscription state
- `frontend/src/hooks/useSubscriptionStatus.ts` - Subscription status hook
- `frontend/src/lib/api.ts` - API client

### Documentation
- `payment/SUBSCRIPTION_DESIGN_DECISIONS.md` - Core design decisions
- `payment/CUSTOMER_PORTAL_SETUP.md` - Portal setup & Flow vs Full comparison
- `payment/STRIPE_PRICING_MODELS_EXPLAINED.md` - Why we chose Flat Rate
- `payment/SUBSCRIPTION_STATUS_UI_DESIGN.md` - UI design specs
- `CREDITS_SYSTEM_DEFINITIVE_DESIGN.md` - Dual-pool credits system
- `standards/COMMON_ISSUES_CHECKLIST.md` - D1 migration path warning
- `api-worker/migrations/README.md` - Migration execution guide

---

---

## 🔶 From Previous Agent Sessions (Found in Documentation)

### Additional Implementation Done (Possibly Untested)

Based on `SUBSCRIPTION_STATUS_IMPLEMENTATION.md` and `SUBSCRIPTION_DOWNGRADE_FIX.md`, a **previous agent session** implemented significant work that needs verification:

#### A. Migration 0008: Subscription Status Tracking
**File**: `api-worker/migrations/0008_subscription_status_tracking.sql`
**Added columns**:
- `billing_period` (monthly/yearly)
- `cancel_at_period_end`
- `scheduled_plan_change` (JSON)
- `subscription_current_period_start`
- `last_plan_change_at`
- `last_plan_change_type`

**Status**: ✅ Verified applied on 2026-02-13 (`wrangler d1 migrations list` shows no pending)

#### B. New API Route: `/api/subscription`
**File**: `api-worker/src/routes/subscription.ts`
- `GET /api/subscription/status` - Full subscription status with scheduled changes
- `POST /api/subscription/cancel-scheduled-change` - Cancel pending downgrade/cancellation

**Status**: ⚠️ Route registered in `index.ts` but needs testing

#### C. Webhook: Subscription Schedule Events
**File**: `api-worker/src/routes/stripe-webhook.ts`
- Added `subscription_schedule.created` handler
- Added `subscription_schedule.updated` handler
- New function: `handleSubscriptionSchedule()`
- Detects Portal-initiated downgrades via Stripe Schedule phases

**Status**: ⚠️ Needs real Portal downgrade test to verify

#### D. Frontend Hook: `useSubscriptionStatus`
**File**: `frontend/src/hooks/useSubscriptionStatus.ts`
- Calls `GET /api/subscription/status`
- Provides scheduled change info to components

**Status**: ⚠️ Created but may have issues

#### E. Frontend Components (Possibly Created Then Removed)
Based on `SUBSCRIPTION_DOWNGRADE_FIX.md`:
- `ScheduledChangeAlert.tsx` was created as standalone then refactored
- `SubscriptionStatusCard.tsx` was created then possibly removed
- Inline alerts were added to `Credits.tsx` and `Pricing.tsx` instead

**Status**: ⚠️ Need to verify what actually exists in the codebase

#### F. Pricing Page: Billing Period Switch
- `getPlanAction()` updated to handle same plan + different period (Monthly ↔ Yearly)
- Shows "Switch to Yearly" / "Switch to Monthly" buttons
- `handlePlanAction()` handles `switch_period` action

**Status**: ⚠️ Needs testing

---

### Key Items That Need Verification

| Item | What to Check | How |
|------|---------------|-----|
| Migration 0008 | Is it applied to `../.wrangler/oao-shared`? | `wrangler d1 migrations list --local --persist-to ../.wrangler/oao-shared` |
| subscription.ts route | Is it registered and working? | `curl http://localhost:8788/api/subscription/status` |
| Webhook schedule handlers | Do they fire on Portal downgrade? | Test downgrade via Portal, check logs |
| useSubscriptionStatus hook | Does it return data? | Check browser console |
| Credits page alerts | Do scheduled change alerts show? | Downgrade and check Credits page |
| Pricing page switch_period | Does Monthly ↔ Yearly switching work? | Test on Pricing page |
| SubscriptionStatusCard | Does it exist or was it removed? | Check `frontend/src/components/` |

---

## 📄 Related Documentation Files

### Root-level docs (may need to be moved to /payment)
- `SUBSCRIPTION_STATUS_IMPLEMENTATION.md` - Implementation report from previous session
- `SUBSCRIPTION_DOWNGRADE_FIX.md` - Downgrade tracking fix report
- `PAYMENT_SETUP_COMPLETE.md` - Early completion report (outdated)
- `CRITICAL_LESSONS_LEARNED.md` - D1 database path lessons

### In /payment directory
- `SUBSCRIPTION_STATUS_UI_DESIGN.md` - Detailed UI/UX design specs (667 lines)
- `SUBSCRIPTION_DESIGN_DECISIONS.md` - Core business logic decisions
- `CUSTOMER_PORTAL_SETUP.md` - Portal setup + Flow vs Full comparison
- `STRIPE_PRICING_MODELS_EXPLAINED.md` - Why Flat Rate
- `STRIPE_INTEGRATION_GUIDE.md` - Complete technical guide
- `STRIPE_SETUP_GUIDE.md` - Setup tutorial
- `PRICING_MANAGEMENT_STRATEGY.md` - Price management flexibility
- `STRIPE_PORTAL_CONFIGURATION.md` - Portal configuration guide
- `IMPLEMENTATION_STATUS.md` - Earlier status tracking (partially outdated)
- `PAYMENT_INTEGRATION_COMPLETE.md` - Earlier completion report (partially outdated)

---

**Last updated**: 2026-02-13  
**Status**: Bugs #1-4 fixed, Features #5 #7 completed, ready for integration testing  
**Verified**: Migration 0008 applied, Stripe CLI webhook forwarding active  
**Remaining**: Coupon duration (#6), Enterprise plan (#8), production deployment checklist
