-- ==========================================
-- Migration 0008: Subscription Status Tracking
-- 目的: 追蹤訂閱的待生效變更（降級、取消等）
-- 日期: 2026-01-30
-- ==========================================

-- 擴展 credits 表：新增訂閱狀態追蹤欄位
ALTER TABLE credits ADD COLUMN billing_period TEXT DEFAULT 'monthly';  -- 'monthly' or 'yearly'
ALTER TABLE credits ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0;
ALTER TABLE credits ADD COLUMN scheduled_plan_change TEXT;  -- JSON 格式儲存待生效變更
ALTER TABLE credits ADD COLUMN subscription_current_period_start INTEGER;
ALTER TABLE credits ADD COLUMN last_plan_change_at INTEGER;
ALTER TABLE credits ADD COLUMN last_plan_change_type TEXT;  -- 'upgrade', 'downgrade', 'cancel', 'reactivate'

-- 創建索引以優化查詢性能
CREATE INDEX IF NOT EXISTS idx_credits_cancel_at_period_end ON credits(cancel_at_period_end);
CREATE INDEX IF NOT EXISTS idx_credits_last_plan_change ON credits(last_plan_change_at);

-- ==========================================
-- scheduled_plan_change JSON 格式說明
-- ==========================================
-- {
--   "type": "downgrade" | "upgrade" | "cancel" | "period_change",
--   "fromPlan": "pro",
--   "toPlan": "starter",
--   "fromPeriod": "monthly",
--   "toPeriod": "monthly",
--   "fromPrice": 2999,
--   "toPrice": 999,
--   "effectiveDate": 1739577600000,
--   "scheduledAt": 1738022400000,
--   "canRevert": true,
--   "reason": "user_requested"
-- }
-- ==========================================

-- 驗證：檢查欄位是否正確創建
-- SELECT 
--   name, 
--   type,
--   dflt_value
-- FROM pragma_table_info('credits')
-- WHERE name IN (
--   'cancel_at_period_end',
--   'scheduled_plan_change',
--   'subscription_current_period_start',
--   'last_plan_change_at',
--   'last_plan_change_type'
-- );
