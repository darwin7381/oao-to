// API 客戶端

const API_BASE = import.meta.env.PROD
  ? 'https://api.oao.to/api'
  : 'http://localhost:8788/api';

/** 帶 HTTP status 的錯誤，讓呼叫端能區分 401（真的沒權限）vs 其他暫時性錯誤 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface Link {
  slug: string;
  url: string;
  title: string;
  createdAt: number;
  updatedAt?: number;
  shortUrl: string;
  description?: string;
  image?: string;
  tags?: string[];
  isActive?: boolean;
}

export interface SupportTicketSummary {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: string;
  category: string | null;
  created_at: number;
  updated_at: number | null;
  resolved_at: number | null;
  closed_at: number | null;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  description: string;
}

export interface SupportTicketMessage {
  id: string;
  user_role: 'user' | 'admin';
  message: string;
  created_at: number;
}

export interface Analytics {
  slug: string;
  url: string;
  title?: string;
  description?: string;
  image?: string;
  createdAt?: string;
  totalClicks: number;
  byCountry: { country: string; clicks: number }[];
  byDay: { date: string; clicks: number }[];
  byDevice: { device: string; clicks: number }[];
}

class API {
  private async request(endpoint: string, options: RequestInit & { skipAuthRedirect?: boolean } = {}) {
    const { skipAuthRedirect, ...fetchOptions } = options;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    const fullUrl = `${API_BASE}${endpoint}`;

    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
      // 認證改為純 cookie：httpOnly cookie（token）由後端 Set-Cookie 帶入，
      // 每次請求靠 credentials:'include' 自動送出。不再讀 localStorage token
      // 也不再送 Authorization: Bearer header（強制舊 session 重新登入）。
      credentials: 'include',
    });

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Request failed' };
      }

      console.error('[api] Error:', {
        method: fetchOptions.method || 'GET',
        url: fullUrl,
        status: response.status,
        error: errorData
      });

      // 401 = token 失效：清除 token，並（除非呼叫端自行處理）導回登入
      if (response.status === 401) {
        localStorage.removeItem('token');
        if (!skipAuthRedirect && window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }

      throw new ApiError(errorData.error || 'Request failed', response.status);
    }

    try {
      return await response.json();
    } catch (parseError) {
      console.error('[api] Failed to parse response:', parseError);
      throw new Error('Failed to parse response');
    }
  }

  // Auth — skipAuthRedirect：由 AuthContext 自行處理 401（不硬導向，避免初次載入誤跳）
  async getMe() {
    return this.request('/auth/me', { skipAuthRedirect: true });
  }

  // 語言偏好（前端 i18n 與 email 共用，存 users.locale）
  async getLocale(): Promise<{ locale: string | null }> {
    return this.request('/account/locale', { skipAuthRedirect: true });
  }

  async updateLocale(locale: string): Promise<{ locale: string }> {
    return this.request('/account/locale', {
      method: 'PUT',
      body: JSON.stringify({ locale }),
    });
  }

  // Links (使用者自己的連結列表)
  async getLinks(): Promise<{ links: Link[]; total: number }> {
    const data = await this.request('/links');
    return {
      links: data.links || [],
      total: data.total || 0
    };
  }

  async createLink(data: { url: string; slug?: string; title?: string }): Promise<Link> {
    return this.request('/links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLink(slug: string, data: {
    url?: string;
    title?: string;
    description?: string;
    image?: string;
    tags?: string[];
    isActive?: boolean;
  }): Promise<{ success: boolean; data: Link }> {
    return this.request(`/links/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async refetchMetadata(slug: string): Promise<{ success: boolean; data: Link; metadata: any }> {
    return this.request(`/links/${slug}/refetch`, {
      method: 'POST',
    });
  }

  async deleteLink(slug: string): Promise<void> {
    return this.request(`/links/${slug}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getAnalytics(slug: string): Promise<Analytics> {
    return this.request(`/analytics/${slug}`);
  }

  async getSummary() {
    return this.request('/analytics/summary/all');
  }

  // Credits
  async getCredits() {
    return this.request('/account/credits');
  }

  async getTransactions(limit: number = 20) {
    return this.request(`/account/transactions?limit=${limit}`);
  }

  // API Keys
  async getApiKeys() {
    return this.request('/account/keys');
  }

  async createApiKey(data: { name: string; scopes: string[]; environment?: 'live' | 'test' }) {
    return this.request('/account/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateApiKey(id: string, data: { name?: string; is_active?: boolean }) {
    return this.request(`/account/keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteApiKey(id: string) {
    return this.request(`/account/keys/${id}`, {
      method: 'DELETE',
    });
  }

  // Stripe Checkout
  async createCheckoutSession(data: {
    planType: string;
    billingPeriod: 'monthly' | 'yearly';
    promoCode?: string;
  }): Promise<{ success: boolean; sessionUrl: string; sessionId: string }> {
    return this.request('/checkout/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createPortalSession(): Promise<{ success: boolean; portalUrl: string }> {
    return this.request('/checkout/portal', {
      method: 'POST',
    });
  }

  async createCreditsCheckout(creditAmount: number): Promise<{
    success: boolean;
    sessionUrl: string;
    sessionId: string;
  }> {
    return this.request('/checkout/credits', {
      method: 'POST',
      body: JSON.stringify({ creditAmount }),
    });
  }

  async getCheckoutSession(sessionId: string) {
    return this.request(`/checkout/session/${sessionId}`);
  }

  // Promo Codes
  async validatePromoCode(data: {
    code: string;
    planType?: string;
    billingPeriod?: string;
  }): Promise<{
    valid: boolean;
    promoCode?: {
      id: string;
      code: string;
      discountType: string;
      discountValue: number;
      bonusCredits: number;
    };
    error?: string;
  }> {
    return this.request('/promo-codes/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Subscription Status
  async getSubscriptionStatus(): Promise<{
    success: boolean;
    subscription: {
      current: {
        plan: string;
        planDisplayName: string;
        billingPeriod: 'monthly' | 'yearly';
        price: number;
        priceFormatted: string;
        periodStart: number | null;
        periodEnd: number | null;
        periodEndFormatted: string | null;
        status: string;
        features: {
          monthlyQuota: number;
          analytics: string;
          support: string;
        };
      };
      scheduledChange?: {
        type: 'downgrade' | 'upgrade' | 'cancel' | 'period_change';
        newPlan?: string;
        newPlanDisplayName?: string;
        newBillingPeriod?: 'monthly' | 'yearly';
        newPrice?: number;
        newPriceFormatted?: string;
        effectiveDate: number;
        effectiveDateFormatted: string;
        daysUntilChange: number;
        canRevert: boolean;
        changes?: {
          monthlyQuota?: { from: number; to: number };
          analytics?: { from: string; to: string };
          support?: { from: string; to: string };
        };
      };
      cancelAtPeriodEnd: boolean;
      stripeSubscriptionId: string | null;
      stripeCustomerId: string | null;
    };
  }> {
    // skipAuthRedirect：/pricing 是公開頁也會呼叫，未登入的 401 交給
    // useSubscriptionStatus 當一般錯誤處理，不能把訪客硬導回首頁。
    return this.request('/subscription/status', { skipAuthRedirect: true });
  }

  async cancelScheduledChange(reason?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request('/subscription/cancel-scheduled-change', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Admin: Promo Codes
  // Support Tickets（用戶端：只能操作自己的工單）
  async createSupportTicket(data: { subject: string; message: string; category?: string }): Promise<{
    id: string; title: string; status: string; category: string; created_at: number;
  }> {
    const res = await this.request('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async getSupportTickets(): Promise<{ tickets: SupportTicketSummary[]; total: number }> {
    const res = await this.request('/support/tickets');
    return { tickets: res.data?.tickets || [], total: res.data?.total || 0 };
  }

  async getSupportTicket(id: string): Promise<{ ticket: SupportTicketDetail; messages: SupportTicketMessage[] }> {
    const res = await this.request(`/support/tickets/${id}`);
    return res.data;
  }

  async replySupportTicket(id: string, message: string): Promise<{ message_id: string; status: string }> {
    const res = await this.request(`/support/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return res.data;
  }

  async getPromoCodes(): Promise<{ promoCodes: any[] }> {
    return this.request('/promo-codes');
  }

  async createPromoCode(data: {
    code: string;
    discountType: string;
    discountValue: number;
    duration?: 'once' | 'repeating' | 'forever';
    durationMonths?: number;
    appliesToPlans?: string[];
    bonusCredits?: number;
    maxUses?: number;
    perUserLimit?: number;
    validFrom?: number;
    validUntil?: number;
  }): Promise<{ success: boolean }> {
    return this.request('/promo-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async togglePromoCode(id: string, isActive: boolean): Promise<{ success: boolean }> {
    return this.request(`/promo-codes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }
}

export const api = new API();

