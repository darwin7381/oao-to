// TypeScript 型別定義

export interface Env {
  LINKS: KVNamespace;
  DB: D1Database;
  TRACKER: AnalyticsEngineDataset;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
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

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  exp?: number;
}

