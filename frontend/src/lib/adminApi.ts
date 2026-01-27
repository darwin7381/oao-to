// Admin API Client
// 遵循 standards/FRONTEND_API_CLIENT_PATTERN.md 規範

const API_BASE = import.meta.env.PROD
  ? 'https://api.oao.to/api/admin'
  : 'http://localhost:8788/api/admin';

// ==================== Types ====================

export interface AdminLink {
  id: string;
  slug: string;
  url: string;
  user_id: string;
  user_email: string;
  title?: string;
  clicks: number;
  created_at: string;
  last_clicked_at?: string;
  is_active: boolean;
  is_flagged: boolean;
  flag_reason?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  created_at: number;
}

export interface AdminApiKey {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  name: string;
  key_prefix: string;
  scopes: string;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  is_active: number;
  last_used_at?: number;
  created_at: number;
}

export interface UserCredit {
  user_id: string;
  email: string;
  name: string;
  total_credits: number;
  subscription_credits: number;
  purchased_credits: number;
  plan: string;
  last_transaction_at?: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'add' | 'deduct' | 'purchase' | 'subscription';
  amount: number;
  reason: string;
  admin_id?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  stripe_payment_intent_id?: string;
  credits_purchased: number;
  created_at: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: number;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  assigned_to?: string;
  assigned_to_email?: string;
  created_at: number;
  updated_at?: number;
  resolved_at?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  user_role: string;
  message: string;
  created_at: number;
}

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  monthly_credits: number;
  api_calls_per_day: number;
  max_api_keys: number;
  features: string[];
  is_active: number;
  is_visible: number;
  subscriber_count?: number;
  created_at: number;
  updated_at?: number;
}

export interface PlanHistory {
  id: string;
  plan_id: string;
  changed_by: string;
  old_price_monthly?: number;
  new_price_monthly?: number;
  reason?: string;
  created_at: number;
}

export interface AdminStats {
  totalUsers: number;
  totalLinks: number;
  usersByRole: Array<{ role: string; count: number }>;
}

export interface AnalyticsData {
  userGrowth: Array<{ date: string; users: number; newUsers: number }>;
  linkGrowth: Array<{ date: string; links: number; newLinks: number }>;
  revenueGrowth: Array<{ date: string; revenue: number }>;
  topUsers: Array<{ email: string; name: string; links: number; clicks: number }>;
  topLinks: Array<{ slug: string; clicks: number }>;
  clicksByCountry: Array<{ country: string; clicks: number }>;
  planDistribution: Array<{ plan: string; count: number; value: number }>;
}

// ==================== API Client ====================

class AdminAPI {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    
    if (!token) {
      console.error('[adminApi] No token found in localStorage');
      throw new Error('未登入或 Token 已過期');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    };

    const fullUrl = `${API_BASE}${endpoint}`;

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { error: 'Request failed' };
      }
      
      console.error('[adminApi] Error:', {
        method: options.method || 'GET',
        url: fullUrl,
        status: response.status,
        error: errorData
      });
      
      const errorMessage = errorData.error || errorData.message || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch (parseError) {
      console.error('[adminApi] Failed to parse response:', parseError);
      throw new Error('Failed to parse API response');
    }
  }

  // ==================== Stats & Analytics ====================
  
  async getStats(): Promise<AdminStats> {
    return this.request<AdminStats>('/stats');
  }

  async getAnalytics(range: '7d' | '30d' | '90d' = '30d'): Promise<{ data: AnalyticsData }> {
    return this.request<{ data: AnalyticsData }>(`/analytics?range=${range}`);
  }

  // ==================== Users ====================
  
  async getUsers(): Promise<{ users: AdminUser[]; total: number }> {
    return this.request<{ users: AdminUser[]; total: number }>('/users');
  }

  async updateUserRole(userId: string, role: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  // ==================== Links ====================
  
  async getLinks(limit: number = 100): Promise<{ data: { links: AdminLink[]; total: number; limit: number } }> {
    return this.request<{ data: { links: AdminLink[]; total: number; limit: number } }>(`/links?limit=${limit}`);
  }

  async deleteLink(slug: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/links/${slug}`, {
      method: 'DELETE',
    });
  }

  async flagLink(slug: string, reason: string, disable: boolean = true): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/links/${slug}/flag`, {
      method: 'POST',
      body: JSON.stringify({ reason, disable }),
    });
  }

  // ==================== API Keys ====================
  
  async getApiKeys(): Promise<{ data: { keys: AdminApiKey[] } }> {
    return this.request<{ data: { keys: AdminApiKey[] } }>('/api-keys');
  }

  async revokeApiKey(keyId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api-keys/${keyId}/revoke`, {
      method: 'POST',
    });
  }

  // ==================== Credits ====================
  
  async getCreditUsers(): Promise<{ data: { users: UserCredit[] } }> {
    return this.request<{ data: { users: UserCredit[] } }>('/credits/users');
  }

  async getCreditTransactions(limit: number = 50): Promise<{ data: { transactions: CreditTransaction[] } }> {
    return this.request<{ data: { transactions: CreditTransaction[] } }>(`/credits/transactions?limit=${limit}`);
  }

  async adjustCredits(data: {
    user_id: string;
    type: 'add' | 'deduct';
    amount: number;
    reason: string;
  }): Promise<{ success: boolean; new_balance: number }> {
    return this.request<{ success: boolean; new_balance: number }>('/credits/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== Payments ====================
  
  async getPayments(): Promise<{ data: { payments: Payment[] } }> {
    return this.request<{ data: { payments: Payment[] } }>('/payments');
  }

  // ==================== Audit Logs ====================
  
  async getAuditLogs(params?: {
    limit?: number;
    offset?: number;
    user_id?: string;
    action?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{ data: { logs: AuditLog[] } }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const query = queryParams.toString();
    return this.request<{ data: { logs: AuditLog[] } }>(`/audit-logs${query ? `?${query}` : ''}`);
  }

  async getAuditLog(id: string): Promise<{ data: { log: AuditLog } }> {
    return this.request<{ data: { log: AuditLog } }>(`/audit-logs/${id}`);
  }

  // ==================== Support Tickets ====================
  
  async getSupportTickets(params?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
  }): Promise<{ data: { tickets: SupportTicket[] } }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.assigned_to) queryParams.append('assigned_to', params.assigned_to);

    const query = queryParams.toString();
    return this.request<{ data: { tickets: SupportTicket[] } }>(`/support/tickets${query ? `?${query}` : ''}`);
  }

  async getSupportTicket(id: string): Promise<{ data: { ticket: SupportTicket; messages: TicketMessage[] } }> {
    return this.request<{ data: { ticket: SupportTicket; messages: TicketMessage[] } }>(`/support/tickets/${id}`);
  }

  async updateSupportTicket(id: string, data: {
    status?: string;
    priority?: string;
    assigned_to?: string;
  }): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/support/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async replyToTicket(id: string, message: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/support/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // ==================== Plans ====================
  
  async getPlans(): Promise<{ data: { plans: Plan[] } }> {
    return this.request<{ data: { plans: Plan[] } }>('/plans');
  }

  async getPlan(id: string): Promise<{ data: { plan: Plan } }> {
    return this.request<{ data: { plan: Plan } }>(`/plans/${id}`);
  }

  async updatePlan(id: string, data: Partial<Plan>): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getPlanHistory(id: string): Promise<{ data: { history: PlanHistory[] } }> {
    return this.request<{ data: { history: PlanHistory[] } }>(`/plans/${id}/history`);
  }
}

export const adminApi = new AdminAPI();
