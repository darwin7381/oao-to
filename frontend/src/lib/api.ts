// API 客戶端

const API_BASE = import.meta.env.PROD 
  ? 'https://api.oao.to/api' 
  : 'http://localhost:8788/api';

export interface Link {
  slug: string;
  url: string;
  title: string;
  createdAt: number;
  shortUrl: string;
}

export interface Analytics {
  slug: string;
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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
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

  async updateLink(slug: string, data: { url?: string; title?: string }): Promise<Link> {
    return this.request(`/links/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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

