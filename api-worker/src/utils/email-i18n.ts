// 交易信多語言模板（en / zh-TW / zh-CN / ja）。
//
// 設計：字串表（per-locale per-kind）+ 共用 HTML 外框。加語言 = 加一個 locale 區塊；
// 加信種 = 加一組 key + builder。locale 來源見 lifecycle-email.ts 的 resolveLocale()
// （users.locale 使用者偏好 → 'en' fallback），與前端 i18n 共用同一個偏好欄位。

export type EmailLocale = 'en' | 'zh-TW' | 'zh-CN' | 'ja';

export const SUPPORTED_EMAIL_LOCALES: EmailLocale[] = ['en', 'zh-TW', 'zh-CN', 'ja'];

/** 'zh_TW' / 'zh-tw' / 'zh' / 'ja-JP' 等寬鬆輸入 → 支援的 locale；認不得 → en */
export function normalizeLocale(raw: string | null | undefined): EmailLocale {
  if (!raw) return 'en';
  const v = raw.replace('_', '-').toLowerCase();
  if (v.startsWith('zh')) {
    return v.includes('cn') || v.includes('hans') || v.includes('sg') ? 'zh-CN' : 'zh-TW';
  }
  if (v.startsWith('ja')) return 'ja';
  return 'en';
}

function fmtAmount(cents: number, currency: string): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  });
}

// ---------- 共用外框 ----------

function wrap(bodyHtml: string, footer: string): string {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:520px;margin:0 auto;padding:24px">
${bodyHtml}
<p style="color:#999;font-size:12px;margin-top:24px">${footer}</p>
</body></html>`;
}

function button(url: string, label: string): string {
  return `<p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none">${label}</a></p>`;
}

// ---------- 字串表 ----------

interface Strings {
  footer: string;                       // 頁尾（含「回覆本信即可聯繫，由 AI 助理接手」）
  dashboard: string;                    // dashboard 連結文字
  receipt: { subject: string; title: string; body: (amount: string) => string; cta: string };
  creditsReceipt: { subject: (n: number) => string; title: string; body: (n: number, amount: string) => string };
  welcome: { subject: (plan: string) => string; title: string; body: (plan: string, period: string) => string; cta: string };
  refund: { subject: string; title: string; body: (amount: string, credits: number) => string };
  cancellation: { subject: string; title: string; body: (untilTs: string) => string; comeback: string };
}

