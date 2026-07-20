import Stripe from 'stripe';
import type { Env } from '../types';

/**
 * 獲取 Stripe 實例
 * 根據環境自動選擇正確的 API Key
 */
export function getStripe(env: Env): Stripe {
  const isProduction = env.ENVIRONMENT === 'production';
  
  const apiKey = isProduction 
    ? env.STRIPE_SECRET_KEY 
    : env.STRIPE_SECRET_KEY_TEST;
  
  if (!apiKey) {
    throw new Error('Stripe API key not configured');
  }
  
  return new Stripe(apiKey, {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
    // 自動重試網路錯誤；stripe-node 會替重試自動附 idempotency key，
    // 避免連線中斷造成重複建立 customer/session/coupon
    maxNetworkRetries: 2,
  });
}

/**
 * 獲取 Webhook Secret
 */
export function getWebhookSecret(env: Env): string {
  const isProduction = env.ENVIRONMENT === 'production';
  
  const secret = isProduction 
    ? env.STRIPE_WEBHOOK_SECRET 
    : env.STRIPE_WEBHOOK_SECRET_TEST;
  
  if (!secret) {
    throw new Error('Stripe webhook secret not configured');
  }
  
  return secret;
}

/**
 * 驗證 Webhook 簽名（非同步版本，適用於 Cloudflare Workers）
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  stripe: Stripe
): Promise<Stripe.Event> {
  try {
    return await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * 格式化金額（元 → 分）
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * 格式化金額（分 → 元）
 */
export function toDollars(cents: number): number {
  return cents / 100;
}

/**
 * 建立或獲取 Stripe Customer
 */
export async function getOrCreateCustomer(
  stripe: Stripe,
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // 嘗試通過 metadata 查找現有客戶
  const customers = await stripe.customers.search({
    query: `metadata['user_id']:'${userId}'`,
    limit: 1,
  });
  
  if (customers.data.length > 0) {
    return customers.data[0];
  }
  
  // 建立新客戶
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      user_id: userId,
    },
  });
}

/**
 * 計算折扣後的金額
 */
export function calculateDiscountedAmount(
  originalAmount: number,
  discountType: 'percentage' | 'fixed_amount',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return Math.round(originalAmount * (1 - discountValue / 100));
  } else {
    return Math.max(0, originalAmount - discountValue);
  }
}

/**
 * 格式化訂閱狀態
 */
export function formatSubscriptionStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: '使用中',
    past_due: '付款逾期',
    canceled: '已取消',
    unpaid: '未付款',
    trialing: '試用中',
    incomplete: '未完成',
    incomplete_expired: '已過期',
  };
  
  return statusMap[status] || status;
}

/**
 * 判斷是否為測試環境
 */
export function isTestMode(env: Env): boolean {
  return env.ENVIRONMENT !== 'production';
}

/**
 * 生成 Stripe Dashboard 連結
 */
export function getStripeDashboardUrl(
  resourceType: 'customer' | 'subscription' | 'payment' | 'invoice',
  resourceId: string,
  isTest: boolean = false
): string {
  const baseUrl = isTest 
    ? 'https://dashboard.stripe.com/test' 
    : 'https://dashboard.stripe.com';
  
  const paths: Record<string, string> = {
    customer: 'customers',
    subscription: 'subscriptions',
    payment: 'payments',
    invoice: 'invoices',
  };
  
  return `${baseUrl}/${paths[resourceType]}/${resourceId}`;
}
