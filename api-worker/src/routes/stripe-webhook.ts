import { Hono } from 'hono';
import type { Env } from '../types';
import { getStripe, getWebhookSecret, verifyWebhookSignature } from '../utils/stripe';
import Stripe from 'stripe';

const router = new Hono<{ Bindings: Env }>();

/**
 * POST /api/webhook/stripe
 * 接收並處理 Stripe Webhook 事件
 */
router.post('/stripe', async (c) => {
  try {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      console.error('Missing stripe-signature header');
      return c.json({ error: 'Missing signature' }, 400);
    }
    
    const body = await c.req.text();
    const stripe = getStripe(c.env);
    const webhookSecret = getWebhookSecret(c.env);
    
    // 驗證簽名
    let event: Stripe.Event;
    try {
      event = await verifyWebhookSignature(body, signature, webhookSecret, stripe);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return c.json({ error: 'Invalid signature' }, 400);
    }
    
    console.log(`📨 Received webhook: ${event.type} (${event.id})`);
    
    // 冪等性檢查
    const existing = await c.env.DB.prepare(`
      SELECT * FROM stripe_events WHERE stripe_event_id = ?
    `).bind(event.id).first();
    
    if (existing && existing.processed === 1) {
      console.log(`✓ Event ${event.id} already processed`);
      return c.json({ received: true });
    }
    
    // 記錄事件
    if (!existing) {
      await c.env.DB.prepare(`
        INSERT INTO stripe_events 
        (id, stripe_event_id, event_type, raw_data, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event.id,
        event.type,
        JSON.stringify(event),
        Date.now()
      ).run();
    }
    
    // 標記為處理中
    await c.env.DB.prepare(`
      UPDATE stripe_events 
      SET processing_started_at = ? 
      WHERE stripe_event_id = ?
    `).bind(Date.now(), event.id).run();
    
    // 根據事件類型處理
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(c.env, event.data.object as Stripe.Checkout.Session);
          break;
          
        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(c.env, event.data.object as Stripe.Invoice);
          break;
          
        case 'invoice.payment_failed':
          await handlePaymentFailed(c.env, event.data.object as Stripe.Invoice);
          break;
          
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(c.env, event.data.object as Stripe.Subscription);
          break;
          
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(c.env, event.data.object as Stripe.Subscription);
          break;
          
        case 'payment_intent.succeeded':
          // 一次性支付成功（購買 Credits）
          await handlePaymentIntentSucceeded(c.env, event.data.object as Stripe.PaymentIntent);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      // 標記為已處理
      await c.env.DB.prepare(`
        UPDATE stripe_events 
        SET processed = 1, processing_completed_at = ?
        WHERE stripe_event_id = ?
      `).bind(Date.now(), event.id).run();
      
      console.log(`✅ Event ${event.id} processed successfully`);
      
    } catch (err) {
      // 記錄錯誤
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      await c.env.DB.prepare(`
        UPDATE stripe_events 
        SET error = ? 
        WHERE stripe_event_id = ?
      `).bind(errorMessage, event.id).run();
      
      console.error(`❌ Event ${event.id} processing failed:`, err);
      // 仍然返回 200，讓 Stripe 不要重試（錯誤已記錄）
    }
    
    return c.json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ 
      error: 'Webhook processing failed' 
    }, 500);
  }
});

/**
 * 處理 Checkout Session 完成
 * 用戶首次訂閱成功
 */
async function handleCheckoutCompleted(
  env: Env,
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('Processing checkout.session.completed:', session.id);
  
  const userId = session.metadata?.user_id;
  const planType = session.metadata?.plan_type;
  const promoCode = session.metadata?.promo_code;
  const promoCodeId = session.metadata?.promo_code_id;
  const bonusCredits = parseInt(session.metadata?.bonus_credits || '0');
  
  if (!userId || !planType) {
    throw new Error('Missing required metadata: user_id or plan_type');
  }
  
  // 獲取訂閱信息
  const subscription = session.subscription 
    ? await getStripe(env).subscriptions.retrieve(session.subscription as string)
    : null;
  
  if (!subscription) {
    console.warn('No subscription found in checkout session');
    return;
  }
  
  // 查詢方案配置
  const plan = await env.DB.prepare(`
    SELECT * FROM plans WHERE name = ?
  `).bind(planType).first();
  
  if (!plan) {
    throw new Error(`Plan not found: ${planType}`);
  }
  
  // 1. 更新 credits 表
  await env.DB.prepare(`
    UPDATE credits
    SET 
      plan_type = ?,
      stripe_subscription_id = ?,
      subscription_status = 'active',
      subscription_current_period_end = ?,
      updated_at = ?
    WHERE user_id = ?
  `).bind(
    planType,
    subscription.id,
    subscription.current_period_end * 1000,
    Date.now(),
    userId
  ).run();
  
  // 2. 發放升級獎勵（如果有）
  const upgradeBonus = plan.upgrade_bonus as number || 0;
  if (upgradeBonus > 0) {
    await env.DB.prepare(`
      UPDATE credits
      SET 
        balance = balance + ?,
        bonus_balance = COALESCE(bonus_balance, 0) + ?,
        updated_at = ?
      WHERE user_id = ?
    `).bind(upgradeBonus, upgradeBonus, Date.now(), userId).run();
    
    // 記錄交易
    await env.DB.prepare(`
      INSERT INTO credit_transactions
      (id, user_id, type, amount, balance_after, description, created_at)
      VALUES (?, ?, 'bonus', ?, 
        (SELECT balance FROM credits WHERE user_id = ?),
        ?, ?)
    `).bind(
      `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      upgradeBonus,
      userId,
      `${planType} plan 升級獎勵`,
      Date.now()
    ).run();
  }
  
  // 3. 發放優惠碼獎勵（如果有）
  if (bonusCredits > 0 && promoCode && promoCodeId) {
    await env.DB.prepare(`
      UPDATE credits
      SET 
        balance = balance + ?,
        bonus_balance = COALESCE(bonus_balance, 0) + ?,
        updated_at = ?
      WHERE user_id = ?
    `).bind(bonusCredits, bonusCredits, Date.now(), userId).run();
    
    // 記錄優惠碼使用
    await env.DB.prepare(`
      INSERT INTO promo_code_usage
      (id, promo_code_id, user_id, credits_bonus, stripe_session_id, stripe_subscription_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      promoCodeId,
      userId,
      bonusCredits,
      session.id,
      subscription.id,
      Date.now()
    ).run();
    
    // 更新優惠碼使用次數
    await env.DB.prepare(`
      UPDATE promo_codes
      SET current_uses = current_uses + 1
      WHERE id = ?
    `).bind(promoCodeId).run();
    
    // 記錄交易
    await env.DB.prepare(`
      INSERT INTO credit_transactions
      (id, user_id, type, amount, balance_after, description, created_at)
      VALUES (?, ?, 'bonus', ?, 
        (SELECT balance FROM credits WHERE user_id = ?),
        ?, ?)
    `).bind(
      `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      bonusCredits,
      userId,
      `優惠碼獎勵: ${promoCode}`,
      Date.now()
    ).run();
  }
  
  console.log(`✅ Checkout completed for user ${userId}, plan ${planType}`);
}

/**
 * 處理每月扣款成功
 * 重置月配額
 */
async function handlePaymentSucceeded(
  env: Env,
  invoice: Stripe.Invoice
): Promise<void> {
  console.log('Processing invoice.payment_succeeded:', invoice.id);
  
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) {
    console.warn('No subscription in invoice');
    return;
  }
  
  // 查詢用戶
  const credits = await env.DB.prepare(`
    SELECT user_id FROM credits 
    WHERE stripe_subscription_id = ?
  `).bind(subscriptionId).first();
  
  if (!credits) {
    console.warn(`No user found for subscription ${subscriptionId}`);
    return;
  }
  
  const userId = credits.user_id as string;
  
  // 重置月配額
  const nextResetDate = new Date();
  nextResetDate.setMonth(nextResetDate.getMonth() + 1);
  nextResetDate.setDate(1);
  nextResetDate.setHours(0, 0, 0, 0);
  
  await env.DB.prepare(`
    UPDATE credits
    SET 
      monthly_used = 0,
      monthly_reset_at = ?,
      overage_used = 0,
      subscription_current_period_end = ?,
      updated_at = ?
    WHERE user_id = ?
  `).bind(
    nextResetDate.getTime(),
    invoice.period_end * 1000,
    Date.now(),
    userId
  ).run();
  
  console.log(`✅ Monthly quota reset for user ${userId}`);
}

