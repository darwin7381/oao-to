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
    
    // 已有存活訂閱的用戶不能再開新訂閱（會造成雙重扣款）—
    // 方案變更一律走 Customer Portal / subscription update flow
    const existingSub = await c.env.DB.prepare(`
      SELECT stripe_subscription_id, subscription_status FROM credits WHERE user_id = ?
    `).bind(userId).first();

    if (
      existingSub?.stripe_subscription_id &&
      ['active', 'trialing', 'past_due', 'incomplete'].includes((existingSub.subscription_status as string) || '')
    ) {
      return c.json({
        error: 'You already have an active subscription. Please use "Manage Subscription" to change plans.',
        code: 'SUBSCRIPTION_EXISTS'
      }, 409);
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
    
    // 初始化 Stripe + 確保用戶有 Customer ID（解決 customer mismatch 根本原因）
    const stripe = getStripe(c.env);

    const userInfo = await c.env.DB.prepare(`
      SELECT name, stripe_customer_id FROM users WHERE id = ?
    `).bind(userId).first();

    const stripeCustomer = await getOrCreateCustomer(
      stripe,
      userId,
      userEmail,
      userInfo?.name as string | undefined
    );

    // 若 DB 尚未存 customer ID，補存
    if (!userInfo?.stripe_customer_id) {
      await c.env.DB.prepare(`
        UPDATE users SET stripe_customer_id = ? WHERE id = ?
      `).bind(stripeCustomer.id, userId).run();
    }

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

        // 使用預建立的 Stripe Coupon（若有），否則 fallback 建立一次性 coupon
        const existingCouponId = promo.stripe_coupon_id as string | null;

        try {
          let activeCouponId: string;

          if (existingCouponId) {
            // 使用管理員建立 promo code 時預先建立的 coupon（推薦路徑）
            activeCouponId = existingCouponId;
          } else if (promo.discount_type !== 'credits_bonus') {
            // Fallback：舊有 promo code 尚未設定 stripe_coupon_id，建立一次性 coupon
            const couponId = `${promoCode}_${userId}_${Date.now()}`;
            const couponParams: Record<string, unknown> = {
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
            activeCouponId = couponId;
          } else {
            // credits_bonus 類型：無 Stripe 折扣，僅內部發放 credits
            activeCouponId = '';
          }

          if (activeCouponId) {
            discounts = [{ coupon: activeCouponId }];
          }

          // 在 metadata 記錄優惠碼信息
          metadata.promo_code = promoCode;
          metadata.promo_code_id = promo.id as string;
          metadata.bonus_credits = (promo.bonus_credits || 0).toString();

        } catch (err) {
          console.error('Failed to apply Stripe coupon:', err);
          // 繼續執行，不阻擋用戶付款
        }
      } else {
        return c.json({
          error: 'Invalid or expired promo code'
        }, 400);
      }
    }

    // 建立 Checkout Session（傳入 customer ID 避免重複建立 customer）
    // Stripe Tax：automatic_tax 自動計算稅額；訂閱模式需 customer_update.address='auto'
    // 讓 Stripe 用結帳時收集的地址回填 customer（否則 automatic_tax 會因缺地址報錯）
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomer.id,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      discounts,
      success_url: `${c.env.FRONTEND_URL}/dashboard/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${c.env.FRONTEND_URL}/pricing?canceled=true`,
      metadata,
      allow_promotion_codes: !promoCode,  // 如果已有優惠碼就不允許再輸入
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
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
    
    // 查詢用戶的訂閱 ID
    const subscriptionId = userInfo.stripe_subscription_id as string | null;
    
    // 如果有訂閱，先從 Stripe 獲取正確的 customer ID
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const stripeCustomerId = subscription.customer as string;
        
        // 如果訂閱的 customer 和我們記錄的不同，使用訂閱的正確 customer
        if (stripeCustomerId !== customerId) {
          console.warn(`⚠️ Customer mismatch detected!`);
          console.log(`   Database: ${customerId}`);
          console.log(`   Stripe:   ${stripeCustomerId}`);
          console.log(`   Using Stripe's customer ID`);
          
          customerId = stripeCustomerId;
          
          // 同步更新資料庫
          await c.env.DB.prepare(`
            UPDATE users 
            SET stripe_customer_id = ?
            WHERE id = ?
          `).bind(customerId, userId).run();
          
          console.log(`✅ Customer ID synced to database`);
        }
        
        // 建立 Portal Session with subscription_update flow
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${c.env.FRONTEND_URL}/dashboard?portal_return=true`,
          flow_data: {
            type: 'subscription_update',
            subscription_update: {
              subscription: subscriptionId
            },
            after_completion: {
              type: 'redirect',
              redirect: {
                return_url: `${c.env.FRONTEND_URL}/dashboard/credits?portal_return=true`
              }
            }
          }
        });
        
        console.log(`✅ Portal session created with subscription_update flow`);
        
        return c.json({
          success: true,
          portalUrl: session.url,
        });
        
      } catch (subError) {
        console.error('Failed to retrieve subscription or create portal:', subError);
        throw subError;
      }
    }
    
    // 如果沒有訂閱，建立標準 Portal（只能查看和管理付款方式）
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${c.env.FRONTEND_URL}/dashboard?portal_return=true`,
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
 * POST /api/checkout/credits
 * 建立一次性 Credits 購買 Checkout Session（payment mode）
 */
