-- Migration 0009: Add stripe_coupon_id to promo_codes
-- Purpose: Store Stripe Coupon ID when admin creates a promo code,
--          so we reuse the same coupon instead of creating a new one per checkout.
-- Date: 2026-03-15

ALTER TABLE promo_codes ADD COLUMN stripe_coupon_id TEXT;

CREATE INDEX IF NOT EXISTS idx_promo_codes_stripe_coupon ON promo_codes(stripe_coupon_id);

SELECT 'Migration 0009 completed!' as status;