/**
 * 處理扣款失敗
 */
async function handlePaymentFailed(
  env: Env,
  invoice: Stripe.Invoice
): Promise<void> {
  console.log('Processing invoice.payment_failed:', invoice.id);
  
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;
  
  // 更新訂閱狀態為 past_due
  await env.DB.prepare(`
    UPDATE credits
    SET 
      subscription_status = 'past_due',
      updated_at = ?
    WHERE stripe_subscription_id = ?
  `).bind(Date.now(), subscriptionId).run();
  
  console.log(`⚠️ Payment failed for subscription ${subscriptionId}`);
  // TODO: 發送郵件通知用戶
}

/**
 * 處理訂閱更新
 * 用戶升級/降級方案
 */
async function handleSubscriptionUpdated(
  env: Env,
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Processing customer.subscription.updated:', subscription.id);
  
  const credits = await env.DB.prepare(`
    SELECT * FROM credits 
    WHERE stripe_subscription_id = ?
  `).bind(subscription.id).first();
  
  if (!credits) {
    console.warn(`No credits found for subscription ${subscription.id}`);
    return;
  }
  
  // 更新訂閱狀態
  await env.DB.prepare(`
    UPDATE credits
    SET 
      subscription_status = ?,
      subscription_current_period_end = ?,
      subscription_cancel_at_period_end = ?,
      updated_at = ?
    WHERE stripe_subscription_id = ?
  `).bind(
    subscription.status,
    subscription.current_period_end * 1000,
    subscription.cancel_at_period_end ? 1 : 0,
    Date.now(),
    subscription.id
  ).run();
  
  console.log(`✅ Subscription ${subscription.id} updated to status: ${subscription.status}`);
}

