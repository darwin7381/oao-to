import Stripe from 'stripe';
import type { Env } from '../types';
import { getStripe } from './stripe';

/**
 * Stripe 訂閱狀態同步層
 *
 * 設計原則：Stripe 是唯一 truth source。任何 subscription / schedule / invoice
 * 事件都只是「觸發器」——收到後從 Stripe API 重新拉完整訂閱（expand schedule），
 * 全量推導並覆寫本地狀態，而不是解讀單一事件的差異。
 * 這消除 webhook 亂序、事件遺失、排程降級永不套用等整類問題。
 */

const PLAN_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, enterprise: 3 };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface PriceMapping {
  plan_type: string;
  billing_period: string;
  display_price: number;
}

async function lookupPriceMapping(env: Env, priceId: string | undefined | null): Promise<PriceMapping | null> {
  if (!priceId) return null;
  const row = await env.DB.prepare(`
    SELECT plan_type, billing_period, display_price
    FROM stripe_price_mapping
    WHERE stripe_price_id = ?
  `).bind(priceId).first();
  return (row as unknown as PriceMapping) || null;
}

/**
 * 將訂閱對應的用戶降級到 Free，並完整重置付費期狀態。
 * Stripe 在 period end 才發 subscription.deleted，所以呼叫時付費期已結束。
 * 冪等：deterministic transaction id + INSERT OR IGNORE，重複呼叫無副作用。
 */
export async function downgradeSubscriptionToFree(
  env: Env,
  subscriptionId: string,
  reason: string
): Promise<void> {
  const credits = await env.DB.prepare(`
    SELECT user_id, plan_type FROM credits WHERE stripe_subscription_id = ?
  `).bind(subscriptionId).first();

  if (!credits) {
    console.warn(`No credits found for subscription ${subscriptionId}`);
    return;
  }

  const userId = credits.user_id as string;
  const previousPlan = credits.plan_type as string;
  const now = Date.now();

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE credits
      SET
        plan_type = 'free',
        billing_period = 'monthly',
        monthly_used = 0,
        overage_used = 0,
        monthly_reset_at = ?,
        subscription_status = 'canceled',
        subscription_current_period_start = NULL,
        subscription_current_period_end = NULL,
        cancel_at_period_end = 0,
        scheduled_plan_change = NULL,
        last_plan_change_type = 'cancel',
        last_plan_change_at = ?,
        updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(now + THIRTY_DAYS_MS, now, now, subscriptionId),
    env.DB.prepare(`
      INSERT OR IGNORE INTO credit_transactions
      (id, user_id, type, amount, balance_after, description, metadata, created_at)
      VALUES (?, ?, 'subscription', 0,
        (SELECT balance FROM credits WHERE user_id = ?),
        ?, ?, ?)
    `).bind(
      `trans_cancel_${subscriptionId}`,
      userId,
      userId,
      `Subscription Canceled (was ${previousPlan})`,
      JSON.stringify({ previousPlan, reason, canceledAt: now }),
      now
    ),
  ]);

  console.log(`✅ Subscription ${subscriptionId} canceled (${reason}), user ${userId} downgraded to Free`);
}

/**
 * 從 Stripe 全量同步一筆訂閱的本地狀態（冪等）。
 *
 * - plan_type / billing_period 一律以訂閱上「現在生效」的 price 為準
 * - scheduled_plan_change 一律從 schedule 的未來 phase 或 cancel_at_period_end 推導
 * - 降級生效時把 monthly_used cap 到新方案配額，避免顯示負數
 */