router.post('/credits', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const userEmail = c.get('userEmail') as string;
    
    const { creditAmount } = await c.req.json<{
      creditAmount: number;
    }>();
    
    // 驗證金額範圍（1,000 - 50,000 credits）
    if (!creditAmount || creditAmount < 1000 || creditAmount > 50000) {
      return c.json({ error: 'Credit amount must be between 1,000 and 50,000' }, 400);
    }
    
    // 確保是 1000 的整數倍
    if (creditAmount % 1000 !== 0) {
      return c.json({ error: 'Credit amount must be a multiple of 1,000' }, 400);
    }
    
    // 計算價格：$0.01 per credit = $10 per 1000 credits
    // Stripe 使用 cents，所以 1 credit = 1 cent
    const priceInCents = creditAmount; // $0.01 per credit
    
    const stripe = getStripe(c.env);

    // 確保用戶有 Stripe Customer ID
    const userInfoForCredits = await c.env.DB.prepare(`
      SELECT name, stripe_customer_id FROM users WHERE id = ?
    `).bind(userId).first();

    const stripeCustomerForCredits = await getOrCreateCustomer(
      stripe,
      userId,
      userEmail,
      userInfoForCredits?.name as string | undefined
    );

    if (!userInfoForCredits?.stripe_customer_id) {
      await c.env.DB.prepare(`
        UPDATE users SET stripe_customer_id = ? WHERE id = ?
      `).bind(stripeCustomerForCredits.id, userId).run();
    }

    // 建立 Checkout Session（payment mode，一次性付款）
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: stripeCustomerForCredits.id,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${creditAmount.toLocaleString()} OAO.TO Credits`,
              description: `One-time purchase of ${creditAmount.toLocaleString()} API credits. Credits never expire.`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          user_id: userId,
          credits_amount: creditAmount.toString(),
          purchase_type: 'credits',
        },
      },
      success_url: `${c.env.FRONTEND_URL}/dashboard/credits?purchase=success&credits=${creditAmount}`,
      cancel_url: `${c.env.FRONTEND_URL}/pricing?canceled=true`,
      metadata: {
        user_id: userId,
        credits_amount: creditAmount.toString(),
        purchase_type: 'credits',
      },
      // Stripe Tax：一次性付款也自動計算稅額。payment 模式下 customer_update
      // 非必要，Stripe 會用結帳收集的地址；此處僅啟用 automatic_tax
      automatic_tax: { enabled: true },
    });
    
    return c.json({
      success: true,
      sessionUrl: session.url,
      sessionId: session.id,
    });
    
  } catch (error) {
    console.error('Credits checkout error:', error);
    return c.json({ 
      error: 'Failed to create credits checkout session',
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
