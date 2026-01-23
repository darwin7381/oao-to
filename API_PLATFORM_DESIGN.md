# OAO.TO API 平台設計規格

**版本**：V1.0  
**更新**：2026-01-23  
**類型**：正規新時代 API 產品設計

---

## 📋 目錄

1. [系統概述](#系統概述)
2. [資料庫設計](#資料庫設計)
3. [API Key 管理](#api-key-管理)
4. [Credit 計費系統](#credit-計費系統)
5. [API 端點設計](#api-端點設計)
6. [管理員功能](#管理員功能)
7. [安全性設計](#安全性設計)
8. [監控與限流](#監控與限流)
9. [定價方案](#定價方案)

---

## 🎯 系統概述

### 產品定位

OAO.TO API Platform 提供**企業級短網址 API 服務**，讓開發者能夠：

- 🔗 程式化創建和管理短網址
- 📊 即時獲取分析數據
- 🎨 自訂 OG 預覽卡片
- 🔐 安全的 API Key 驗證
- 💳 靈活的 Credit 計費系統

### 技術架構

```
┌─────────────┐
│   客戶端     │
│ (使用 API)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   API Gateway (Cloudflare)      │
│   - Rate Limiting               │
│   - API Key 驗證                │
│   - Request/Response Logging    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│   Worker (Hono)                 │
│   - 路由處理                     │
│   - Credit 扣除                 │
│   - 業務邏輯                     │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────┬──────────────────┐
│   D1 DB      │   KV Storage     │
│   - 用戶     │   - 短網址       │
│   - API Keys │   - Cache        │
│   - Credits  │                  │
└──────────────┴──────────────────┘
```

---

## 🗄️ 資料庫設計

### 1. API Keys 表

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL,                  -- 關聯用戶
  name TEXT NOT NULL,                     -- Key 名稱 (如 "Production API")
  key_prefix TEXT NOT NULL,               -- 前綴 (如 "oao_live_")
  key_hash TEXT NOT NULL,                 -- SHA-256 雜湊
  scopes TEXT NOT NULL DEFAULT 'links:read,links:write',  -- 權限範圍
  
  -- 狀態
  is_active INTEGER NOT NULL DEFAULT 1,   -- 是否啟用
  
  -- 限流
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,
  
  -- 統計
  last_used_at INTEGER,                   -- 最後使用時間
  total_requests INTEGER DEFAULT 0,       -- 總請求次數
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  expires_at INTEGER,                     -- 過期時間（可選）
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE UNIQUE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
```

### 2. Credits 表

```sql
CREATE TABLE credits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- Credit 餘額
  balance INTEGER NOT NULL DEFAULT 0,      -- 當前餘額
  total_purchased INTEGER DEFAULT 0,       -- 累計購買
  total_used INTEGER DEFAULT 0,            -- 累計使用
  
  -- 訂閱方案
  plan_type TEXT DEFAULT 'free',           -- free, starter, pro, enterprise
  plan_renewed_at INTEGER,                 -- 方案續訂時間
  monthly_quota INTEGER DEFAULT 100,       -- 月配額
  monthly_used INTEGER DEFAULT 0,          -- 本月已用
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_credits_plan_type ON credits(plan_type);
```

### 3. Credit 交易記錄表

```sql
CREATE TABLE credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- 交易類型
  type TEXT NOT NULL,                      -- 'purchase', 'usage', 'refund', 'bonus'
  amount INTEGER NOT NULL,                 -- 正數為增加，負數為消耗
  balance_after INTEGER NOT NULL,          -- 交易後餘額
  
  -- 關聯資源
  resource_type TEXT,                      -- 'link', 'analytics', 'metadata'
  resource_id TEXT,                        -- 關聯的短網址 slug 等
  
  -- 詳細信息
  description TEXT,                        -- 描述
  metadata TEXT,                           -- JSON 格式的額外數據
  
  -- API Key（如果是 API 調用）
  api_key_id TEXT,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_api_key_id ON credit_transactions(api_key_id);
```

### 4. API 使用統計表

```sql
CREATE TABLE api_usage_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  api_key_id TEXT,
  
  -- 時間維度
  date TEXT NOT NULL,                      -- YYYY-MM-DD
  hour INTEGER,                            -- 0-23 (可選，用於細粒度統計)
  
  -- 統計數據
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  
  -- 按端點統計
  link_creates INTEGER DEFAULT 0,
  link_reads INTEGER DEFAULT 0,
  link_updates INTEGER DEFAULT 0,
  link_deletes INTEGER DEFAULT 0,
  analytics_requests INTEGER DEFAULT 0,
  
  -- Credit 消耗
  credits_used INTEGER DEFAULT 0,
  
  -- 時間戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

CREATE INDEX idx_api_usage_stats_user_date ON api_usage_stats(user_id, date);
CREATE INDEX idx_api_usage_stats_api_key_date ON api_usage_stats(api_key_id, date);
CREATE INDEX idx_api_usage_stats_date ON api_usage_stats(date);
```

### 5. 更新 links 表（KV 保持不變，D1 增加索引表）

```sql
-- 用於 API 查詢的索引表（可選，視需求）
CREATE TABLE link_index (
  slug TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_via TEXT DEFAULT 'web',          -- 'web', 'api'
  api_key_id TEXT,
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

CREATE INDEX idx_link_index_user_id ON link_index(user_id);
CREATE INDEX idx_link_index_api_key_id ON link_index(api_key_id);
CREATE INDEX idx_link_index_created_at ON link_index(created_at);
```

---

## 🔑 API Key 管理

### Key 格式設計

```
格式：{prefix}_{environment}_{random}

範例：
- oao_live_1a2b3c4d5e6f7g8h9i0j  (生產環境)
- oao_test_9i8h7g6f5e4d3c2b1a0j  (測試環境)

結構：
- prefix: oao (品牌標識)
- environment: live/test (環境區分)
- random: 20 字符隨機字符串 (實際密鑰)
```

### Key 生成流程

```typescript
// utils/api-key-generator.ts

import { randomBytes } from 'crypto';

interface ApiKeyResult {
  id: string;           // UUID
  key: string;          // 完整的 API Key
  keyPrefix: string;    // 前綴
  keyHash: string;      // SHA-256 雜湊
}

export async function generateApiKey(
  env: 'live' | 'test' = 'live'
): Promise<ApiKeyResult> {
  // 生成 UUID
  const id = crypto.randomUUID();
  
  // 生成 20 字符隨機字符串
  const randomPart = Array.from(
    randomBytes(15),
    byte => byte.toString(36)
  ).join('').substring(0, 20);
  
  // 組合完整 Key
  const prefix = `oao_${env}_`;
  const key = prefix + randomPart;
  
  // 生成 SHA-256 雜湊
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return {
    id,
    key,           // ⚠️ 只在創建時返回一次！
    keyPrefix: prefix,
    keyHash,
  };
}
```

### Key 驗證流程

```typescript
// middleware/api-key.ts

import { Context, Next } from 'hono';
import { Env, JWTPayload } from '../types';

export async function verifyApiKey(c: Context<{ Bindings: Env }>, next: Next) {
  // 1. 提取 API Key
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing API key' }, 401);
  }
  
  const apiKey = authHeader.substring(7); // 移除 "Bearer "
  
  // 2. 驗證格式
  if (!apiKey.startsWith('oao_')) {
    return c.json({ error: 'Invalid API key format' }, 401);
  }
  
  // 3. 計算雜湊
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // 4. 查詢資料庫
  const result = await c.env.DB.prepare(`
    SELECT 
      ak.id,
      ak.user_id,
      ak.name,
      ak.scopes,
      ak.is_active,
      ak.rate_limit_per_minute,
      ak.rate_limit_per_day,
      ak.expires_at,
      u.email,
      u.role,
      cr.balance as credit_balance
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    LEFT JOIN credits cr ON u.id = cr.user_id
    WHERE ak.key_hash = ? AND ak.is_active = 1
  `).bind(keyHash).first();
  
  if (!result) {
    return c.json({ error: 'Invalid or inactive API key' }, 401);
  }
  
  // 5. 檢查過期
  if (result.expires_at && Date.now() > result.expires_at) {
    return c.json({ error: 'API key expired' }, 401);
  }
  
  // 6. 設置上下文
  c.set('apiKeyId', result.id);
  c.set('userId', result.user_id);
  c.set('userEmail', result.email);
  c.set('userRole', result.role);
  c.set('apiKeyScopes', (result.scopes as string).split(','));
  c.set('creditBalance', result.credit_balance || 0);
  
  // 7. 背景更新最後使用時間
  c.executionCtx.waitUntil(
    c.env.DB.prepare(`
      UPDATE api_keys 
      SET last_used_at = ?, total_requests = total_requests + 1
      WHERE id = ?
    `).bind(Date.now(), result.id).run()
  );
  
  await next();
}
```

### Scopes 權限控制

```typescript
// 可用的權限範圍
type ApiScope = 
  | 'links:read'       // 讀取短網址
  | 'links:write'      // 創建短網址
  | 'links:update'     // 更新短網址
  | 'links:delete'     // 刪除短網址
  | 'analytics:read'   // 讀取分析數據
  | 'admin:read'       // 管理員讀取
  | 'admin:write';     // 管理員寫入

// Middleware: 檢查權限
export function requireScope(...requiredScopes: ApiScope[]) {
  return async (c: Context, next: Next) => {
    const scopes = c.get('apiKeyScopes') as string[];
    
    const hasPermission = requiredScopes.some(scope => scopes.includes(scope));
    
    if (!hasPermission) {
      return c.json({
        error: 'Insufficient permissions',
        required: requiredScopes,
        current: scopes
      }, 403);
    }
    
    await next();
  };
}
```

---

## 💳 Credit 計費系統

### Credit 定價模型

```typescript
// 操作成本定義
const CREDIT_COSTS = {
  // 短網址操作
  LINK_CREATE: 1,           // 創建短網址
  LINK_UPDATE: 0.5,         // 更新短網址
  LINK_DELETE: 0,           // 刪除免費
  
  // 分析數據
  ANALYTICS_BASIC: 0.1,     // 基礎分析
  ANALYTICS_DETAILED: 1,    // 詳細分析
  
  // 元數據抓取
  METADATA_FETCH: 0.5,      // 抓取 OG 標籤
  
  // 批量操作
  BATCH_CREATE_BASE: 5,     // 批量創建基礎費用
  BATCH_CREATE_PER_LINK: 0.8, // 每條鏈接
};

// 訂閱方案
const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    monthlyQuota: 100,        // 每月 100 credits
    price: 0,
    features: [
      '每月 100 次 API 調用',
      '基礎分析數據',
      '1 個 API Key',
      '社群支援'
    ]
  },
  starter: {
    name: 'Starter',
    monthlyQuota: 1000,
    price: 9,                 // USD/月
    features: [
      '每月 1,000 次 API 調用',
      '詳細分析數據',
      '3 個 API Keys',
      'Email 支援',
      '自訂 OG 預覽'
    ]
  },
  pro: {
    name: 'Pro',
    monthlyQuota: 10000,
    price: 29,
    features: [
      '每月 10,000 次 API 調用',
      '完整分析數據',
      '10 個 API Keys',
      '優先支援',
      '自訂域名',
      'Webhook 通知'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    monthlyQuota: -1,         // 無限制
    price: 299,
    features: [
      '無限 API 調用',
      '專屬支援',
      '無限 API Keys',
      'SLA 保證',
      '白標服務',
      '自訂整合'
    ]
  }
};
```

### Credit 扣除流程

```typescript
// utils/credit-manager.ts

interface CreditDeduction {
  success: boolean;
  balanceAfter: number;
  transactionId?: string;
  error?: string;
}

export async function deductCredits(
  env: Env,
  userId: string,
  amount: number,
  options: {
    type: string;
    resourceType?: string;
    resourceId?: string;
    description?: string;
    apiKeyId?: string;
  }
): Promise<CreditDeduction> {
  try {
    // 1. 獲取當前餘額
    const creditResult = await env.DB.prepare(`
      SELECT balance, plan_type, monthly_quota, monthly_used
      FROM credits
      WHERE user_id = ?
    `).bind(userId).first();
    
    if (!creditResult) {
      return { success: false, balanceAfter: 0, error: 'Credit account not found' };
    }
    
    const currentBalance = creditResult.balance as number;
    const planType = creditResult.plan_type as string;
    const monthlyQuota = creditResult.monthly_quota as number;
    const monthlyUsed = creditResult.monthly_used as number;
    
    // 2. Enterprise 用戶無限制
    if (planType === 'enterprise') {
      // 記錄使用但不扣除
      const transactionId = crypto.randomUUID();
      
      await env.DB.prepare(`
        INSERT INTO credit_transactions
        (id, user_id, type, amount, balance_after, resource_type, resource_id, description, api_key_id, created_at)
        VALUES (?, ?, 'usage', ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        transactionId,
        userId,
        -amount,
        currentBalance,
        options.resourceType || null,
        options.resourceId || null,
        options.description || null,
        options.apiKeyId || null,
        Date.now()
      ).run();
      
      return { success: true, balanceAfter: currentBalance, transactionId };
    }
    
    // 3. 檢查月配額（優先使用）
    if (monthlyUsed < monthlyQuota) {
      const remainingQuota = monthlyQuota - monthlyUsed;
      
      if (amount <= remainingQuota) {
        // 完全從月配額扣除
        await env.DB.prepare(`
          UPDATE credits
          SET monthly_used = monthly_used + ?, updated_at = ?
          WHERE user_id = ?
        `).bind(amount, Date.now(), userId).run();
        
        const transactionId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO credit_transactions
          (id, user_id, type, amount, balance_after, resource_type, resource_id, description, api_key_id, created_at)
          VALUES (?, ?, 'usage_quota', ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          transactionId,
          userId,
          -amount,
          currentBalance,
          options.resourceType || null,
          options.resourceId || null,
          `從月配額扣除: ${options.description || ''}`,
          options.apiKeyId || null,
          Date.now()
        ).run();
        
        return { success: true, balanceAfter: currentBalance, transactionId };
      } else {
        // 部分從配額，部分從餘額
        const fromQuota = remainingQuota;
        const fromBalance = amount - fromQuota;
        
        if (currentBalance < fromBalance) {
          return { success: false, balanceAfter: currentBalance, error: 'Insufficient credits' };
        }
        
        const newBalance = currentBalance - fromBalance;
        
        await env.DB.batch([
          env.DB.prepare(`
            UPDATE credits
            SET balance = ?, monthly_used = monthly_quota, updated_at = ?
            WHERE user_id = ?
          `).bind(newBalance, Date.now(), userId),
          
          env.DB.prepare(`
            UPDATE credits
            SET total_used = total_used + ?
            WHERE user_id = ?
          `).bind(fromBalance, userId)
        ]);
        
        const transactionId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO credit_transactions
          (id, user_id, type, amount, balance_after, resource_type, resource_id, description, api_key_id, created_at)
          VALUES (?, ?, 'usage_mixed', ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          transactionId,
          userId,
          -amount,
          newBalance,
          options.resourceType || null,
          options.resourceId || null,
          `配額 ${fromQuota} + 餘額 ${fromBalance}: ${options.description || ''}`,
          options.apiKeyId || null,
          Date.now()
        ).run();
        
        return { success: true, balanceAfter: newBalance, transactionId };
      }
    }
    
    // 4. 月配額已用完，從餘額扣除
    if (currentBalance < amount) {
      return { success: false, balanceAfter: currentBalance, error: 'Insufficient credits' };
    }
    
    const newBalance = currentBalance - amount;
    
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE credits
        SET balance = ?, total_used = total_used + ?, updated_at = ?
        WHERE user_id = ?
      `).bind(newBalance, amount, Date.now(), userId)
    ]);
    
    const transactionId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO credit_transactions
      (id, user_id, type, amount, balance_after, resource_type, resource_id, description, api_key_id, created_at)
      VALUES (?, ?, 'usage', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transactionId,
      userId,
      -amount,
      newBalance,
      options.resourceType || null,
      options.resourceId || null,
      options.description || null,
      options.apiKeyId || null,
      Date.now()
    ).run();
    
    return { success: true, balanceAfter: newBalance, transactionId };
    
  } catch (error) {
    console.error('Credit deduction error:', error);
    return { success: false, balanceAfter: 0, error: 'Internal error' };
  }
}

// Middleware: 檢查並扣除 Credits
export function requireCredits(cost: number) {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    const apiKeyId = c.get('apiKeyId');
    
    // 檢查餘額
    const currentBalance = c.get('creditBalance') as number;
    
    if (currentBalance < cost) {
      return c.json({
        error: 'Insufficient credits',
        required: cost,
        current: currentBalance,
        message: '請充值或升級方案'
      }, 402); // 402 Payment Required
    }
    
    // 繼續執行
    await next();
    
    // 如果請求成功（狀態碼 2xx），則扣除 credits
    if (c.res.status >= 200 && c.res.status < 300) {
      c.executionCtx.waitUntil(
        deductCredits(c.env, userId, cost, {
          type: 'usage',
          apiKeyId,
          description: `${c.req.method} ${c.req.path}`
        })
      );
    }
  };
}
```

---

## 🌐 API 端點設計

### 公開 API 路由結構

```
/v1/
  /links
    GET    /              列出短網址
    POST   /              創建短網址
    GET    /:slug         獲取短網址詳情
    PUT    /:slug         更新短網址
    DELETE /:slug         刪除短網址
    POST   /batch         批量創建
    
  /analytics
    GET    /:slug         獲取分析數據
    GET    /:slug/clicks  獲取點擊記錄
    
  /account
    GET    /credits       獲取 Credit 餘額
    GET    /usage         獲取使用統計
    GET    /keys          列出 API Keys
    POST   /keys          創建 API Key
    DELETE /keys/:id      刪除 API Key
```

### 詳細 API 規格

#### 1. 創建短網址

```http
POST /v1/links
Authorization: Bearer oao_live_xxxxx
Content-Type: application/json

{
  "url": "https://example.com/very-long-url",
  "customSlug": "my-link",        // 可選
  "title": "My Custom Title",      // 可選
  "description": "Description",    // 可選
  "image": "https://...",          // 可選
  "expiresAt": 1735689600000,     // 可選，Unix timestamp
  "password": "secret123",         // 可選
  "tags": ["marketing", "2026"]   // 可選
}

Response 201:
{
  "success": true,
  "data": {
    "slug": "my-link",
    "url": "https://example.com/very-long-url",
    "shortUrl": "https://oao.to/my-link",
    "title": "My Custom Title",
    "description": "Description",
    "image": "https://...",
    "qrCode": "https://api.qrserver.com/v1/create-qr-code/?data=...",
    "createdAt": 1706025600000
  },
  "credits": {
    "cost": 1,
    "balanceAfter": 99
  }
}

Response 402:
{
  "error": "Insufficient credits",
  "required": 1,
  "current": 0
}

Response 409:
{
  "error": "Slug already exists"
}
```

#### 2. 批量創建短網址

```http
POST /v1/links/batch
Authorization: Bearer oao_live_xxxxx
Content-Type: application/json

{
  "links": [
    { "url": "https://example.com/1" },
    { "url": "https://example.com/2", "customSlug": "link2" },
    { "url": "https://example.com/3" }
  ]
}

Response 201:
{
  "success": true,
  "data": {
    "created": [
      {
        "slug": "abc123",
        "url": "https://example.com/1",
        "shortUrl": "https://oao.to/abc123"
      },
      {
        "slug": "link2",
        "url": "https://example.com/2",
        "shortUrl": "https://oao.to/link2"
      },
      {
        "slug": "def456",
        "url": "https://example.com/3",
        "shortUrl": "https://oao.to/def456"
      }
    ],
    "failed": []
  },
  "credits": {
    "cost": 7.4,  // 5 (base) + 3 * 0.8
    "balanceAfter": 92.6
  }
}
```

#### 3. 獲取分析數據

```http
GET /v1/analytics/my-link?period=7d
Authorization: Bearer oao_live_xxxxx

Response 200:
{
  "success": true,
  "data": {
    "slug": "my-link",
    "totalClicks": 1234,
    "uniqueVisitors": 890,
    "period": {
      "from": 1705420800000,
      "to": 1706025600000
    },
    "clicksByDate": [
      { "date": "2026-01-17", "clicks": 45 },
      { "date": "2026-01-18", "clicks": 67 }
    ],
    "topCountries": [
      { "country": "US", "clicks": 450 },
      { "country": "TW", "clicks": 300 }
    ],
    "topReferrers": [
      { "referrer": "google.com", "clicks": 200 },
      { "referrer": "facebook.com", "clicks": 150 }
    ]
  },
  "credits": {
    "cost": 1,
    "balanceAfter": 98
  }
}
```

#### 4. 獲取 Credit 餘額

```http
GET /v1/account/credits
Authorization: Bearer oao_live_xxxxx

Response 200:
{
  "success": true,
  "data": {
    "balance": 98,
    "plan": {
      "type": "pro",
      "name": "Pro",
      "monthlyQuota": 10000,
      "monthlyUsed": 245,
      "monthlyRemaining": 9755,
      "renewsAt": 1709193600000
    },
    "usage": {
      "today": 12,
      "thisWeek": 89,
      "thisMonth": 245
    }
  }
}
```

#### 5. 創建 API Key

```http
POST /v1/account/keys
Authorization: Bearer <JWT Token>  // 使用網頁登入的 JWT
Content-Type: application/json

{
  "name": "Production API",
  "scopes": ["links:read", "links:write", "analytics:read"],
  "environment": "live",           // "live" or "test"
  "rateLimit": {
    "perMinute": 60,
    "perDay": 10000
  },
  "expiresAt": 1767225600000      // 可選
}

Response 201:
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "name": "Production API",
    "key": "oao_live_1a2b3c4d5e6f7g8h9i0j",  // ⚠️ 只顯示這一次！
    "keyPrefix": "oao_live_",
    "scopes": ["links:read", "links:write", "analytics:read"],
    "createdAt": 1706025600000
  },
  "warning": "Please save this API key securely. It will not be shown again."
}
```

---

## 👨‍💼 管理員功能

### 管理員 Dashboard 端點

#### 1. 系統總覽

```http
GET /api/admin/overview
Authorization: Bearer <admin_jwt>

Response:
{
  "users": {
    "total": 1234,
    "active": 890,
    "newThisMonth": 45
  },
  "apiKeys": {
    "total": 456,
    "active": 389
  },
  "credits": {
    "totalPurchased": 1000000,
    "totalUsed": 456789,
    "totalRemaining": 543211
  },
  "links": {
    "total": 50000,
    "createdViaApi": 35000,
    "createdViaWeb": 15000
  },
  "revenue": {
    "thisMonth": 5678,
    "lastMonth": 4567
  }
}
```

#### 2. 用戶管理（擴展現有功能）

```http
GET /api/admin/users?plan=pro&page=1&limit=50
Authorization: Bearer <admin_jwt>

Response:
{
  "users": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "plan": "pro",
      "credits": {
        "balance": 450,
        "monthlyQuota": 10000,
        "monthlyUsed": 3456
      },
      "apiKeys": 3,
      "totalLinks": 234,
      "totalApiCalls": 12345,
      "createdAt": 1704067200000,
      "lastActiveAt": 1706025600000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234
  }
}
```

#### 3. 手動調整 Credits

```http
POST /api/admin/users/:userId/credits/adjust
Authorization: Bearer <superadmin_jwt>

{
  "amount": 1000,
  "type": "bonus",
  "description": "新年獎勵"
}

Response:
{
  "success": true,
  "balanceAfter": 1450
}
```

#### 4. API 使用統計

```http
GET /api/admin/analytics/api-usage?period=30d
Authorization: Bearer <admin_jwt>

Response:
{
  "totalRequests": 123456,
  "successRate": 99.2,
  "topUsers": [
    {
      "userId": "user_123",
      "email": "user@example.com",
      "requests": 45678,
      "creditsUsed": 12345
    }
  ],
  "topEndpoints": [
    { "endpoint": "POST /v1/links", "requests": 56789 },
    { "endpoint": "GET /v1/analytics/:slug", "requests": 34567 }
  ],
  "errorRate": {
    "401": 123,
    "402": 456,
    "429": 89,
    "500": 12
  }
}
```

#### 5. 監控與告警

```http
GET /api/admin/monitoring/health
Authorization: Bearer <admin_jwt>

Response:
{
  "status": "healthy",
  "services": {
    "database": { "status": "up", "latency": 12 },
    "kv": { "status": "up", "latency": 5 },
    "analytics": { "status": "up", "latency": 8 }
  },
  "alerts": [
    {
      "level": "warning",
      "message": "User user_456 approaching rate limit",
      "timestamp": 1706025000000
    }
  ]
}
```

---

## 🔒 安全性設計

### 1. Rate Limiting（限流）

```typescript
// 使用 Cloudflare Durable Objects 或 KV 實現

interface RateLimitConfig {
  perSecond?: number;
  perMinute?: number;
  perHour?: number;
  perDay?: number;
}

export async function checkRateLimit(
  env: Env,
  key: string,  // 如 "api_key:{keyId}:minute"
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;
  
  // 從 KV 獲取當前計數
  const currentStr = await env.LINKS.get(windowKey);
  const current = currentStr ? parseInt(currentStr) : 0;
  
  if (current >= limit) {
    const resetAt = Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000;
    return {
      allowed: false,
      remaining: 0,
      resetAt
    };
  }
  
  // 增加計數
  await env.LINKS.put(
    windowKey,
    (current + 1).toString(),
    { expirationTtl: windowSeconds + 10 }  // 稍微長一點避免競態
  );
  
  return {
    allowed: true,
    remaining: limit - current - 1,
    resetAt: Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000
  };
}

// Middleware
export function rateLimitMiddleware() {
  return async (c: Context, next: Next) => {
    const apiKeyId = c.get('apiKeyId');
    const perMinute = 60;  // 從資料庫獲取
    
    const minuteCheck = await checkRateLimit(
      c.env,
      `api_key:${apiKeyId}:minute`,
      perMinute,
      60
    );
    
    c.header('X-RateLimit-Limit', perMinute.toString());
    c.header('X-RateLimit-Remaining', minuteCheck.remaining.toString());
    c.header('X-RateLimit-Reset', minuteCheck.resetAt.toString());
    
    if (!minuteCheck.allowed) {
      return c.json({
        error: 'Rate limit exceeded',
        limit: perMinute,
        resetAt: minuteCheck.resetAt
      }, 429);
    }
    
    await next();
  };
}
```

### 2. API Key 安全最佳實踐

```typescript
// ✅ 最佳實踐

1. 永不明文存儲 API Key
   - 只存儲 SHA-256 雜湊
   - Key 只在創建時顯示一次

2. 使用 HTTPS
   - 強制所有 API 請求使用 HTTPS
   - 拒絕 HTTP 請求

3. 定期輪換
   - 提供 Key 輪換功能
   - 建議 90 天輪換一次

4. 最小權限原則
   - 使用 Scopes 限制權限
   - 為不同用途創建不同 Key

5. 監控異常使用
   - 追蹤每個 Key 的使用模式
   - 異常活動自動告警
```

### 3. CORS 設定

```typescript
// 只允許特定 Origin 調用 API
app.use('/v1/*', cors({
  origin: (origin) => {
    // API Key 驗證的請求允許任何 origin
    // 因為是服務端調用
    return origin;
  },
  credentials: false,  // API Key 不需要 cookies
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
```

---

## 📊 監控與限流

### 1. 實時監控指標

```typescript
// 需要追蹤的關鍵指標

interface Metrics {
  // API 健康度
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  
  // 用戶行為
  activeUsers: number;
  newUsers: number;
  churnedUsers: number;
  
  // Credit 使用
  creditsUsed: number;
  creditsPurchased: number;
  
  // 錯誤率
  errorsByType: Record<string, number>;
  errorRate: number;
}

// 使用 Cloudflare Analytics Engine
export async function trackApiMetric(
  env: Env,
  metric: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    userId: string;
    apiKeyId: string;
    creditsUsed: number;
  }
) {
  env.TRACKER.writeDataPoint({
    blobs: [
      metric.endpoint,
      metric.method,
      metric.userId,
      metric.apiKeyId,
    ],
    doubles: [
      metric.responseTime,
      metric.creditsUsed,
    ],
    indexes: [
      metric.statusCode.toString(),
    ],
  });
}
```

### 2. 告警系統

```typescript
// 告警條件
const ALERT_THRESHOLDS = {
  errorRate: 5,              // 5% 錯誤率
  avgResponseTime: 1000,     // 1 秒
  rateLimitHitRate: 10,      // 10% 請求被限流
  creditBalanceLow: 10,      // 餘額低於 10
};

// 發送告警（整合 Cloudflare Workers Email 或 Webhook）
export async function sendAlert(
  type: 'error_rate' | 'slow_response' | 'credit_low',
  details: any
) {
  // 發送到 Slack / Discord / Email
  await fetch('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 Alert: ${type}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: JSON.stringify(details, null, 2)
          }
        }
      ]
    })
  });
}
```

---

## 💰 定價方案

### 完整方案對比

| 功能 | Free | Starter | Pro | Enterprise |
|------|------|---------|-----|------------|
| **價格** | $0/月 | $9/月 | $29/月 | $299/月 |
| **月配額** | 100 credits | 1,000 credits | 10,000 credits | 無限 |
| **額外 Credits** | $0.1/credit | $0.08/credit | $0.05/credit | 已包含 |
| **API Keys** | 1 | 3 | 10 | 無限 |
| **Rate Limit** | 10/min | 60/min | 300/min | 自訂 |
| **短網址數量** | 50 | 500 | 5,000 | 無限 |
| **分析數據保留** | 30 天 | 90 天 | 1 年 | 永久 |
| **自訂域名** | ❌ | ❌ | ✅ | ✅ |
| **Webhook** | ❌ | ❌ | ✅ | ✅ |
| **優先支援** | ❌ | Email | Email + Chat | 專屬經理 |
| **SLA** | - | - | 99.9% | 99.99% |
| **白標** | ❌ | ❌ | ❌ | ✅ |

### Credit 充值選項

```typescript
const CREDIT_PACKAGES = {
  small: {
    credits: 1000,
    price: 10,
    bonus: 0,
    perCredit: 0.01
  },
  medium: {
    credits: 5000,
    price: 40,
    bonus: 500,       // 10% bonus
    perCredit: 0.008
  },
  large: {
    credits: 10000,
    price: 70,
    bonus: 2000,      // 20% bonus
    perCredit: 0.007
  },
  enterprise: {
    credits: 50000,
    price: 300,
    bonus: 15000,     // 30% bonus
    perCredit: 0.006
  }
};
```

---

## 🚀 實施路線圖

### Phase 1: 核心 API 基礎設施 (Week 1-2)

- [ ] 資料庫 Schema 設計與 Migration
- [ ] API Key 生成與驗證系統
- [ ] Credit 扣除邏輯
- [ ] 基礎 API 端點 (CRUD)

### Phase 2: 安全與限流 (Week 3)

- [ ] Rate Limiting 實現
- [ ] Scopes 權限系統
- [ ] 安全審計日誌
- [ ] 錯誤處理標準化

### Phase 3: 管理後台 (Week 4)

- [ ] 管理員 Dashboard API
- [ ] 用戶 Credit 管理
- [ ] API Key 管理介面
- [ ] 使用統計視覺化

### Phase 4: 監控與優化 (Week 5)

- [ ] 實時監控儀表板
- [ ] 告警系統
- [ ] 性能優化
- [ ] 文檔完善

### Phase 5: 付費與計費 (Week 6+)

- [ ] 整合 Stripe 支付
- [ ] 訂閱管理
- [ ] 發票生成
- [ ] 自動續訂

---

## 📚 技術參考

### 業界標準範例

- **Stripe API**: https://stripe.com/docs/api
- **GitHub API**: https://docs.github.com/en/rest
- **Twilio API**: https://www.twilio.com/docs/api
- **Vercel API**: https://vercel.com/docs/rest-api

### 最佳實踐

1. **語意化版本控制** (Semantic Versioning)
   - `/v1/`, `/v2/` 路由
   - 向後兼容性保證

2. **RESTful 設計**
   - 資源導向的 URL
   - HTTP 方法語意正確

3. **標準化錯誤碼**
   ```json
   {
     "error": {
       "code": "insufficient_credits",
       "message": "Not enough credits to perform this operation",
       "details": {
         "required": 10,
         "available": 5
       }
     }
   }
   ```

4. **完整的 API 文檔**
   - OpenAPI 3.0 規格
   - 交互式文檔 (Swagger UI)
   - SDK 生成（Python, Node.js, PHP）

---

## ✅ 結論

這套 API 平台設計遵循現代 SaaS 最佳實踐：

✅ **可擴展**: 基於 Cloudflare Workers 無伺服器架構  
✅ **安全**: API Key + Scopes + Rate Limiting  
✅ **靈活計費**: Credit 系統 + 訂閱方案  
✅ **易於管理**: 完整的管理後台  
✅ **可監控**: 實時指標 + 告警系統  
✅ **開發者友善**: RESTful API + 完整文檔  

這是一個**企業級、生產就緒**的 API 平台設計！🚀

