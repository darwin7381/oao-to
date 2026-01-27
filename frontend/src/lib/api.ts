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

  // Links
  async getLinks(): Promise<{ links: Link[]; total: number }> {
    return this.request('/links');
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
}

export const api = new API();

