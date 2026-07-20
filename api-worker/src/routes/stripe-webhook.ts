import { Hono } from 'hono';
import type { Env } from '../types';
import { getStripe, getWebhookSecret, verifyWebhookSignature } from '../utils/stripe';
import { syncSubscriptionFromStripe, downgradeSubscriptionToFree } from '../utils/stripe-sync';
import { trySendDunningEmail } from '../utils/dunning';
import { trySendLifecycleEmail } from '../utils/lifecycle-email';
import {
  buildReceiptEmail,
  buildCreditsReceiptEmail,
  buildWelcomeEmail,
  buildRefundEmail,
  buildCancellationEmail,
} from '../utils/email-i18n';
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
        case 'checkout.session.async_payment_succeeded':
          // async_payment_succeeded：延遲付款方式（如銀行轉帳）入帳後的 fulfill 訊號
          await handleCheckoutCompleted(c.env, event.data.object as Stripe.Checkout.Session);
          break;

        case 'checkout.session.async_payment_failed': {
          const failedSession = event.data.object as Stripe.Checkout.Session;
          console.warn(`⚠️ Async payment failed for session ${failedSession.id}, user ${failedSession.metadata?.user_id} — nothing fulfilled`);
          break;
        }

        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(c.env, event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(c.env, event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_action_required':
          // SCA / 3D Secure 需要用戶操作
          await handlePaymentActionRequired(c.env, event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.updated': {
          // 事件只當觸發器：從 Stripe 全量重新同步，不解讀事件內容
          const sub = event.data.object as Stripe.Subscription;
          await syncSubscriptionFromStripe(c.env, sub.id);
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          // 先反查 userId（降級會處理 credits 列，先查才拿得到對應用戶）
          const row = await c.env.DB.prepare(
            `SELECT user_id FROM credits WHERE stripe_subscription_id = ?`
          ).bind(sub.id).first();
          await downgradeSubscriptionToFree(c.env, sub.id, 'subscription_deleted');
          if (row?.user_id) {
            const until = sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10)
              : null;
            await trySendLifecycleEmail(c.env, {
              kind: 'cancellation',
              key: sub.id,
              userId: row.user_id as string,
              from: 'noreply',
              build: (locale) => buildCancellationEmail(locale, { accessUntil: until }),
            });
          }
          break;
        }

        case 'charge.refunded':
          // 退款：從已授予的 credits 中回收（支援部分退款按比例回收）
          await handleChargeRefunded(c.env, event.data.object as Stripe.Charge);
          break;

        case 'charge.dispute.created':
          // 用戶對付款發起爭議，記錄警告 + 標記帳號 + audit trail
          await handleDisputeCreated(c.env, event.data.object as Stripe.Dispute);
          break;

        case 'subscription_schedule.created':
        case 'subscription_schedule.updated':
        case 'subscription_schedule.released':
        case 'subscription_schedule.canceled':
        case 'subscription_schedule.completed': {
          // 排程任何變化都觸發全量同步（含降級生效、排程取消）
          const schedule = event.data.object as Stripe.SubscriptionSchedule;
          const scheduleSubId =
            typeof schedule.subscription === 'string' ? schedule.subscription : schedule.subscription?.id;
          if (scheduleSubId) {
            await syncSubscriptionFromStripe(c.env, scheduleSubId);
          }
          break;
        }

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
      // 回 500 讓 Stripe 重試。handler 皆為冪等（deterministic transaction id
      // + D1 batch 原子寫入），重試不會重複發放 credits
      return c.json({ error: 'Event processing failed, will retry' }, 500);
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
 * 支援：首次訂閱 (subscription) 和一次性 Credits 購買 (payment)
 */
async function handleCheckoutCompleted(
  env: Env,
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('Processing checkout.session.completed:', session.id);

  // 付款確認 gate：延遲付款方式在 checkout.session.completed 時
  // payment_status 還是 'unpaid'，錢到帳後 Stripe 會再發
  // checkout.session.async_payment_succeeded（session.payment_status = 'paid'）
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    console.log(`⏸ Session ${session.id} payment_status=${session.payment_status}, fulfillment deferred until payment confirms`);
    return;
  }

  // 一次性 Credits 購買走獨立處理路徑
  if (session.metadata?.purchase_type === 'credits') {
    await handleCreditsCheckoutCompleted(env, session);
    return;
  }

  const userId = session.metadata?.user_id;
  const planType = session.metadata?.plan_type;
  const billingPeriod = session.metadata?.billing_period || 'monthly';
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

  // 只在訂閱真的生效時 fulfill（incomplete = 首次扣款未成功）
  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    console.warn(`⏸ Subscription ${subscription.id} status=${subscription.status}, not activating plan yet`);
    return;
  }

  // 查詢方案配置
  const plan = await env.DB.prepare(`
    SELECT * FROM plans WHERE name = ?
  `).bind(planType).first();
  
  if (!plan) {
    throw new Error(`Plan not found: ${planType}`);
  }
  
  // 先讀升級前狀態（必須在 UPDATE 之前，否則 from_plan 會是新方案）
  const currentCredits = await env.DB.prepare(`
    SELECT c.monthly_used, c.plan_type, p.monthly_credits as old_quota
    FROM credits c
    LEFT JOIN plans p ON c.plan_type = p.name
    WHERE c.user_id = ?
  `).bind(userId).first();

  const oldQuota = currentCredits?.old_quota as number || 100;
  const monthlyUsed = currentCredits?.monthly_used as number || 0;
  const newQuota = plan.monthly_credits as number;
  const immediateIncrease = newQuota - monthlyUsed;  // 當下實際增加的可用量
  const now = Date.now();

  // 核心啟用 batch（原子）。deterministic transaction id = 以 session.id 為鍵，
  // webhook 重試時：pre-check 跳過；並發重複投遞時：PK 衝突讓整個 batch 回滾
  const activationTxnId = `trans_sub_${session.id}`;
  const alreadyActivated = await env.DB.prepare(`
    SELECT 1 AS done FROM credit_transactions WHERE id = ?
  `).bind(activationTxnId).first();

  if (!alreadyActivated) {
    const upgradeBonus = plan.upgrade_bonus as number || 0;
    const activationBatch = [
      // 1. users 表關聯 Stripe customer（關鍵！）
      env.DB.prepare(`
        UPDATE users SET stripe_customer_id = ? WHERE id = ?
      `).bind(session.customer, userId),
      // 2. credits 表啟用新方案
      env.DB.prepare(`
        UPDATE credits
        SET
          plan_type = ?,
          billing_period = ?,
          stripe_subscription_id = ?,
          subscription_status = 'active',
          subscription_current_period_start = ?,
          subscription_current_period_end = ?,
          cancel_at_period_end = 0,
          scheduled_plan_change = NULL,
          last_plan_change_type = 'upgrade',
          last_plan_change_at = ?,
          updated_at = ?
        WHERE user_id = ?
      `).bind(
        planType,
        billingPeriod,
        subscription.id,
        subscription.current_period_start * 1000,
        subscription.current_period_end * 1000,
        now,
        now,
        userId
      ),
      // 3. 升級獎勵（無獎勵時 +0，保持 batch 結構單純）
      env.DB.prepare(`
        UPDATE credits
        SET
          balance = balance + ?,
          bonus_balance = COALESCE(bonus_balance, 0) + ?,
          updated_at = ?
        WHERE user_id = ?
      `).bind(upgradeBonus, upgradeBonus, now, userId),
      // 4. 訂閱交易紀錄（deterministic id — 冪等鍵）
      env.DB.prepare(`
        INSERT INTO credit_transactions
        (id, user_id, type, amount, balance_after, description, metadata, created_at)
        VALUES (?, ?, 'subscription', ?,
          (SELECT balance FROM credits WHERE user_id = ?),
          ?, ?, ?)
      `).bind(
        activationTxnId,
        userId,
        upgradeBonus,
        userId,
        `Upgraded to ${planType} Plan`,
        JSON.stringify({
          action: 'upgrade',
          from_plan: currentCredits?.plan_type || 'free',
          to_plan: planType,
          quota_from: oldQuota,
          quota_to: newQuota,
          monthly_used: monthlyUsed,
          immediate_increase: immediateIncrease,
          upgrade_bonus: upgradeBonus,
          checkout_session_id: session.id
        }),
        now
      ),
    ];
    await env.DB.batch(activationBatch);
  } else {
    console.log(`✓ Activation for session ${session.id} already applied, skipping`);
  }

  // 優惠碼獎勵（獨立 batch：失敗不影響方案啟用；usage INSERT 在前，
  // UNIQUE(promo_code_id, user_id) 衝突會讓整個 batch 回滾 → 不會重複發放）
  if (bonusCredits > 0 && promoCode && promoCodeId) {
    const alreadyRedeemed = await env.DB.prepare(`
      SELECT 1 AS done FROM promo_code_usage WHERE stripe_session_id = ?
    `).bind(session.id).first();

    if (!alreadyRedeemed) {
      try {
        // 第一句 INSERT 帶全域 max_uses guard：售罄時插入 0 列，
        // 後續每句都以 usage 列存在為前提（EXISTS guard）→ 整包原子、無法超賣。
        // 同用戶重複則由 UNIQUE(promo_code_id, user_id) 讓整個 batch 回滾
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO promo_code_usage
            (id, promo_code_id, user_id, credits_bonus, stripe_session_id, stripe_subscription_id, created_at)
            SELECT ?, ?, ?, ?, ?, ?, ?
            FROM promo_codes
            WHERE id = ? AND (max_uses IS NULL OR current_uses < max_uses)
          `).bind(`usage_${session.id}`, promoCodeId, userId, bonusCredits, session.id, subscription.id, now, promoCodeId),
          env.DB.prepare(`
            UPDATE credits
            SET
              balance = balance + ?,
              bonus_balance = COALESCE(bonus_balance, 0) + ?,
              updated_at = ?
            WHERE user_id = ?
              AND EXISTS (SELECT 1 FROM promo_code_usage WHERE stripe_session_id = ?)
          `).bind(bonusCredits, bonusCredits, now, userId, session.id),
          env.DB.prepare(`
            UPDATE promo_codes SET current_uses = current_uses + 1
            WHERE id = ?
              AND EXISTS (SELECT 1 FROM promo_code_usage WHERE stripe_session_id = ?)
          `).bind(promoCodeId, session.id),
          env.DB.prepare(`
            INSERT INTO credit_transactions
            (id, user_id, type, amount, balance_after, description, created_at)
            SELECT ?, ?, 'bonus', ?,
              (SELECT balance FROM credits WHERE user_id = ?),
              ?, ?
            WHERE EXISTS (SELECT 1 FROM promo_code_usage WHERE stripe_session_id = ?)
          `).bind(`trans_promo_${session.id}`, userId, bonusCredits, userId, `Promo Code Bonus: ${promoCode}`, now, session.id),
        ]);
      } catch (promoErr) {
        // UNIQUE 衝突 = 此用戶已用過此碼（並發 checkout 繞過事前檢查）→ 不發放，不擋啟用
        console.warn(`Promo redemption skipped for session ${session.id}:`, promoErr);
      }
    }
  }

  console.log(`✅ Checkout completed for user ${userId}, plan ${planType}`);

  // 歡迎信（best-effort、冪等鍵 = session id；絕不影響開通主流程）
  await trySendLifecycleEmail(env, {
    kind: 'welcome',
    key: session.id,
    userId,
    from: 'noreply',
    build: (locale) => buildWelcomeEmail(locale, { plan: planType, billingPeriod }),
  });
}

/**
 * 處理一次性 Credits 購買完成
 * 從 checkout.session.completed 分支呼叫（purchase_type === 'credits'）
 */
async function handleCreditsCheckoutCompleted(
  env: Env,
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.user_id;
  const creditsAmount = parseInt(session.metadata?.credits_amount || '0');

  if (!userId || !creditsAmount) {
    throw new Error('Missing required metadata: user_id or credits_amount');
  }

  // 交叉驗證實收金額（$0.01/credit → amount_total 應等於 creditsAmount cents）
  if (session.amount_total !== null && session.amount_total !== creditsAmount) {
    throw new Error(
      `Credits amount mismatch for session ${session.id}: metadata=${creditsAmount}, amount_total=${session.amount_total}`
    );
  }

  // 冪等：deterministic transaction id。重試 → pre-check 跳過；
  // 並發重複投遞 → PK 衝突讓 batch 回滾，credits 不會重複發放
  const purchaseTxnId = `trans_purchase_${session.id}`;
  const alreadyApplied = await env.DB.prepare(`
    SELECT 1 AS done FROM credit_transactions WHERE id = ?
  `).bind(purchaseTxnId).first();

  if (alreadyApplied) {
    console.log(`✓ Credits purchase for session ${session.id} already applied, skipping`);
    return;
  }

  const now = Date.now();
  // payment_intent 作為 payments.stripe_payment_id，讓 charge.refunded（帶 payment_intent）能反查此筆購買
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE credits
      SET
        balance = balance + ?,
        purchased_balance = COALESCE(purchased_balance, 0) + ?,
        total_purchased = COALESCE(total_purchased, 0) + ?,
        updated_at = ?
      WHERE user_id = ?
    `).bind(creditsAmount, creditsAmount, creditsAmount, now, userId),
    env.DB.prepare(`
      INSERT INTO credit_transactions
      (id, user_id, type, amount, balance_after, description, metadata, created_at)
      VALUES (?, ?, 'purchase', ?,
        (SELECT balance FROM credits WHERE user_id = ?),
        ?, ?, ?)
    `).bind(
      purchaseTxnId,
      userId,
      creditsAmount,
      userId,
      `Purchased ${creditsAmount} credits`,
      JSON.stringify({ checkout_session_id: session.id, payment_intent: paymentIntentId }),
      now
    ),
    // 記錄到 payments 表：退款收回 credits 要靠這筆反查；同時讓 Admin Payments 頁有資料
    env.DB.prepare(`
      INSERT OR IGNORE INTO payments
      (id, user_id, amount, currency, status, plan, credits, payment_method, stripe_payment_id, stripe_customer_id, created_at, completed_at)
      VALUES (?, ?, ?, ?, 'completed', 'credits', ?, 'card', ?, ?, ?, ?)
    `).bind(
      `pay_${session.id}`,
      userId,
      (session.amount_total ?? creditsAmount) / 100,   // payments.amount 存美元
      (session.currency || 'usd').toUpperCase(),
      creditsAmount,
      paymentIntentId,
      session.customer as string || null,
      now,
      now
    ),
  ]);

  console.log(`✅ ${creditsAmount} credits added for user ${userId} via checkout ${session.id}`);

  // Credits 收據（best-effort）
  await trySendLifecycleEmail(env, {
    kind: 'credits_receipt',
    key: session.id,
    userId,
    build: (locale) => buildCreditsReceiptEmail(locale, {
      credits: creditsAmount,
      amountPaid: session.amount_total ?? creditsAmount,
      currency: session.currency || 'usd',
    }),
  });
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

  // 首次訂閱的 invoice 已由 checkout.session.completed 處理，跳過以避免重複操作
  if (invoice.billing_reason === 'subscription_create') {
    console.log(`Skipping subscription_create invoice ${invoice.id} - handled by checkout.session.completed`);
    return;
  }

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
  
  // 獲取重置前的使用量
  const beforeReset = await env.DB.prepare(`
    SELECT monthly_used, plan_type, p.monthly_credits as quota
    FROM credits c
    LEFT JOIN plans p ON c.plan_type = p.name
    WHERE c.user_id = ?
  `).bind(userId).first();
  
  const usedBefore = beforeReset?.monthly_used as number || 0;
  const quota = beforeReset?.quota as number || 100;

  // 冪等：同一張 invoice 只重置一次
  const resetTxnId = `trans_reset_${invoice.id}`;
  const alreadyReset = await env.DB.prepare(`
    SELECT 1 AS done FROM credit_transactions WHERE id = ?
  `).bind(resetTxnId).first();

  if (alreadyReset) {
    console.log(`✓ Quota reset for invoice ${invoice.id} already applied, skipping`);
    return;
  }

  // 重置月配額。monthly_reset_at 設為 30 天後，作為 cron 兜底的下次重置錨點
  // （月繳下次 invoice 會早於錨點觸發重置；年繳/漏接 webhook 時由 cron 接手）
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE credits
      SET
        monthly_used = 0,
        monthly_reset_at = ?,
        overage_used = 0,
        subscription_current_period_end = ?,
        updated_at = ?
      WHERE user_id = ?
    `).bind(now + 30 * 24 * 60 * 60 * 1000, invoice.period_end * 1000, now, userId),
    env.DB.prepare(`
      INSERT INTO credit_transactions
      (id, user_id, type, amount, balance_after, description, metadata, created_at)
      VALUES (?, ?, 'quota_reset', 0,
        (SELECT balance FROM credits WHERE user_id = ?),
        ?, ?, ?)
    `).bind(
      resetTxnId,
      userId,
      userId,
      'Monthly Quota Reset',
      JSON.stringify({
        quota: quota,
        used_before: usedBefore,
        restored: usedBefore,
        invoice_id: invoice.id
      }),
      now
    ),
  ]);

  console.log(`✅ Monthly quota reset for user ${userId}, restored ${usedBefore} credits`);

  // 續費收據（best-effort、冪等鍵 = invoice id）
  await trySendLifecycleEmail(env, {
    kind: 'receipt',
    key: invoice.id,
    userId,
    build: (locale) => buildReceiptEmail(locale, {
      amountPaid: invoice.amount_paid ?? 0,
      currency: invoice.currency || 'usd',
      invoiceUrl: invoice.hosted_invoice_url,
    }),
  });
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

  const now = Date.now();

  // 查詢用戶（用於 dunning audit trail + 寄催繳信）
  const credits = await env.DB.prepare(`
    SELECT c.user_id AS user_id, u.email AS email
    FROM credits c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.stripe_subscription_id = ?
  `).bind(subscriptionId).first();

  const userId = credits?.user_id as string | undefined;
  const userEmail = credits?.email as string | undefined;

  // 冪等：同一張 invoice 的 dunning 只記錄一次（attempt_count 併入 id 以區分每次重試）
  const dunningTxnId = `trans_dunning_${invoice.id}_${invoice.attempt_count ?? 0}`;

  // 更新訂閱狀態為 past_due + 記錄 dunning audit row（原子 batch，INSERT OR IGNORE 冪等）
  const batch: D1PreparedStatement[] = [
    env.DB.prepare(`
      UPDATE credits
      SET
        subscription_status = 'past_due',
        updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(now, subscriptionId),
  ];

  if (userId) {
    batch.push(
      env.DB.prepare(`
        INSERT OR IGNORE INTO credit_transactions
        (id, user_id, type, amount, balance_after, description, metadata, created_at)
        VALUES (?, ?, 'subscription', 0,
          (SELECT balance FROM credits WHERE user_id = ?),
          'Payment failed - dunning', ?, ?)
      `).bind(
        dunningTxnId,
        userId,
        userId,
        JSON.stringify({
          action: 'dunning',
          invoice_id: invoice.id,
          subscription_id: subscriptionId,
          attempt_count: invoice.attempt_count ?? 0,
          amount_due: invoice.amount_due,
          // cron 重試需要的欄位（webhook fast-path 失敗時，cron 從這裡取回來重寄）
          currency: invoice.currency ?? 'usd',
          hosted_invoice_url: invoice.hosted_invoice_url ?? null,
        }),
        now
      )
    );
  }

  await env.DB.batch(batch);

  console.log(`⚠️ Payment failed for subscription ${subscriptionId} (attempt ${invoice.attempt_count ?? 0}), status=past_due, dunning recorded`);

  // 催繳信 fast-path：即時試寄一次（happy path 客戶馬上收到）。
  // **失敗不影響 webhook 回應**（best-effort、不 throw）→ 這事件仍會被 mark processed。
  // 因為「同一事件」被 mark processed 後、Stripe 重送會被冪等 guard 擋掉，靠同事件重送重試 email 不可行；
  // 所以真正的重試由**每小時 cron**（retryPendingDunningEmails）負責——它掃 past_due 且尚未寄成的重寄，
  // 不依賴 Stripe 重送同一事件。這修正「寄信失敗仍被 mark processed → 同事件重送跳過重試」。
  if (env.DUNNING_EMAIL_ENABLED === 'true' && userId) {
    const toEmail = (userEmail || invoice.customer_email || '').trim();
    if (!toEmail) {
      console.warn(`📧 dunning: no email address found for subscription ${subscriptionId}, cron will skip too`);
    } else {
      await trySendDunningEmail(env, {
        userId,
        toEmail,
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count ?? 0,
        amountDue: invoice.amount_due ?? 0,
        currency: invoice.currency ?? 'usd',
        payUrl: invoice.hosted_invoice_url,
      });
    }
  }
}

