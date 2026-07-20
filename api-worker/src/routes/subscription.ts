import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { getStripe } from '../utils/stripe';
import { syncSubscriptionFromStripe } from '../utils/stripe-sync';

const router = new Hono<{ Bindings: Env }>();

router.use('*', requireAuth);

/**
 * GET /api/subscription/status
 * 獲取完整訂閱狀態（包含待生效變更）
 */
router.get('/status', async (c) => {
  try {
    const userId = c.get('userId') as string;
    
    // 獲取用戶訂閱資訊（包含 Stripe Customer ID）
    // 有效方案 = COALESCE(plan_override, plan_type)：admin 手動指定優先
    const result = await c.env.DB.prepare(`
      SELECT
        c.*,
        COALESCE(c.plan_override, c.plan_type) as effective_plan,
        u.stripe_customer_id,
        p.display_name as plan_display_name,
        p.price_monthly,
        p.price_yearly,
        p.monthly_credits as plan_monthly_credits
      FROM credits c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN plans p ON COALESCE(c.plan_override, c.plan_type) = p.name
      WHERE c.user_id = ?
    `).bind(userId).first();

    if (!result) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    const planType = result.effective_plan as string;
    const billingPeriod = (result.billing_period as string) || 'monthly';
    // plans 表存美元（9.99 / 29.99），API 統一輸出 cents（與 scheduledChange 的
    // display_price 來源一致），避免 formatPrice(cents) 把付費方案顯示成 $0.30
    const currentPriceDollars = billingPeriod === 'yearly'
      ? (result.price_yearly as number)
      : (result.price_monthly as number);
    const currentPrice = Math.round((currentPriceDollars || 0) * 100);

    // 構建當前狀態
    const currentStatus = {
      plan: planType,
      planDisplayName: result.plan_display_name || planType,
      billingPeriod: billingPeriod,
      price: currentPrice,
      priceFormatted: formatPrice(currentPrice),
      periodStart: result.subscription_current_period_start as number || null,
      periodEnd: result.subscription_current_period_end as number || null,
      periodEndFormatted: result.subscription_current_period_end 
        ? formatDate(result.subscription_current_period_end as number)
        : null,
      status: result.subscription_status as string || 'active',
      features: {
        monthlyQuota: result.plan_monthly_credits as number,
        analytics: planType === 'pro' || planType === 'enterprise' ? 'premium' : 'basic',
        support: planType === 'pro' ? 'priority' : planType === 'enterprise' ? 'dedicated' : 'email',
      }
    };
    
    // 解析待生效變更
    let scheduledChange = null;
    const cancelAtPeriodEnd = result.cancel_at_period_end === 1;
    const scheduledPlanChange = result.scheduled_plan_change as string | null;
    
    if (scheduledPlanChange && scheduledPlanChange !== 'null') {
      try {
        const change = JSON.parse(scheduledPlanChange);
        const effectiveDate = change.effectiveDate as number;
        const daysUntilChange = Math.ceil((effectiveDate - Date.now()) / (1000 * 60 * 60 * 24));
        
        // 獲取新方案的資訊
        let newPlanInfo = null;
        if (change.toPlan && change.toPlan !== 'free') {
          newPlanInfo = await c.env.DB.prepare(`
            SELECT * FROM plans WHERE name = ?
          `).bind(change.toPlan).first();
        }
        
        scheduledChange = {
          type: change.type,
          newPlan: change.toPlan,
          newPlanDisplayName: newPlanInfo?.display_name || change.toPlan || 'Free',
          newBillingPeriod: change.toPeriod,
          newPrice: change.toPrice,
          newPriceFormatted: formatPrice(change.toPrice),
          effectiveDate: effectiveDate,
          effectiveDateFormatted: formatDate(effectiveDate),
          daysUntilChange: daysUntilChange,
          canRevert: change.canRevert !== false,  // 預設可以取消
          changes: {
            monthlyQuota: {
              from: result.plan_monthly_credits as number,
              to: newPlanInfo?.monthly_credits || 100  // Free plan 預設 100
            },
            analytics: {
              from: currentStatus.features.analytics,
              to: change.toPlan === 'pro' || change.toPlan === 'enterprise' ? 'premium' : 'basic'
            },
            support: {
              from: currentStatus.features.support,
              to: change.toPlan === 'pro' ? 'priority' : change.toPlan === 'enterprise' ? 'dedicated' : 'email'
            }
          }
        };
      } catch (error) {
        console.error('Failed to parse scheduled_plan_change:', error);
      }
    }
    
    return c.json({
      success: true,
      subscription: {
        current: currentStatus,
        scheduledChange,
        cancelAtPeriodEnd,
        stripeSubscriptionId: (result.stripe_subscription_id as string) || null,
        stripeCustomerId: (result.stripe_customer_id as string) || null,
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch subscription status:', error);
    return c.json({ error: 'Failed to fetch subscription status' }, 500);
  }
});

/**
 * POST /api/subscription/cancel-scheduled-change
 * 取消待生效的變更（降級、取消等）
 */
router.post('/cancel-scheduled-change', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { reason } = await c.req.json().catch(() => ({}));
    
    // 獲取當前訂閱資訊
    const result = await c.env.DB.prepare(`
      SELECT * FROM credits WHERE user_id = ?
    `).bind(userId).first();
    
    if (!result) {
      return c.json({ error: 'Subscription not found' }, 404);
    }
    
    const subscriptionId = result.stripe_subscription_id as string;
    if (!subscriptionId) {
      return c.json({ error: 'No active subscription' }, 400);
    }
    
    // 檢查是否有待生效變更
    const cancelAtPeriodEnd = result.cancel_at_period_end === 1;
    const scheduledPlanChange = result.scheduled_plan_change as string | null;
    
    if (!cancelAtPeriodEnd && !scheduledPlanChange) {
      return c.json({ error: 'No scheduled change to cancel' }, 400);
    }
    
    // 通過 Stripe API 取消 scheduled change
    const stripe = getStripe(c.env);
    
    try {
      // 如果是取消訂閱，則恢復訂閱
      if (cancelAtPeriodEnd) {
        await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: false,
        });
        console.log(`✅ Canceled subscription cancellation for ${subscriptionId}`);
      }
      
      // 如果有排程降級（subscription_schedule），需要釋放 schedule
      if (scheduledPlanChange && scheduledPlanChange !== 'null') {
        const customerRow = await c.env.DB.prepare(
          'SELECT stripe_customer_id FROM users WHERE id = ?'
        ).bind(userId).first();
        const customerId = customerRow?.stripe_customer_id as string | null;

        if (customerId) {
          try {
            // 查找此訂閱的 subscription_schedule
            const schedules = await stripe.subscriptionSchedules.list({
              customer: customerId,
              limit: 5,
            });

            const activeSchedule = schedules.data.find(
              (s: any) => s.subscription === subscriptionId && s.status === 'active'
            );

            if (activeSchedule) {
              await stripe.subscriptionSchedules.release(activeSchedule.id);
              console.log(`✅ Released subscription schedule ${activeSchedule.id}`);
            }
          } catch (schedError) {
            // 釋放失敗就不能清 DB，否則本地與 Stripe 永久不同步。
            // 丟給外層回 500，讓用戶重試
            console.error('Failed to release subscription schedule:', schedError);
            throw schedError;
          }
        } else {
          console.warn(`No stripe_customer_id for user ${userId}, skipping schedule release`);
        }
      }

      // 以 Stripe 為準全量重新同步本地狀態（取代手動清欄位）
      await syncSubscriptionFromStripe(c.env, subscriptionId);

      // 記錄取消操作
      await c.env.DB.prepare(`
        INSERT INTO credit_transactions
        (id, user_id, type, amount, balance_after, description, metadata, created_at)
        VALUES (?, ?, 'subscription', 0,
          (SELECT balance FROM credits WHERE user_id = ?),
          ?, ?, ?)
      `).bind(
        `trans_revert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userId,
        'Scheduled change canceled',
        JSON.stringify({
          reason: reason || 'User canceled scheduled change',
          canceledAt: Date.now()
        }),
        Date.now()
      ).run();

      // 重新獲取更新後的狀態
      const updated = await c.env.DB.prepare(`
        SELECT
          c.*,
          COALESCE(c.plan_override, c.plan_type) as effective_plan,
          p.display_name as plan_display_name,
          p.price_monthly,
          p.price_yearly
        FROM credits c
        LEFT JOIN plans p ON COALESCE(c.plan_override, c.plan_type) = p.name
        WHERE c.user_id = ?
      `).bind(userId).first();
      
      return c.json({
        success: true,
        message: 'Scheduled change has been canceled',
        subscription: {
          current: {
            plan: updated!.effective_plan,
            planDisplayName: updated!.plan_display_name,
            status: updated!.subscription_status || 'active',
          }
        }
      });
      
    } catch (stripeError) {
      console.error('Stripe API error:', stripeError);
      return c.json({ 
        error: 'Failed to cancel scheduled change with Stripe' 
      }, 500);
    }
    
  } catch (error) {
    console.error('Failed to cancel scheduled change:', error);
    return c.json({ error: 'Failed to cancel scheduled change' }, 500);
  }
});

/**
 * Helper: 格式化價格
 */
function formatPrice(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Helper: 格式化日期
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default router;
