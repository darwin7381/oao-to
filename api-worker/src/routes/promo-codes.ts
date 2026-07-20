import { Hono } from 'hono';
import type { Env, PromoCode, DiscountType } from '../types';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/role';
import { getStripe } from '../utils/stripe';

const router = new Hono<{ Bindings: Env }>();

// validate 端點需要認證（用戶需要登入才能使用優惠碼）
// 其他端點會個別檢查 admin 權限

/**
 * POST /api/promo-codes/validate
 * 驗證優惠碼是否有效
 */
router.post('/validate', requireAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    
    const { code, planType, billingPeriod } = await c.req.json<{
      code: string;
      planType?: string;
      billingPeriod?: string;
    }>();
    
    if (!code) {
      return c.json({ error: 'Code is required' }, 400);
    }
    
    // 查詢優惠碼
    const promo = await c.env.DB.prepare(`
      SELECT * FROM promo_codes
      WHERE code = ? 
        AND is_active = 1
        AND (valid_from IS NULL OR valid_from <= ?)
        AND (valid_until IS NULL OR valid_until >= ?)
    `).bind(code.toUpperCase(), Date.now(), Date.now()).first();
    
    if (!promo) {
      return c.json({ 
        valid: false, 
        error: 'Invalid or expired promo code' 
      });
    }
    
    // 檢查使用次數
    const maxUses = promo.max_uses as number | null;
    const currentUses = promo.current_uses as number;
    
    if (maxUses !== null && currentUses >= maxUses) {
      return c.json({ 
        valid: false, 
        error: 'Promo code usage limit reached' 
      });
    }
    
    // 檢查用戶使用限制
    const usage = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM promo_code_usage
      WHERE promo_code_id = ? AND user_id = ?
    `).bind(promo.id, userId).first();
    
    const perUserLimit = promo.per_user_limit as number;
    if (usage && (usage.count as number) >= perUserLimit) {
      return c.json({ 
        valid: false, 
        error: 'You have already used this promo code' 
      });
    }
    
    // 檢查適用範圍
    if (planType) {
      const appliesToPlans = promo.applies_to_plans 
        ? JSON.parse(promo.applies_to_plans as string) 
        : [];
      
      if (appliesToPlans.length > 0 && !appliesToPlans.includes(planType)) {
        return c.json({ 
          valid: false, 
          error: 'Promo code not applicable to selected plan' 
        });
      }
    }
    
    if (billingPeriod) {
      const appliesToPeriods = promo.applies_to_periods
        ? JSON.parse(promo.applies_to_periods as string)
        : [];
      
      if (appliesToPeriods.length > 0 && !appliesToPeriods.includes(billingPeriod)) {
        return c.json({ 
          valid: false, 
          error: 'Promo code not applicable to selected billing period' 
        });
      }
    }
    
    // 優惠碼有效
    return c.json({
      valid: true,
      promoCode: {
        id: promo.id,
        code: promo.code,
        discountType: promo.discount_type,
        discountValue: promo.discount_value,
        bonusCredits: promo.bonus_credits || 0,
      },
    });
    
  } catch (error) {
    console.error('Promo code validation error:', error);
    return c.json({ 
      error: 'Failed to validate promo code' 
    }, 500);
  }
});

/**
 * POST /api/promo-codes (Admin only)
 * 建立新的優惠碼
 */
router.post('/', requireAuth, requireAdmin(), async (c) => {
  try {
    const userId = c.get('userId') as string;
    const userRole = c.get('userRole') as string;
    
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const {
      code,
      discountType,
      discountValue,
      appliesToPlans,
      appliesToPeriods,
      bonusCredits,
      maxUses,
      perUserLimit,
      validFrom,
      validUntil,
      duration,
      durationMonths,
    } = await c.req.json<{
      code: string;
      discountType: DiscountType;
      discountValue: number;
      appliesToPlans?: string[];
      appliesToPeriods?: string[];
      bonusCredits?: number;
      maxUses?: number;
      perUserLimit?: number;
      validFrom?: number;
      validUntil?: number;
      duration?: 'once' | 'repeating' | 'forever';
      durationMonths?: number;
    }>();

    // 驗證必填欄位
    if (!code || !discountType || discountValue === undefined) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // 驗證 duration 設定
    const couponDuration = duration || 'once';
    if (!['once', 'repeating', 'forever'].includes(couponDuration)) {
      return c.json({ error: 'Invalid duration' }, 400);
    }
    if (couponDuration === 'repeating' && (!durationMonths || durationMonths < 1 || durationMonths > 36)) {
      return c.json({ error: 'durationMonths (1-36) is required for repeating duration' }, 400);
    }
    
    // 驗證 code 格式
    if (!/^[A-Z0-9-_]+$/.test(code)) {
      return c.json({ 
        error: 'Code must contain only uppercase letters, numbers, hyphens and underscores' 
      }, 400);
    }
    
    // 檢查是否已存在
    const existing = await c.env.DB.prepare(`
      SELECT id FROM promo_codes WHERE code = ?
    `).bind(code).first();
    
    if (existing) {
      return c.json({ error: 'Promo code already exists' }, 409);
    }
    
    // 建立優惠碼
    const promoId = `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 若是百分比或固定金額折扣，在 Stripe 預建立 Coupon，讓 checkout 直接複用
    let stripeCouponId: string | null = null;
    if (discountType === 'percentage' || discountType === 'fixed_amount') {
      try {
        const stripe = getStripe(c.env);
        const couponParams: Record<string, unknown> = {
          id: `oao_${promoId}`,
          name: `OAO.TO: ${code}`,
          duration: couponDuration,
        };

        if (couponDuration === 'repeating') {
          couponParams.duration_in_months = durationMonths;
        }

        if (discountType === 'percentage') {
          couponParams.percent_off = discountValue;
        } else {
          couponParams.amount_off = discountValue;
          couponParams.currency = 'usd';
        }

        if (maxUses) {
          couponParams.max_redemptions = maxUses;
        }

        if (validUntil) {
          couponParams.redeem_by = Math.floor(validUntil / 1000);
        }

        const coupon = await stripe.coupons.create(couponParams);
        stripeCouponId = coupon.id;
        console.log(`✅ Stripe coupon created: ${stripeCouponId}`);
      } catch (stripeErr) {
        // Stripe coupon 建立失敗不阻擋 promo code 建立，checkout 會 fallback 建立一次性 coupon
        console.error('Failed to create Stripe coupon for promo code:', stripeErr);
      }
    }

    await c.env.DB.prepare(`
      INSERT INTO promo_codes (
        id, code, discount_type, discount_value,
        applies_to_plans, applies_to_periods,
        bonus_credits, max_uses, per_user_limit,
        valid_from, valid_until, stripe_coupon_id,
        duration, duration_months, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      promoId,
      code,
      discountType,
      discountValue,
      appliesToPlans ? JSON.stringify(appliesToPlans) : null,
      appliesToPeriods ? JSON.stringify(appliesToPeriods) : null,
      bonusCredits || 0,
      maxUses || null,
      perUserLimit || 1,
      validFrom || null,
      validUntil || null,
      stripeCouponId,
      couponDuration,
      couponDuration === 'repeating' ? durationMonths : null,
      Date.now(),
      userId
    ).run();

    return c.json({
      success: true,
      promoCode: {
        id: promoId,
        code,
        discountType,
        discountValue,
        bonusCredits: bonusCredits || 0,
        stripeCouponId,
        duration: couponDuration,
        durationMonths: couponDuration === 'repeating' ? durationMonths : null,
      },
    }, 201);
    
  } catch (error) {
    console.error('Promo code creation error:', error);
    return c.json({ 
      error: 'Failed to create promo code' 
    }, 500);
  }
});

/**
 * GET /api/promo-codes (Admin only)
 * 列出所有優惠碼
 */
router.get('/', requireAuth, requireAdmin(), async (c) => {
  try {
    const userRole = c.get('userRole') as string;
    
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM promo_code_usage WHERE promo_code_id = p.id) as total_uses
      FROM promo_codes p
      ORDER BY p.created_at DESC
    `).all();
    
    return c.json({
      success: true,
      promoCodes: results,
    });
    
  } catch (error) {
    console.error('Promo codes list error:', error);
    return c.json({ 
      error: 'Failed to fetch promo codes' 
    }, 500);
  }
});

