// Amazon SES v2 SendEmail via SigV4 — pure Web Crypto, no AWS SDK.
//
// 為什麼手刻 SigV4：Cloudflare Worker 跑不了 boto3/aws-sdk 的 node 依賴，
// 而 SES v2 是純 HTTPS REST-JSON API，用 Web Crypto 做 HMAC-SHA256 簽章即可，
// 不必拉整包 SDK。寄信路徑走 SES（不靠 mac mini 的 Stalwart/Listmonk 在線），
// Worker 掛了也不影響、mac mini 掛了也不影響這條。
//
// 憑證：oao-dunning-ses IAM user（權限只有 ses:SendEmail 且限定 oao.to identity），
// 存在 Worker secret SES_ACCESS_KEY_ID / SES_SECRET_ACCESS_KEY。

import type { Env } from '../types';

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(data: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(data)));
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(data));
}

export interface SesEmail {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;        // 預設 env.SES_FROM；lifecycle 信會指定 billing@/no-reply@
  replyTo?: string[];   // 交易信一律 Reply-To support@oao.to（AI 收信管線接手）
}

export interface SesResult {
  ok: boolean;
  status: number;
  messageId?: string;
  error?: string;
}

/**
 * 用 SES v2 寄一封信。永不 throw（回結構化結果），呼叫端自行決定要不要記 log；
 * 這樣寄信失敗絕不會拖垮 webhook 處理 / 觸發 Stripe 重送。
 */
export async function sendEmailViaSES(env: Env, msg: SesEmail): Promise<SesResult> {
  const region = env.SES_REGION || 'us-east-1';
  const accessKey = env.SES_ACCESS_KEY_ID;
  const secretKey = env.SES_SECRET_ACCESS_KEY;
  const from = env.SES_FROM || 'OAO <billing@oao.to>';

  if (!accessKey || !secretKey) {
    return { ok: false, status: 0, error: 'SES credentials not configured' };
  }

  const host = `email.${region}.amazonaws.com`;
  const path = '/v2/email/outbound-emails';
  const service = 'ses';
  const to = Array.isArray(msg.to) ? msg.to : [msg.to];

  const body = JSON.stringify({
    FromEmailAddress: msg.from || from,
    ...(msg.replyTo && msg.replyTo.length ? { ReplyToAddresses: msg.replyTo } : {}),
    // Configuration set：接 SNS bounce/complaint 事件（feedback loop，見 routes/ses-events.ts）
    ...(env.SES_CONFIG_SET ? { ConfigurationSetName: env.SES_CONFIG_SET } : {}),
    Destination: { ToAddresses: to },
    Content: {
      Simple: {
        Subject: { Data: msg.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: msg.html, Charset: 'UTF-8' },
          Text: { Data: msg.text, Charset: 'UTF-8' },
        },
      },
    },
  });

  // amzDate: 20260715T040506Z ; dateStamp: 20260715
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256Hex(body);
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256Hex(canonicalRequest)}`;

  const kDate = await hmac(enc.encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const resp = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Date': amzDate,
        Authorization: authorization,
      },
      body,
    });

    if (resp.ok) {
      const j = (await resp.json().catch(() => ({}))) as { MessageId?: string };
      return { ok: true, status: resp.status, messageId: j.MessageId };
    }
    const errText = await resp.text().catch(() => '');
    return { ok: false, status: resp.status, error: errText.slice(0, 500) };
  } catch (err) {
    return { ok: false, status: 0, error: String(err).slice(0, 500) };
  }
}

/**
 * 催繳信（dunning）模板：付款失敗時通知客戶更新付款方式 / 重新付款。
 * payUrl 用 Stripe invoice.hosted_invoice_url（客戶可直接在 Stripe 頁面補款）。
 */
export function buildDunningEmail(opts: {
  amountDue: number; // 最小貨幣單位（cents）
  currency: string;
  payUrl?: string | null;
  attemptCount: number;
}): { subject: string; html: string; text: string } {
  const amount = (opts.amountDue / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: (opts.currency || 'usd').toUpperCase(),
  });
  const subject = `Action needed: your OAO payment didn't go through`;
  const cta = opts.payUrl
    ? `<p><a href="${opts.payUrl}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none">Update payment method</a></p>`
    : '';
  const ctaText = opts.payUrl ? `\nUpdate your payment method: ${opts.payUrl}\n` : '';
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:520px;margin:0 auto;padding:24px">
<h2 style="margin:0 0 12px">Your payment didn't go through</h2>
<p>We tried to charge <strong>${amount}</strong> for your OAO subscription but it didn't succeed${
    opts.attemptCount > 1 ? ` (attempt ${opts.attemptCount})` : ''
  }.</p>
<p>To keep your subscription active, please update your payment method or retry the payment.</p>
${cta}
<p style="color:#666;font-size:13px;margin-top:24px">If you've already fixed this, you can ignore this email. Your access continues during the grace period while we retry.</p>
<p style="color:#999;font-size:12px">— OAO Billing · oao.to</p>
</body></html>`;
  const text = `Your OAO payment didn't go through

We tried to charge ${amount} for your OAO subscription but it didn't succeed${
    opts.attemptCount > 1 ? ` (attempt ${opts.attemptCount})` : ''
  }.

To keep your subscription active, please update your payment method or retry the payment.${ctaText}

If you've already fixed this, you can ignore this email. Your access continues during the grace period while we retry.

— OAO Billing · oao.to`;
  return { subject, html, text };
}