export async function syncSubscriptionFromStripe(env: Env, subscriptionId: string): Promise<void> {
  const credits = await env.DB.prepare(`
    SELECT user_id, plan_type, billing_period FROM credits WHERE stripe_subscription_id = ?
  `).bind(subscriptionId).first();

  if (!credits) {
    console.warn(`No credits found for subscription ${subscriptionId}`);
    return;
  }

  const stripe = getStripe(env);
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['schedule'] });
  } catch (err) {
    if ((err as Stripe.errors.StripeError)?.code === 'resource_missing') {
      await downgradeSubscriptionToFree(env, subscriptionId, 'subscription_missing');
      return;
    }
    throw err;
  }

  // 終態一律降級（incomplete_expired = 首次付款一直沒成功、Stripe 已放棄）
  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    await downgradeSubscriptionToFree(env, subscriptionId, `subscription_${subscription.status}`);
    return;
  }

  // 1. 現在生效的方案 = 訂閱上的 price mapping。
  // 找不到 mapping 時 fail closed（丟錯 → webhook 500 → Stripe 重試、事件留 error 記錄），
  // 不 fallback 舊方案 — 否則 Portal 切到未映射價格時會付一個價、享另一個方案
  const currentPriceId = subscription.items.data[0]?.price?.id;
  const currentMapping = await lookupPriceMapping(env, currentPriceId);
  if (!currentMapping) {
    throw new Error(`No price mapping for ${currentPriceId} on subscription ${subscriptionId} — manual review required`);
  }
  const newPlanType = currentMapping.plan_type;
  const newBillingPeriod = currentMapping.billing_period;
  const currentPrice = currentMapping.display_price;

  // 2. 待生效變更：schedule 的未來 phase 優先，其次 cancel_at_period_end
  let scheduledChange: Record<string, unknown> | null = null;
  const schedule =
    subscription.schedule && typeof subscription.schedule !== 'string' ? subscription.schedule : null;

  if (schedule && (schedule.status === 'active' || schedule.status === 'not_started')) {
    const nowSec = Math.floor(Date.now() / 1000);
    const futurePhase = (schedule.phases || []).find((p) => p.start_date > nowSec);
    if (futurePhase) {
      const rawPrice = futurePhase.items?.[0]?.price;
      const futureMapping = await lookupPriceMapping(
        env,
        typeof rawPrice === 'string' ? rawPrice : rawPrice?.id
      );
      if (
        futureMapping &&
        (futureMapping.plan_type !== newPlanType || futureMapping.billing_period !== newBillingPeriod)
      ) {
        const type =
          futureMapping.plan_type !== newPlanType
            ? PLAN_ORDER[futureMapping.plan_type] < PLAN_ORDER[newPlanType]
              ? 'downgrade'
              : 'upgrade'
            : 'period_change';
        scheduledChange = {
          type,
          fromPlan: newPlanType,
          toPlan: futureMapping.plan_type,
          fromPeriod: newBillingPeriod,
          toPeriod: futureMapping.billing_period,
          fromPrice: currentPrice,
          toPrice: futureMapping.display_price,
          effectiveDate: futurePhase.start_date * 1000,
          scheduledAt: Date.now(),
          canRevert: true,
          reason: 'user_requested',
          stripeScheduleId: schedule.id,
        };
      }
    }
  }

  if (!scheduledChange && subscription.cancel_at_period_end) {
    scheduledChange = {
      type: 'cancel',
      fromPlan: newPlanType,
      toPlan: 'free',
      fromPeriod: newBillingPeriod,
      toPeriod: null,
      fromPrice: currentPrice,
      toPrice: 0,
      effectiveDate: subscription.current_period_end * 1000,
      scheduledAt: Date.now(),
      canRevert: true,
      reason: 'user_requested',
    };
  }

  // 3. 全量覆寫本地狀態（單一 batch，原子）
  const oldPlanType = credits.plan_type as string;
  const planChanged = newPlanType !== oldPlanType;
  const changeType = planChanged
    ? PLAN_ORDER[newPlanType] > PLAN_ORDER[oldPlanType]
      ? 'upgrade'
      : 'downgrade'
    : null;
  const now = Date.now();

  const setClauses = [
    'plan_type = ?',
    'billing_period = ?',
    'subscription_status = ?',
    'subscription_current_period_start = ?',
    'subscription_current_period_end = ?',
    'cancel_at_period_end = ?',
    'scheduled_plan_change = ?',
  ];
  const bindings: unknown[] = [
    newPlanType,
    newBillingPeriod,
    subscription.status,
    subscription.current_period_start * 1000,
    subscription.current_period_end * 1000,
    subscription.cancel_at_period_end ? 1 : 0,
    scheduledChange ? JSON.stringify(scheduledChange) : null,
  ];

  if (planChanged) {
    setClauses.push('last_plan_change_type = ?', 'last_plan_change_at = ?');
    bindings.push(changeType, now);
  }
  if (changeType === 'downgrade') {
    // 降級生效：用量 cap 到新方案配額，避免剩餘量顯示負數
    setClauses.push(
      'monthly_used = MIN(monthly_used, COALESCE((SELECT monthly_credits FROM plans WHERE name = ?), 100))'
    );
    bindings.push(newPlanType);
  }
  setClauses.push('updated_at = ?');
  bindings.push(now);
  bindings.push(subscriptionId);

  const statements = [
    env.DB.prepare(`UPDATE credits SET ${setClauses.join(', ')} WHERE stripe_subscription_id = ?`).bind(
      ...bindings
    ),
  ];

  if (planChanged) {
    // deterministic id：同一次方案切換（訂閱+新方案+週期起點）只記一筆
    statements.push(
      env.DB.prepare(`
        INSERT OR IGNORE INTO credit_transactions
        (id, user_id, type, amount, balance_after, description, metadata, created_at)
        VALUES (?, ?, 'subscription', 0,
          (SELECT balance FROM credits WHERE user_id = ?),
          ?, ?, ?)
      `).bind(
        `trans_plan_${subscriptionId}_${newPlanType}_${subscription.current_period_start}`,
        credits.user_id,
        credits.user_id,
        `Plan ${changeType}: ${oldPlanType} → ${newPlanType}`,
        JSON.stringify({ action: changeType, from_plan: oldPlanType, to_plan: newPlanType, billing_period: newBillingPeriod }),
        now
      )
    );
  }

  await env.DB.batch(statements);

  console.log(
    `✅ Synced subscription ${subscriptionId}: plan=${newPlanType}(${newBillingPeriod}) status=${subscription.status}` +
      (scheduledChange ? ` scheduled=${scheduledChange.type}→${scheduledChange.toPlan}` : '') +
      (planChanged ? ` [${changeType} from ${oldPlanType}]` : '')
  );
}
