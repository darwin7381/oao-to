// 催繳信（dunning）寄送 + 重試。
//
// 為什麼獨立一個模組：dunning email 的「送達」與 Stripe「事件處理」是兩件事。
// webhook 收到 invoice.payment_failed → 設 past_due（billing state，處理完就 mark processed）。
// 但 email 是 side-effect：同一事件被 mark processed 後，Stripe 重送**同一事件**會被 webhook
// 的冪等 guard（stripe_events.processed=1）擋掉、handler 不再跑 → 靠「同事件重送」重試 email 行不通。
//
// 解法：把 email 送達與事件處理**解耦**。
//  - webhook：即時試寄一次（fast path，happy path 客戶馬上收到）。
//  - **每小時 cron**：掃出「仍 past_due 且該次 attempt 尚未成功寄出」的 → 重試。
//    這條重試路徑不依賴 Stripe 重送同一事件 → 修好「失敗即被 mark processed、永不重試」。
//
// 冪等：email marker `trans_dunning_email_<invoice>_<attempt>` 只在**寄成功**時留存；
// 認領（INSERT OR IGNORE，changes=1 才寄）防並發重複寄；寄失敗 DELETE 釋放 → 下輪重試。

import type { Env } from '../types';
import { sendEmailViaSES, buildDunningEmail } from './email';
import { isSuppressed, SUPPORT_REPLY_TO } from './lifecycle-email';

// audit row id 前綴 'trans_dunning_' 長度（用於 SQL 反推對應 email marker id）
const DUNNING_AUDIT_PREFIX = 'trans_dunning_';

export interface DunningParams {
  userId: string;
  toEmail: string;
  invoiceId: string;
  attemptCount: number;
  amountDue: number;
  currency: string;
  payUrl?: string | null;
}

/**
 * 認領→寄→失敗釋放。回傳 true = 已寄出（本次成功，或先前已寄過）；false = 這次沒寄成（已釋放待重試）。
 * 永不 throw（best-effort）。webhook fast-path 與 cron 重試共用這支。
 */
export async function trySendDunningEmail(env: Env, p: DunningParams): Promise<boolean> {
  if (env.DUNNING_EMAIL_ENABLED !== 'true') return false;
  if (!p.toEmail || !p.userId) return false;
  if (await isSuppressed(env, p.toEmail)) return true; // 已退信/客訴 → 視為處理完，不再寄也不再重試

  const markerId = `trans_dunning_email_${p.invoiceId}_${p.attemptCount}`;

  // 原子認領：changes=1 才由本次負責寄；changes=0 = 已寄過/別人正在寄 → 視為已處理，不重複寄
  const claim = await env.DB.prepare(`
    INSERT OR IGNORE INTO credit_transactions
    (id, user_id, type, amount, balance_after, description, metadata, created_at)
    VALUES (?, ?, 'subscription', 0,
      (SELECT balance FROM credits WHERE user_id = ?),
      'Dunning email sent', ?, ?)
  `).bind(
    markerId,
    p.userId,
    p.userId,
    JSON.stringify({
      action: 'dunning_email',
      invoice_id: p.invoiceId,
      attempt_count: p.attemptCount,
      to: p.toEmail,
    }),
    Date.now()
  ).run();

  if ((claim.meta?.changes ?? 0) === 0) return true; // 已寄過 → 不重複

  const tpl = buildDunningEmail({
    amountDue: p.amountDue,
    currency: p.currency,
    payUrl: p.payUrl,
    attemptCount: p.attemptCount,
  });
  const res = await sendEmailViaSES(env, {
    to: p.toEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    replyTo: [SUPPORT_REPLY_TO],
  });

  if (res.ok) {
    console.log(
      `📧 dunning email sent to ${p.toEmail} (invoice ${p.invoiceId} attempt ${p.attemptCount}, messageId=${res.messageId})`
    );
    return true;
  }

  // 寄失敗 → 釋放認領 → 下一輪 cron 會重試（不 throw、不影響 webhook 回應）
  await env.DB.prepare(`DELETE FROM credit_transactions WHERE id = ?`).bind(markerId).run();
  console.error(
    `📧 dunning email FAILED to ${p.toEmail} (invoice ${p.invoiceId} attempt ${p.attemptCount}): [${res.status}] ${res.error} — released for cron retry`
  );
  return false;
}

/**
 * Cron 掃描重試：找出「訂閱仍 past_due、有 dunning audit row、但該 attempt 尚未成功寄出 email」的，重試。
 * - 只看近 3 天的 audit row（Stripe 重試週期內；避免無限重試遠古紀錄）。
 * - email marker 用 audit id 反推（audit=`trans_dunning_<key>`、marker=`trans_dunning_email_<key>`）。
 * - 逐筆走 trySendDunningEmail（自帶認領/釋放冪等）。永不 throw。
 */
export async function retryPendingDunningEmails(env: Env): Promise<void> {
  if (env.DUNNING_EMAIL_ENABLED !== 'true') return;

  const now = Date.now();
  const WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 只重試近 3 天未寄成的
  const prefixLen = DUNNING_AUDIT_PREFIX.length; // 14

  const pending = await env.DB.prepare(`
    SELECT a.id AS audit_id, a.user_id AS user_id, a.metadata AS metadata, u.email AS email
    FROM credit_transactions a
    JOIN credits c ON c.user_id = a.user_id
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.description = 'Payment failed - dunning'
      AND a.created_at > ?
      AND c.subscription_status = 'past_due'
      AND NOT EXISTS (
        SELECT 1 FROM credit_transactions m
        WHERE m.id = 'trans_dunning_email_' || substr(a.id, ?)
      )
    ORDER BY a.created_at DESC
    LIMIT 50
  `).bind(now - WINDOW_MS, prefixLen + 1).all();

  const rows = (pending.results ?? []) as Array<{
    audit_id: string;
    user_id: string;
    metadata: string | null;
    email: string | null;
  }>;
  if (rows.length === 0) return;

  console.log(`[Cron] retrying ${rows.length} pending dunning email(s)`);
  for (const row of rows) {
    try {
      const meta = JSON.parse(row.metadata || '{}');
      const email = (row.email || '').trim();
      if (!email || !meta.invoice_id) continue;
      await trySendDunningEmail(env, {
        userId: row.user_id,
        toEmail: email,
        invoiceId: meta.invoice_id,
        attemptCount: meta.attempt_count ?? 0,
        amountDue: meta.amount_due ?? 0,
        currency: meta.currency ?? 'usd',
        payUrl: meta.hosted_invoice_url ?? null,
      });
    } catch (err) {
      console.error('[Cron] dunning retry error for', row.audit_id, err);
    }
  }
}