const L: Record<EmailLocale, Strings> = {
  en: {
    footer: '— OAO · oao.to — Reply to this email to reach support (handled by our AI assistant, a human reviews when needed).',
    dashboard: 'Open dashboard',
    receipt: {
      subject: 'Your OAO payment receipt',
      title: 'Payment received — thank you!',
      body: (amount) => `We've received your payment of <strong>${amount}</strong> for your OAO subscription. Your plan continues uninterrupted.`,
      cta: 'View invoice',
    },
    creditsReceipt: {
      subject: (n) => `Receipt: ${n} OAO credits`,
      title: 'Credits added to your account',
      body: (n, amount) => `Your purchase of <strong>${n} credits</strong> (${amount}) is complete and the credits are already in your account.`,
    },
    welcome: {
      subject: (plan) => `Welcome to OAO ${plan}!`,
      title: 'Your plan is active',
      body: (plan, period) => `Your <strong>${plan}</strong> plan (billed ${period}) is now active. All features are unlocked and your monthly quota has been refreshed.`,
      cta: 'Go to dashboard',
    },
    refund: {
      subject: 'Your OAO refund is confirmed',
      title: 'Refund processed',
      body: (amount, credits) =>
        `We've refunded <strong>${amount}</strong> to your original payment method.` +
        (credits > 0 ? ` ${credits} credits from that purchase were removed from your balance.` : '') +
        ` Depending on your bank it may take 5–10 business days to appear.`,
    },
    cancellation: {
      subject: 'Your OAO subscription has ended',
      title: 'Subscription cancelled',
      body: (until) => `Your subscription is now cancelled${until ? ` and your access ran through ${until}` : ''}. Your account is on the Free plan — your links keep working.`,
      comeback: 'You can re-subscribe anytime from the pricing page.',
    },
  },
  'zh-TW': {
    footer: '— OAO · oao.to — 直接回覆本信即可聯繫客服（由 AI 助理處理，必要時真人跟進）。',
    dashboard: '打開儀表板',
    receipt: {
      subject: '您的 OAO 付款收據',
      title: '已收到您的付款，謝謝！',
      body: (amount) => `我們已收到您 OAO 訂閱的付款 <strong>${amount}</strong>，您的方案將不間斷地繼續。`,
      cta: '查看收據',
    },
    creditsReceipt: {
      subject: (n) => `收據：${n} 點 OAO credits`,
      title: 'Credits 已入帳',
      body: (n, amount) => `您購買的 <strong>${n} 點 credits</strong>（${amount}）已完成，點數已加入您的帳戶。`,
    },
    welcome: {
      subject: (plan) => `歡迎使用 OAO ${plan}！`,
      title: '您的方案已開通',
      body: (plan, period) => `您的 <strong>${plan}</strong> 方案（${period}計費）已生效，所有功能已解鎖、每月配額已更新。`,
      cta: '前往儀表板',
    },
    refund: {
      subject: '您的 OAO 退款已完成',
      title: '退款已處理',
      body: (amount, credits) =>
        `我們已將 <strong>${amount}</strong> 退回您原本的付款方式。` +
        (credits > 0 ? `該筆購買的 ${credits} 點 credits 已自餘額扣回。` : '') +
        `依銀行不同，款項約需 5–10 個工作天入帳。`,
    },
    cancellation: {
      subject: '您的 OAO 訂閱已結束',
      title: '訂閱已取消',
      body: (until) => `您的訂閱已取消${until ? `，權益已使用至 ${until}` : ''}。帳戶已轉為 Free 方案 — 您既有的短連結仍會正常運作。`,
      comeback: '隨時可以在定價頁重新訂閱。',
    },
  },
  'zh-CN': {
    footer: '— OAO · oao.to — 直接回复本邮件即可联系客服（由 AI 助理处理，必要时真人跟进）。',
    dashboard: '打开仪表板',
    receipt: {
      subject: '您的 OAO 付款收据',
      title: '已收到您的付款，谢谢！',
      body: (amount) => `我们已收到您 OAO 订阅的付款 <strong>${amount}</strong>，您的套餐将不间断地继续。`,
      cta: '查看收据',
    },
    creditsReceipt: {
      subject: (n) => `收据：${n} 点 OAO credits`,
      title: 'Credits 已到账',
      body: (n, amount) => `您购买的 <strong>${n} 点 credits</strong>（${amount}）已完成，点数已加入您的账户。`,
    },
    welcome: {
      subject: (plan) => `欢迎使用 OAO ${plan}！`,
      title: '您的套餐已开通',
      body: (plan, period) => `您的 <strong>${plan}</strong> 套餐（${period}计费）已生效，所有功能已解锁、每月配额已更新。`,
      cta: '前往仪表板',
    },
    refund: {
      subject: '您的 OAO 退款已完成',
      title: '退款已处理',
      body: (amount, credits) =>
        `我们已将 <strong>${amount}</strong> 退回您原本的付款方式。` +
        (credits > 0 ? `该笔购买的 ${credits} 点 credits 已从余额扣回。` : '') +
        `视银行而定，款项约需 5–10 个工作日到账。`,
    },
    cancellation: {
      subject: '您的 OAO 订阅已结束',
      title: '订阅已取消',
      body: (until) => `您的订阅已取消${until ? `，权益已使用至 ${until}` : ''}。账户已转为 Free 套餐 — 您已有的短链接仍会正常工作。`,
      comeback: '随时可以在定价页重新订阅。',
    },
  },
  ja: {
    footer: '— OAO · oao.to — このメールに返信するだけでサポートに届きます（AI アシスタントが対応し、必要に応じて担当者が確認します）。',
    dashboard: 'ダッシュボードを開く',
    receipt: {
      subject: 'OAO お支払い領収書',
      title: 'お支払いを確認しました。ありがとうございます！',
      body: (amount) => `OAO サブスクリプションのお支払い <strong>${amount}</strong> を確認しました。プランは中断なく継続されます。`,
      cta: '領収書を見る',
    },
    creditsReceipt: {
      subject: (n) => `領収書：OAO クレジット ${n} ポイント`,
      title: 'クレジットが追加されました',
      body: (n, amount) => `ご購入いただいた <strong>${n} クレジット</strong>（${amount}）の処理が完了し、アカウントに追加されました。`,
    },
    welcome: {
      subject: (plan) => `OAO ${plan} へようこそ！`,
      title: 'プランが有効になりました',
      body: (plan, period) => `<strong>${plan}</strong> プラン（${period}請求）が有効になりました。全機能が利用可能になり、月間クォータが更新されました。`,
      cta: 'ダッシュボードへ',
    },
    refund: {
      subject: 'OAO 返金が完了しました',
      title: '返金処理完了',
      body: (amount, credits) =>
        `<strong>${amount}</strong> を元のお支払い方法に返金しました。` +
        (credits > 0 ? `該当購入の ${credits} クレジットは残高から差し引かれました。` : '') +
        `銀行により、反映まで 5〜10 営業日かかる場合があります。`,
    },
    cancellation: {
      subject: 'OAO サブスクリプションが終了しました',
      title: 'サブスクリプション解約',
      body: (until) => `サブスクリプションは解約されました${until ? `（${until} までご利用いただけました）` : ''}。アカウントは Free プランになりました — 既存の短縮リンクは引き続き動作します。`,
      comeback: '料金ページからいつでも再登録できます。',
    },
  },
};

