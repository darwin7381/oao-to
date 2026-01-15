// TypeScript 型別定義

export interface Env {
  LINKS: KVNamespace;
  DB: D1Database;
  TRACKER: AnalyticsEngineDataset;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  JWT_SECRET: string;
  API_URL: string;
  FRONTEND_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SUPERADMIN_EMAILS?: string;  // 可選，超級管理員 emails（逗號分隔）
}

export interface LinkData {
  slug: string;
  url: string;
  userId: string;
  createdAt: number;
  expiresAt?: number;
  password?: string;
  title?: string;
}

export type UserRole = 'user' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  createdAt: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp?: number;
}

