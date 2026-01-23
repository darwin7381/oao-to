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
  updatedAt?: number;
  expiresAt?: number;
  password?: string;
  
  // 元數據（創建時自動抓取，用戶可編輯）
  title?: string;
  description?: string;
  image?: string;
  
  // 其他設定
  tags?: string[];
  isActive?: boolean;
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

// ==========================================
// API 平台相關類型
// ==========================================

export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

export type ApiScope = 
  | 'links:read' 
  | 'links:write' 
  | 'links:update' 
  | 'links:delete' 
  | 'analytics:read'
  | 'admin:read'
  | 'admin:write';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string;  // 逗號分隔的 scopes
  isActive: boolean;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  lastUsedAt?: number;
  totalRequests: number;
  createdAt: number;
  expiresAt?: number;
}

export interface Credits {
  id: string;
  userId: string;
  balance: number;
  subscriptionBalance: number;
  purchasedBalance: number;
  totalPurchased: number;
  totalUsed: number;
  planType: PlanType;
  planRenewedAt?: number;
  monthlyQuota: number;
  monthlyUsed: number;
  monthlyResetAt?: number;
  overageLimit: number;
  overageUsed: number;
  overageRate: number;
  createdAt: number;
  updatedAt?: number;
}

export type TransactionType = 
  | 'purchase'         // 購買 credits
  | 'usage'            // 使用 credits（從 purchased_balance）
  | 'usage_quota'      // 使用月配額
  | 'usage_overage'    // 超額使用
  | 'bonus'            // 贈送
  | 'refund'           // 退款
  | 'penalty';         // 懲罰扣除

export interface CreditTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  metadata?: string;
  apiKeyId?: string;
  createdAt: number;
}

export interface ApiUsageStats {
  id: string;
  userId: string;
  apiKeyId?: string;
  date: string;  // YYYY-MM-DD
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  linkCreates: number;
  linkReads: number;
  linkUpdates: number;
  linkDeletes: number;
  analyticsRequests: number;
  creditsUsed: number;
  createdAt: number;
  updatedAt?: number;
}

export interface LinkIndex {
  slug: string;
  userId: string;
  createdVia: 'web' | 'api';
  apiKeyId?: string;
  createdAt: number;
}

// API Key 驗證結果
export interface ApiKeyValidation {
  valid: boolean;
  apiKeyId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
  scopes?: ApiScope[];
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  creditBalance?: number;
  error?: string;
}

// Credit 扣除結果
export interface CreditDeduction {
  success: boolean;
  balanceAfter: number;
  transactionId?: string;
  usedQuota?: boolean;      // 是否使用了月配額
  usedOverage?: boolean;    // 是否使用了超額
  error?: string;
}