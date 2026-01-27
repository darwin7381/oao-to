// API 客戶端

const API_BASE = import.meta.env.PROD
  ? 'https://api.oao.to/api'
  : 'http://localhost:8788/api';

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
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = `${API_BASE}${endpoint}`;

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Request failed' };
      }
      
      console.error('[api] Error:', {
        method: options.method || 'GET',
        url: fullUrl,
        status: response.status,
        error: errorData
      });
      
      throw new Error(errorData.error || 'Request failed');
    }

    try {
      return await response.json();
    } catch (parseError) {
      console.error('[api] Failed to parse response:', parseError);
      throw new Error('Failed to parse response');
    }
  }

  // Auth
  async getMe() {
    return this.request('/auth/me');
  }

  // Links (使用者自己的連結列表)
  async getLinks(): Promise<{ links: Link[]; total: number }> {
    // 暫時使用 test-list endpoint（直接從 KV 讀取）
    const fullUrl = import.meta.env.PROD
      ? 'https://api.oao.to/test-list'
      : 'http://localhost:8788/test-list';
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch links');
    }
    
    const data = await response.json();
    const shortUrlBase = import.meta.env.PROD ? 'https://oao.to' : 'http://localhost:8787';
    
    return {
      links: data.links.map((link: any) => ({
        ...link,
        shortUrl: `${shortUrlBase}/${link.slug}`,
      })),
      total: data.links.length
    };
  }

  async createLink(data: { url: string; slug: string; title?: string }): Promise<Link> {
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

  async createApiKey(data: { name: string; scopes: string[] }) {
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
}

export const api = new API();

