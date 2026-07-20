// 生命週期交易信寄送（收據/歡迎/退款/取消…）— 冪等 + 抑制清單 + 多語言。
//
// 與 dunning.ts 同一套「認領→寄→失敗釋放」冪等模式（email marker 存 credit_transactions，
// PK = trans_email_<kind>_<key>），差異：
//  - lifecycle 信 best-effort、無 cron 重試（webhook redelivery 時因 marker 已釋放會自然重試）。
//  - 全部先查 email_suppression（SES bounce/complaint feedback loop 落地，見 routes/ses-events.ts）。
//  - 語言：users.locale（使用者偏好，前端同步）→ fallback en。
// 開關：EMAIL_LIFECYCLE_ENABLED（獨立於 DUNNING_EMAIL_ENABLED，互不影響）。

import type { Env } from '../types';
import { sendEmailViaSES } from './email';
import { normalizeLocale, type EmailContent, type EmailLocale } from './email-i18n';

export const SUPPORT_REPLY_TO = 'OAO Support <support@oao.to>';
const FROM_BILLING = 'OAO Billing <billing@oao.to>';
const FROM_NOREPLY = 'OAO <no-reply@oao.to>';

export async function isSuppressed(env: Env, email: string): Promise<boolean> {
  try {
    const row = await env.DB.prepare(`SELECT 1 AS s FROM email_suppression WHERE email = ?`)
      .bind(email.toLowerCase()).first();
    return !!row;
  } catch {
    return false; // 表不存在等異常 → 不擋寄信
  }
}

export async function addSuppression(env: Env, email: string, reason: string, detail?: string): Promise<void> {
  await env.DB.prepare(`
    INSERT OR REPLACE INTO email_suppression (email, reason, detail, created_at) VALUES (?, ?, ?, ?)
  `).bind(email.toLowerCase(), reason, detail || null, Date.now()).run();
}

/** users.locale → 支援的 email locale；查不到/未設 → en */
export async function resolveUserLocale(env: Env, userId: string): Promise<EmailLocale> {
  try {
    const row = await env.DB.prepare(`SELECT locale FROM users WHERE id = ?`).bind(userId).first();
    return normalizeLocale(row?.locale as string | null);
  } catch {
    return 'en';
  }
}

export interface LifecycleParams {
  kind: string;                 // 'receipt' | 'credits_receipt' | 'welcome' | 'refund' | 'cancellation' | ...
  key: string;                  // 冪等鍵（invoice id / session id / charge id / subscription id）
  userId: string;
  build: (locale: EmailLocale) => EmailContent;
  from?: 'billing' | 'noreply';
}

/**
 * 冪等寄一封生命週期信。永不 throw（回傳是否寄出）；呼叫端全部 fire-and-forget，
 * 絕不影響 webhook 主流程（寄信失敗會釋放 marker，靠 Stripe 事件重送自然重試）。
 */
export async function trySendLifecycleEmail(env: Env, p: LifecycleParams): Promise<boolean> {
  try {
    if (env.EMAIL_LIFECYCLE_ENABLED !== 'true') return false;

    const user = await env.DB.prepare(`SELECT email, locale FROM users WHERE id = ?`)
      .bind(p.userId).first();
    const toEmail = ((user?.email as string) || '').trim();
    if (!toEmail) return false;
    if (await isSuppressed(env, toEmail)) {
      console.log(`📧 lifecycle ${p.kind} skipped — ${toEmail} is suppressed`);
      return false;
    }

    // 原子認領（同 dunning）：changes=1 才由本次負責寄
    const markerId = `trans_email_${p.kind}_${p.key}`;
    const claim = await env.DB.prepare(`
      INSERT OR IGNORE INTO credit_transactions
      (id, user_id, type, amount, balance_after, description, metadata, created_at)
      VALUES (?, ?, 'subscription', 0,
        (SELECT balance FROM credits WHERE user_id = ?),
        'Lifecycle email sent', ?, ?)
    `).bind(
      markerId, p.userId, p.userId,
      JSON.stringify({ action: 'lifecycle_email', kind: p.kind, key: p.key, to: toEmail }),
      Date.now()
    ).run();
    if ((claim.meta?.changes ?? 0) === 0) return true; // 已寄過

    const locale = normalizeLocale(user?.locale as string | null);
    const content = p.build(locale);
    const res = await sendEmailViaSES(env, {
      to: toEmail,
      subject: content.subject,
      html: content.html,
      text: content.text,
      from: p.from === 'noreply' ? FROM_NOREPLY : FROM_BILLING,
      replyTo: [SUPPORT_REPLY_TO],
    });

    if (res.ok) {
      console.log(`📧 lifecycle ${p.kind} sent to ${toEmail} (key=${p.key}, messageId=${res.messageId})`);
      return true;
    }
    await env.DB.prepare(`DELETE FROM credit_transactions WHERE id = ?`).bind(markerId).run();
    console.error(`📧 lifecycle ${p.kind} FAILED to ${toEmail} (key=${p.key}): [${res.status}] ${res.error}`);
    return false;
  } catch (err) {
    console.error(`📧 lifecycle ${p.kind} error:`, err);
    return false;
  }
}