/**
 * 處理訂閱取消
 */
async function handleSubscriptionDeleted(
  env: Env,
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Processing customer.subscription.deleted:', subscription.id);
  
  const credits = await env.DB.prepare(`
    SELECT * FROM credits 
    WHERE stripe_subscription_id = ?
  `).bind(subscription.id).first();
  
  if (!credits) {
    console.warn(`No credits found for subscription ${subscription.id}`);
    return;
  }
  
  // 標記為已取消，設定到期時間
  await env.DB.prepare(`
    UPDATE credits
    SET 
      subscription_status = 'canceled',
      subscription_cancel_at_period_end = ?,
      updated_at = ?
    WHERE stripe_subscription_id = ?
  `).bind(
    subscription.current_period_end * 1000,
    Date.now(),
    subscription.id
  ).run();
  
  console.log(`✅ Subscription ${subscription.id} marked as canceled`);
  // 注意：不立即降級，等到期後再降級（由 cron job 處理）
}

/**
 * 處理一次性支付成功
 * 用於購買 Credits
 */
async function handlePaymentIntentSucceeded(
  env: Env,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.log('Processing payment_intent.succeeded:', paymentIntent.id);
  
  const userId = paymentIntent.metadata?.user_id;
  const creditsAmount = parseInt(paymentIntent.metadata?.credits_amount || '0');
  
  if (!userId || !creditsAmount) {
    console.warn('Missing metadata for payment intent');
    return;
  }
  
  // 增加 credits
  await env.DB.prepare(`
    UPDATE credits
    SET 
      balance = balance + ?,
      purchased_balance = COALESCE(purchased_balance, 0) + ?,
      total_purchased = COALESCE(total_purchased, 0) + ?,
      updated_at = ?
    WHERE user_id = ?
  `).bind(
    creditsAmount,
    creditsAmount,
    creditsAmount,
    Date.now(),
    userId
  ).run();
  
  // 記錄交易
  await env.DB.prepare(`
    INSERT INTO credit_transactions
    (id, user_id, type, amount, balance_after, description, metadata, created_at)
    VALUES (?, ?, 'purchase', ?, 
      (SELECT balance FROM credits WHERE user_id = ?),
      ?, ?, ?)
  `).bind(
    `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    creditsAmount,
    userId,
    `購買 ${creditsAmount} credits`,
    JSON.stringify({ payment_intent_id: paymentIntent.id }),
    Date.now()
  ).run();
  
  console.log(`✅ ${creditsAmount} credits added for user ${userId}`);
}

export default router;
