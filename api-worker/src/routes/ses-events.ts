// SES bounce/complaint feedback loop（SNS HTTPS endpoint）。
//
// 鏈路：SES configuration set（wrangler var SES_CONFIG_SET）→ SNS topic → 本 endpoint。
// - SubscriptionConfirmation：驗 host 後回訪 SubscribeURL 完成訂閱（全自動、無人）。
// - Notification（SES event JSON）：Bounce(Permanent)/Complaint → 寫 email_suppression，
//   之後 dunning/lifecycle 寄信一律先查此表（見 utils/lifecycle-email.ts）。
//
// 安全：URL ?token= 共享密鑰（secret SES_EVENTS_TOKEN，SNS 訂閱 URL 內含）+
// SigningCertURL/SubscribeURL host 必須是 *.amazonaws.com + body 上限 256KB。
// （完整 SNS 簽章驗證列為後續強化；token 不洩漏前偽造者只能塞抑制項，無資料外洩面。）

import { Hono } from 'hono';
import type { Env } from '../types';
import { addSuppression } from '../utils/lifecycle-email';

const router = new Hono<{ Bindings: Env }>();

function isAwsHost(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const h = new URL(url).hostname;
    return h.endsWith('.amazonaws.com');
  } catch {
    return false;
  }
}

router.post('/ses-events', async (c) => {
  const expected = c.env.SES_EVENTS_TOKEN;
  if (!expected || c.req.query('token') !== expected) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const raw = await c.req.text();
  if (raw.length > 256 * 1024) return c.json({ error: 'too large' }, 413);

  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch {
    return c.json({ error: 'bad json' }, 400);
  }

  // 基本來源檢查：SNS 訊息一定帶 amazonaws.com 的簽章憑證 URL
  if (!isAwsHost(msg.SigningCertURL)) {
    return c.json({ error: 'bad origin' }, 403);
  }

  if (msg.Type === 'SubscriptionConfirmation') {
    if (!isAwsHost(msg.SubscribeURL)) return c.json({ error: 'bad subscribe url' }, 403);
    const resp = await fetch(msg.SubscribeURL);
    console.log(`📧 SNS subscription confirmed: ${resp.status}`);
    return c.json({ ok: true });
  }

  if (msg.Type === 'Notification') {
    let ev: any;
    try {
      ev = JSON.parse(msg.Message);
    } catch {
      return c.json({ ok: true }); // 非 SES event JSON（如測試訊息）→ 收下不處理
    }
    const kind = ev.eventType || ev.notificationType; // event publishing 用 eventType
    if (kind === 'Bounce' && ev.bounce) {
      // 只抑制永久退信；Transient（信箱滿等）交給 SES 自己重試
      if (ev.bounce.bounceType === 'Permanent') {
        for (const r of ev.bounce.bouncedRecipients || []) {
          if (r.emailAddress) {
            await addSuppression(c.env, r.emailAddress, 'bounce', ev.bounce.bounceSubType);
            console.log(`📧 suppressed (bounce): ${r.emailAddress}`);
          }
        }
      }
    } else if (kind === 'Complaint' && ev.complaint) {
      for (const r of ev.complaint.complainedRecipients || []) {
        if (r.emailAddress) {
          await addSuppression(c.env, r.emailAddress, 'complaint', ev.complaint.complaintFeedbackType);
          console.log(`📧 suppressed (complaint): ${r.emailAddress}`);
        }
      }
    }
    return c.json({ ok: true });
  }

  return c.json({ ok: true });
});

export default router;