// ---------- builders ----------

export interface EmailContent { subject: string; html: string; text: string }

const DASH_URL = 'https://app.oao.to';

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

export function buildReceiptEmail(locale: EmailLocale, p: { amountPaid: number; currency: string; invoiceUrl?: string | null }): EmailContent {
  const s = L[locale];
  const amount = fmtAmount(p.amountPaid, p.currency);
  const html = wrap(
    `<h2 style="margin:0 0 12px">${s.receipt.title}</h2><p>${s.receipt.body(amount)}</p>` +
      (p.invoiceUrl ? button(p.invoiceUrl, s.receipt.cta) : ''),
    s.footer
  );
  const text = `${s.receipt.title}\n\n${strip(s.receipt.body(amount))}\n${p.invoiceUrl ? `\n${s.receipt.cta}: ${p.invoiceUrl}\n` : ''}\n${s.footer}`;
  return { subject: s.receipt.subject, html, text };
}

export function buildCreditsReceiptEmail(locale: EmailLocale, p: { credits: number; amountPaid: number; currency: string }): EmailContent {
  const s = L[locale];
  const amount = fmtAmount(p.amountPaid, p.currency);
  const html = wrap(
    `<h2 style="margin:0 0 12px">${s.creditsReceipt.title}</h2><p>${s.creditsReceipt.body(p.credits, amount)}</p>` +
      button(DASH_URL, s.dashboard),
    s.footer
  );
  const text = `${s.creditsReceipt.title}\n\n${strip(s.creditsReceipt.body(p.credits, amount))}\n\n${s.dashboard}: ${DASH_URL}\n\n${s.footer}`;
  return { subject: s.creditsReceipt.subject(p.credits), html, text };
}

export function buildWelcomeEmail(locale: EmailLocale, p: { plan: string; billingPeriod: string }): EmailContent {
  const s = L[locale];
  const html = wrap(
    `<h2 style="margin:0 0 12px">${s.welcome.title}</h2><p>${s.welcome.body(p.plan, p.billingPeriod)}</p>` +
      button(DASH_URL, s.welcome.cta),
    s.footer
  );
  const text = `${s.welcome.title}\n\n${strip(s.welcome.body(p.plan, p.billingPeriod))}\n\n${s.welcome.cta}: ${DASH_URL}\n\n${s.footer}`;
  return { subject: s.welcome.subject(p.plan), html, text };
}

export function buildRefundEmail(locale: EmailLocale, p: { amountRefunded: number; currency: string; creditsClawedBack: number }): EmailContent {
  const s = L[locale];
  const amount = fmtAmount(p.amountRefunded, p.currency);
  const html = wrap(
    `<h2 style="margin:0 0 12px">${s.refund.title}</h2><p>${s.refund.body(amount, p.creditsClawedBack)}</p>`,
    s.footer
  );
  const text = `${s.refund.title}\n\n${strip(s.refund.body(amount, p.creditsClawedBack))}\n\n${s.footer}`;
  return { subject: s.refund.subject, html, text };
}

export function buildCancellationEmail(locale: EmailLocale, p: { accessUntil?: string | null }): EmailContent {
  const s = L[locale];
  const html = wrap(
    `<h2 style="margin:0 0 12px">${s.cancellation.title}</h2><p>${s.cancellation.body(p.accessUntil || '')}</p><p>${s.cancellation.comeback}</p>` +
      button('https://oao.to/pricing', s.dashboard),
    s.footer
  );
  const text = `${s.cancellation.title}\n\n${strip(s.cancellation.body(p.accessUntil || ''))}\n${s.cancellation.comeback}\n\n${s.footer}`;
  return { subject: s.cancellation.subject, html, text };
}
