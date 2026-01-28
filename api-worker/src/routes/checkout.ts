import { Hono } from 'hono';
import type { Env, PlanType, BillingPeriod } from '../types';
import { getStripe, getOrCreateCustomer } from '../utils/stripe';
import { requireAuth } from '../middleware/auth';

const router = new Hono<{ Bindings: Env }>();

// 所有 checkout 端點都需要認證
router.use('*', requireAuth);

/**
 * POST /api/checkout/create
 * 建立 Stripe Checkout Session
 */
router.post('/create', async (c) => {
  try {
    // 從 JWT 獲取用戶資訊
    const userId = c.get('userId') as string;
    const userEmail = c.get('userEmail') as string;
    
    const { planType, billingPeriod, promoCode } = await c.req.json<{
      planType: PlanType;
      billingPeriod: BillingPeriod;
      promoCode?: string;
    }>();
    
    // 驗證參數
    if (!planType || !billingPeriod) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    if (!['starter', 'pro', 'enterprise'].includes(planType)) {
      return c.json({ error: 'Invalid plan type' }, 400);
    }
    
    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return c.json({ error: 'Invalid billing period' }, 400);
    }
    
    // 查詢 Stripe Price ID
    const priceMapping = await c.env.DB.prepare(`
      SELECT * FROM stripe_price_mapping
      WHERE plan_type = ? AND billing_period = ? AND is_active = 1
    `).bind(planType, billingPeriod).first();
    
    if (!priceMapping) {
      return c.json({ 
        error: 'Price mapping not found. Please contact support.' 
      }, 404);
    }
    
    const stripePriceId = priceMapping.stripe_price_id as string;
    
    // 檢查是否為佔位符
    if (stripePriceId.includes('REPLACE_WITH')) {
      return c.json({ 
        error: 'Payment system not fully configured. Please contact support.' 
      }, 500);
    }
    
    // 初始化 Stripe
    const stripe = getStripe(c.env);
    
    // 建立 metadata
    const metadata: Record<string, string> = {
      user_id: userId,
      plan_type: planType,
      billing_period: billingPeriod,
    };
    
    // 處理優惠碼
    let discounts: Array<{ coupon: string }> = [];
    if (promoCode) {
      // 驗證優惠碼
      const promo = await c.env.DB.prepare(`
        SELECT * FROM promo_codes
        WHERE code = ? 
          AND is_active = 1
          AND (valid_from IS NULL OR valid_from <= ?)
          AND (valid_until IS NULL OR valid_until >= ?)
          AND current_uses < COALESCE(max_uses, 999999)
      `).bind(promoCode, Date.now(), Date.now()).first();
      
      if (promo) {
        // 檢查適用範圍
        const appliesToPlans = promo.applies_to_plans 
          ? JSON.parse(promo.applies_to_plans as string) 
          : [];
        
        const appliesToPeriods = promo.applies_to_periods
          ? JSON.parse(promo.applies_to_periods as string)
          : [];
        
        const planApplies = appliesToPlans.length === 0 || appliesToPlans.includes(planType);
        const periodApplies = appliesToPeriods.length === 0 || appliesToPeriods.includes(billingPeriod);
        
        if (!planApplies || !periodApplies) {
          return c.json({ 
            error: 'Promo code not applicable to selected plan' 
          }, 400);
        }
        
        // 檢查用戶使用次數
        const usage = await c.env.DB.prepare(`
          SELECT COUNT(*) as count FROM promo_code_usage
          WHERE promo_code_id = ? AND user_id = ?
        `).bind(promo.id, userId).first();
        
        if (usage && (usage.count as number) >= (promo.per_user_limit as number)) {
          return c.json({ 
            error: 'Promo code already used' 
          }, 400);
        }
        
        // 建立 Stripe Coupon（一次性）
        try {
          const couponId = `${promoCode}_${userId}_${Date.now()}`;
          const couponParams: any = {
            id: couponId,
            duration: 'once',
            max_redemptions: 1,
          };
          
          if (promo.discount_type === 'percentage') {
            couponParams.percent_off = promo.discount_value;
          } else if (promo.discount_type === 'fixed_amount') {
            couponParams.amount_off = promo.discount_value;
            couponParams.currency = 'usd';
          }
          
          await stripe.coupons.create(couponParams);
          discounts = [{ coupon: couponId }];
          
          // 在 metadata 記錄優惠碼信息
          metadata.promo_code = promoCode;
          metadata.promo_code_id = promo.id as string;
          metadata.bonus_credits = (promo.bonus_credits || 0).toString();
          
        } catch (err) {
          console.error('Failed to create Stripe coupon:', err);
          // 繼續執行，不阻擋用戶付款
        }
      } else {
        return c.json({ 
          error: 'Invalid or expired promo code' 
        }, 400);
      }
    }
    
    // 建立 Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: userEmail,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      discounts,
      success_url: `${c.env.FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${c.env.FRONTEND_URL}/pricing?canceled=true`,
      metadata,
      allow_promotion_codes: !promoCode,  // 如果已有優惠碼就不允許再輸入
    });
    
    return c.json({
      success: true,
      sessionUrl: session.url,
      sessionId: session.id,
    });
    
  } catch (error) {
    console.error('Checkout creation error:', error);
    return c.json({ 
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/checkout/portal
 * 建立 Customer Portal Session（用於管理訂閱）
 */
router.post('/portal', async (c) => {
  try {
    const userId = c.get('userId') as string;
    
    // 查詢用戶資訊
    const userInfo = await c.env.DB.prepare(`
      SELECT u.*, c.stripe_subscription_id
      FROM users u
      LEFT JOIN credits c ON c.user_id = u.id
      WHERE u.id = ?
    `).bind(userId).first();
    
    if (!userInfo) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // 初始化 Stripe
    const stripe = getStripe(c.env);
    
    let customerId = userInfo.stripe_customer_id as string | null;
    
    // 如果沒有 customer_id，建立一個
    if (!customerId) {
      const customer = await getOrCreateCustomer(
        stripe,
        userId,
        userInfo.email as string,
        userInfo.name as string
      );
      
      customerId = customer.id;
      
      // 更新 users 表
      await c.env.DB.prepare(`
        UPDATE users 
        SET stripe_customer_id = ?
        WHERE id = ?
      `).bind(customerId, userId).run();
    }
    
    if (!customerId) {
      return c.json({ 
        error: 'No active subscription found' 
      }, 400);
    }
    
    // 建立 Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${c.env.FRONTEND_URL}/dashboard`,
    });
    
    return c.json({
      success: true,
      portalUrl: session.url,
    });
    
  } catch (error) {
    console.error('Portal creation error:', error);
    return c.json({ 
      error: 'Failed to create portal session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/checkout/session/:sessionId
 * 查詢 Checkout Session 狀態（用於確認頁面）
 */
router.get('/session/:sessionId', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const sessionId = c.req.param('sessionId');
    
    const stripe = getStripe(c.env);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // 驗證 session 屬於當前用戶
    if (session.metadata?.user_id !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    return c.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total,
        currency: session.currency,
      },
    });
    
  } catch (error) {
    console.error('Session retrieval error:', error);
    return c.json({ 
      error: 'Failed to retrieve session' 
    }, 500);
  }
});

export default router;