/**
 * 處理 SCA / 3D Secure 需要用戶操作
 */
async function handlePaymentActionRequired(
  env: Env,
  invoice: Stripe.Invoice
): Promise<void> {
  console.log('Processing invoice.payment_action_required:', invoice.id);

  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // 不手寫狀態（續費 SCA 的正確狀態是 past_due、首購才是 incomplete）—
  // 從 Stripe 全量同步真實狀態，讓前端顯示對應提示
  await syncSubscriptionFromStripe(env, subscriptionId);

  console.log(`⚠️ Payment action required for subscription ${subscriptionId}`);
  // TODO: 發送 email 通知用戶完成 3D Secure 驗證
}

/**
 * 處理用戶對付款發起爭議（chargeback）
 * 記錄警告 + 標記帳號為 disputed（若可對應到用戶）+ 寫入 audit trail。
 * 全程非致命：找不到用戶時只記 log，不 throw（避免 Stripe 無謂重試）。
 */
async function handleDisputeCreated(
  env: Env,
  dispute: Stripe.Dispute
): Promise<void> {
  console.warn('⚠️ Dispute created:', dispute.id, 'amount:', dispute.amount, 'reason:', dispute.reason);

  // 嘗試從 charge 找到對應用戶
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
  if (!chargeId) {
    console.warn(`⚠️ Dispute ${dispute.id} has no associated charge - manual review required`);
    return;
  }

  const now = Date.now();

  // 從 payments 表以 charge / payment_intent 反查用戶
  const paymentIntentId =
    typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

  const payment = await env.DB.prepare(`
    SELECT user_id FROM payments
    WHERE stripe_payment_id = ? OR stripe_payment_id = ?
    LIMIT 1
  `).bind(chargeId, paymentIntentId ?? chargeId).first();

  const userId = payment?.user_id as string | undefined;

  if (!userId) {
    // 找不到用戶：非致命，只記 log 供人工追蹤（外層已存 raw event 到 stripe_events）
    console.warn(`⚠️ Dispute ${dispute.id} on charge ${chargeId} - no matching user, manual review required`);
    return;
  }

  // 冪等：deterministic id — 同一爭議只寫一次 audit row
  const disputeTxnId = `trans_dispute_${dispute.id}`;

  try {
    await env.DB.batch([
      // 標記帳號為 disputed（若 disputed_at 欄位不存在此 UPDATE 會 no-op / throw，被 catch 吞掉）
      env.DB.prepare(`
        UPDATE credits
        SET account_status = 'disputed', updated_at = ?
        WHERE user_id = ?
      `).bind(now, userId),
      // audit trail：type='penalty', amount 0（不動餘額，僅留痕跡）
      env.DB.prepare(`
        INSERT OR IGNORE INTO credit_transactions
        (id, user_id, type, amount, balance_after, description, metadata, created_at)
        VALUES (?, ?, 'penalty', 0,
          (SELECT balance FROM credits WHERE user_id = ?),
          ?, ?, ?)
      `).bind(
        disputeTxnId,
        userId,
        userId,
        `Dispute created: ${dispute.id} (${dispute.reason})`,
        JSON.stringify({
          action: 'dispute',
          dispute_id: dispute.id,
          charge_id: chargeId,
          reason: dispute.reason,
          amount: dispute.amount,
          status: dispute.status,
        }),
        now
      ),
    ]);
    console.warn(`⚠️ Dispute ${dispute.id} recorded, user ${userId} flagged - manual review required`);
  } catch (err) {
    // account_status 欄位可能不存在於 credits 表 → audit row 用單句 fallback 補寫，
    // 標記失敗不阻擋流程（非致命）
    console.warn(`Dispute flagging partial for ${dispute.id} (account flag may be unavailable):`, err);
    try {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO credit_transactions
        (id, user_id, type, amount, balance_after, description, metadata, created_at)
        VALUES (?, ?, 'penalty', 0,
          (SELECT balance FROM credits WHERE user_id = ?),
          ?, ?, ?)
      `).bind(
        disputeTxnId,
        userId,
        userId,
        `Dispute created: ${dispute.id} (${dispute.reason})`,
        JSON.stringify({
          action: 'dispute',
          dispute_id: dispute.id,
          charge_id: chargeId,
          reason: dispute.reason,
          amount: dispute.amount,
          status: dispute.status,
          flag_skipped: true,
        }),
        now
      ).run();
    } catch (auditErr) {
      console.warn(`Dispute audit row also failed for ${dispute.id}:`, auditErr);
    }
  }
  // TODO(email): wire an email/alert provider to notify admins of new disputes.
}

/**
 * 處理退款（charge.refunded），回收已授予的 credits。
 *
 * 流程：
 *  1. 以 charge id / payment_intent 反查 payments 表的原始 credits 購買
 *  2. 依退款比例（部分退款 amount_refunded / amount）換算應回收的 credits
 *  3. 從 balance 扣除（floor 於 0，不為負）
 *  4. 寫 credit_transactions（type='refund', 負數 amount, deterministic id）
 *  5. 將 payment 列 status 更新為 'refunded'
 *
 * 冪等：deterministic id `trans_refund_<charge_id>` + INSERT OR IGNORE + D1 batch。
 * 找不到對應購買記錄時退化為非致命 log（訂閱型退款無 credits 授予可回收）。
 */
async function handleChargeRefunded(
  env: Env,
  charge: Stripe.Charge
): Promise<void> {
  console.log('Processing charge.refunded:', charge.id, 'refunded:', charge.amount_refunded, '/', charge.amount);

  const chargeId = charge.id;
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

  // 以 charge id 或 payment_intent 反查原始購買記錄
  const payment = await env.DB.prepare(`
    SELECT id, user_id, credits, status FROM payments
    WHERE stripe_payment_id = ? OR stripe_payment_id = ?
    LIMIT 1
  `).bind(chargeId, paymentIntentId ?? chargeId).first();

  // 冪等：先看 refund transaction 是否已寫過
  const refundTxnId = `trans_refund_${chargeId}`;
  const alreadyRefunded = await env.DB.prepare(`
    SELECT 1 AS done FROM credit_transactions WHERE id = ?
  `).bind(refundTxnId).first();

  if (alreadyRefunded) {
    console.log(`✓ Refund for charge ${chargeId} already processed, skipping`);
    return;
  }

  const now = Date.now();

  if (!payment) {
    // 找不到 payments 記錄：可能是訂閱扣款退款（無一次性 credits 授予可回收）。
    // 非致命 — 只記 log 供人工追蹤（不 throw，避免 Stripe 無謂重試）。
    console.warn(`⚠️ Refund for charge ${chargeId}: no matching credits purchase in payments table, nothing to claw back`);
    return;
  }

  const userId = payment.user_id as string;
  const originalCredits = (payment.credits as number) || 0;

  // 部分退款：按退款比例換算回收 credits（amount 為 0 時保護除以零）
  const refundRatio =
    charge.amount > 0 ? charge.amount_refunded / charge.amount : 1;
  const creditsToClaw = Math.min(
    originalCredits,
    Math.round(originalCredits * refundRatio)
  );

  // 全額退款判定（用於 payment 列狀態）
  const isFullRefund = charge.amount_refunded >= charge.amount;
  const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';

  // 原子 batch：扣 balance（floor 0）+ 寫 refund 交易 + 更新 payment 狀態。
  // balance 使用 MAX(0, balance - claw) 確保不為負。
  // credit_transactions 用 INSERT OR IGNORE + deterministic id 保證冪等。
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE credits
      SET
        balance = MAX(0, balance - ?),
        purchased_balance = MAX(0, COALESCE(purchased_balance, 0) - ?),
        updated_at = ?
      WHERE user_id = ?
    `).bind(creditsToClaw, creditsToClaw, now, userId),
    env.DB.prepare(`
      INSERT OR IGNORE INTO credit_transactions
      (id, user_id, type, amount, balance_after, description, metadata, created_at)
      VALUES (?, ?, 'refund', ?,
        (SELECT balance FROM credits WHERE user_id = ?),
        ?, ?, ?)
    `).bind(
      refundTxnId,
      userId,
      -creditsToClaw,
      userId,
      isFullRefund
        ? `Refunded ${creditsToClaw} credits (full refund)`
        : `Refunded ${creditsToClaw} credits (partial refund)`,
      JSON.stringify({
        action: 'refund',
        charge_id: chargeId,
        payment_id: payment.id,
        payment_intent_id: paymentIntentId,
        original_credits: originalCredits,
        credits_clawed_back: creditsToClaw,
        amount_refunded: charge.amount_refunded,
        amount_original: charge.amount,
        refund_ratio: refundRatio,
        full_refund: isFullRefund,
      }),
      now
    ),
    env.DB.prepare(`
      UPDATE payments
      SET status = ?
      WHERE id = ?
    `).bind(newStatus, payment.id),
  ]);

  console.log(`✅ Refund processed for charge ${chargeId}: clawed back ${creditsToClaw} credits from user ${userId} (${newStatus})`);

  // 退款確認信（best-effort、冪等鍵 = charge id）
  await trySendLifecycleEmail(env, {
    kind: 'refund',
    key: chargeId,
    userId,
    build: (locale) => buildRefundEmail(locale, {
      amountRefunded: charge.amount_refunded,
      currency: charge.currency || 'usd',
      creditsClawedBack: creditsToClaw,
    }),
  });
}

export default router;
