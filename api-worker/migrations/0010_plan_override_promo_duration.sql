-- Migration 0010: Admin plan override + Promo coupon duration
--
-- 1. plan_override：管理員手動指定方案（VIP/測試）專用欄位。
--    有效方案 = COALESCE(plan_override, plan_type)。
--    plan_type 永遠由 Stripe webhook 同步，webhook 永不觸碰 plan_override，
--    兩者不再互相覆寫。
ALTER TABLE credits ADD COLUMN plan_override TEXT;

-- 2. Promo code 的 Stripe Coupon duration 設定
--    once = 只折一期 / repeating = 折 N 個月 / forever = 永久折扣
ALTER TABLE promo_codes ADD COLUMN duration TEXT DEFAULT 'once';
ALTER TABLE promo_codes ADD COLUMN duration_months INTEGER;