/**
 * PATCH /api/promo-codes/:id (Admin only)
 * 更新優惠碼（通常是啟用/停用）
 */
router.patch('/:id', requireAuth, requireAdmin(), async (c) => {
  try {
    const userRole = c.get('userRole') as string;
    
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const promoId = c.req.param('id');
    const { isActive } = await c.req.json<{ isActive: boolean }>();
    
    await c.env.DB.prepare(`
      UPDATE promo_codes
      SET is_active = ?, updated_at = ?
      WHERE id = ?
    `).bind(isActive ? 1 : 0, Date.now(), promoId).run();
    
    return c.json({ success: true });
    
  } catch (error) {
    console.error('Promo code update error:', error);
    return c.json({ 
      error: 'Failed to update promo code' 
    }, 500);
  }
});

/**
 * GET /api/promo-codes/:code/stats (Admin only)
 * 查看優惠碼使用統計
 */
router.get('/:code/stats', requireAuth, requireAdmin(), async (c) => {
  try {
    const userRole = c.get('userRole') as string;
    
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const code = c.req.param('code');
    
    const promo = await c.env.DB.prepare(`
      SELECT * FROM promo_codes WHERE code = ?
    `).bind(code).first();
    
    if (!promo) {
      return c.json({ error: 'Promo code not found' }, 404);
    }
    
    const { results: usages } = await c.env.DB.prepare(`
      SELECT 
        u.*,
        users.email,
        users.name
      FROM promo_code_usage u
      JOIN users ON users.id = u.user_id
      WHERE u.promo_code_id = ?
      ORDER BY u.created_at DESC
    `).bind(promo.id).all();
    
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_uses,
        SUM(discount_amount) as total_discount,
        SUM(credits_bonus) as total_credits_given
      FROM promo_code_usage
      WHERE promo_code_id = ?
    `).bind(promo.id).first();
    
    return c.json({
      success: true,
      promoCode: promo,
      stats,
      usages,
    });
    
  } catch (error) {
    console.error('Promo code stats error:', error);
    return c.json({ 
      error: 'Failed to fetch stats' 
    }, 500);
  }
});

export default router;
