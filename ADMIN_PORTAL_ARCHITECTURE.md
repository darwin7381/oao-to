# Admin Portal 正確架構規格

**版本**: 1.0  
**日期**: 2026-01-24  
**狀態**: ✅ 最終設計規格

---

## 🎯 設計原則

### **單一真實來源（Single Source of Truth）**

每一種數據只有一個主要儲存位置，其他位置只能作為：
- **索引** - 用於快速查詢
- **快取** - 用於性能優化
- **備份** - 用於災難恢復

---

## 📊 數據儲存策略

### **Links 數據的完整架構**

```
┌─────────────────────────────────────────────────────────┐
│                    Links 數據分層                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: Workers KV (主要來源)                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ Key: "link:abc123"                             │     │
│  │ Value: {                                       │     │
│  │   slug, url, userId, createdAt, updatedAt,    │     │
│  │   title, description, image,                  │     │
│  │   customTitle, customDescription, customImage,│     │
│  │   tags, isActive, expiresAt, password,        │     │
│  │   flagReason, flaggedAt, flaggedBy            │     │
│  │ }                                              │     │
│  └────────────────────────────────────────────────┘     │
│  → Core Worker 讀取（重定向）                            │
│  → API Worker 讀寫（CRUD）                               │
│                                                          │
│  Layer 2: D1 Database (索引/查詢)                        │
│  ┌────────────────────────────────────────────────┐     │
│  │ links 表：                                     │     │
│  │ slug, url, user_id, title,                    │     │
│  │ created_at, updated_at, expires_at, password  │     │
│  └────────────────────────────────────────────────┘     │
│  → 用於複雜查詢（列表、JOIN）                            │
│  → 只儲存基本欄位                                        │
│                                                          │
│  Layer 3: Analytics Engine (點擊追蹤)                    │
│  ┌────────────────────────────────────────────────┐     │
│  │ link_clicks 事件流：                           │     │
│  │ { blob1: slug, blob4: country,                │     │
│  │   blob8: device, double1: timestamp }         │     │
│  └────────────────────────────────────────────────┘     │
│  → 所有點擊事件                                          │
│  → 查詢時計算 clicks, countries, devices                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ D1 Database Schema

### **完整的 Tables 清單**

#### **1. users** (Migration 0001 + 0002)
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user',  -- user/admin/superadmin
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);
```

#### **2. links** (Migration 0001) - 保持原樣
```sql
CREATE TABLE links (
  slug TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  expires_at INTEGER,
  password TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**為什麼不添加其他欄位？**
- `clicks` → Analytics Engine 查詢
- `is_active` → KV LinkData 中
- `description/image` → KV LinkData 中

#### **3. api_keys** (Migration 0003)
```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL DEFAULT 'links:read,links:write',
  is_active INTEGER NOT NULL DEFAULT 1,
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,
  last_used_at INTEGER,
  total_requests INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **4. credits** (Migration 0003)
```sql
CREATE TABLE credits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  subscription_balance INTEGER DEFAULT 0,
  purchased_balance INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  plan_type TEXT DEFAULT 'free',
  plan_renewed_at INTEGER,
  monthly_quota INTEGER DEFAULT 100,
  monthly_used INTEGER DEFAULT 0,
  monthly_reset_at INTEGER,
  overage_limit INTEGER DEFAULT 0,
  overage_used INTEGER DEFAULT 0,
  overage_rate REAL DEFAULT 0.01,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **5. credit_transactions** (Migration 0003)
```sql
CREATE TABLE credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  description TEXT,
  metadata TEXT,
  api_key_id TEXT,
  admin_id TEXT,  -- 🆕 Migration 0004 添加
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);
```

#### **6. payments** (Migration 0004) 🆕
```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,  -- completed, pending, failed, refunded
  plan TEXT NOT NULL,
  credits INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'stripe',
  stripe_payment_id TEXT,
  stripe_customer_id TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **7. api_usage_stats** (Migration 0003)
```sql
CREATE TABLE api_usage_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  api_key_id TEXT,
  date TEXT NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  link_creates INTEGER DEFAULT 0,
  link_reads INTEGER DEFAULT 0,
  link_updates INTEGER DEFAULT 0,
  link_deletes INTEGER DEFAULT 0,
  analytics_requests INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL,
  UNIQUE(user_id, api_key_id, date)
);
```

#### **8. link_index** (Migration 0003)
```sql
CREATE TABLE link_index (
  slug TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_via TEXT DEFAULT 'web',  -- web, api
  api_key_id TEXT,
  created_at INTEGER NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);
```

---

## 🔌 Admin API Endpoints 設計

### **1. GET /api/admin/links**

**數據來源**：
```typescript
// 基本列表 → D1
SELECT slug, url, user_id, title, created_at 
FROM links 
ORDER BY created_at DESC

// 點擊數 → Analytics Engine
SELECT blob1 as slug, COUNT() as clicks
FROM link_clicks
WHERE blob1 IN (...)
GROUP BY blob1

// 狀態與元數據 → KV
LINKS.get('link:xxx')
→ { isActive, flagReason, description, image, ... }
```

**返回格式**：
```json
{
  "data": {
    "links": [
      {
        "slug": "abc123",
        "url": "https://example.com",
        "user_id": "user-xxx",
        "user_email": "user@example.com",
        "title": "Example",
        "clicks": 1234,
        "is_active": true,
        "is_flagged": false,
        "created_at": 1234567890
      }
    ],
    "total": 100
  }
}
```

---

### **2. POST /api/admin/links/:slug/disable**

**數據來源**: KV  
**操作**:
1. 讀取 KV: `LINKS.get('link:xxx')`
2. 修改: `linkData.isActive = false`
3. 寫回 KV: `LINKS.put('link:xxx', ...)`
4. 清除 Cache

**不需要**修改 D1（is_active 不在 D1）

---

### **3. DELETE /api/admin/links/:slug**

**數據來源**: KV + D1  
**操作**:
1. 刪除 KV: `LINKS.delete('link:xxx')`
2. 刪除 D1: `DELETE FROM links WHERE slug = ?`
3. 刪除 link_index: `DELETE FROM link_index WHERE slug = ?`

---

### **4. GET /api/admin/analytics**

**數據來源**：
```typescript
// 用戶增長 → D1 users
SELECT DATE(created_at/1000, 'unixepoch') as date, COUNT(*) as count
FROM users
GROUP BY date
ORDER BY date

// 連結增長 → D1 links
SELECT DATE(created_at/1000, 'unixepoch') as date, COUNT(*) as count
FROM links
GROUP BY date
ORDER BY date

// Top Users → D1 + Analytics Engine
// 1. 從 D1 獲取所有用戶和他們的連結數
SELECT u.email, COUNT(l.slug) as links
FROM users u
LEFT JOIN links l ON u.id = l.user_id
GROUP BY u.id

// 2. 從 Analytics Engine 獲取每個用戶的總點擊數
SELECT blob3 as userId, COUNT() as total_clicks
FROM link_clicks
GROUP BY userId

// Top Links → Analytics Engine
SELECT blob1 as slug, blob2 as url, COUNT() as clicks
FROM link_clicks
GROUP BY slug
ORDER BY clicks DESC
LIMIT 10
```

---

### **5. GET /api/admin/api-keys**

**數據來源**: D1 `api_keys` + `api_usage_stats`

```sql
-- 基本資訊
SELECT k.*, u.email, u.name
FROM api_keys k
JOIN users u ON k.user_id = u.id

-- 錯誤率（從 api_usage_stats 計算）
SELECT 
  api_key_id,
  SUM(failed_requests) * 100.0 / NULLIF(SUM(total_requests), 0) as error_rate,
  SUM(total_requests) as total
FROM api_usage_stats
WHERE api_key_id = ?
```

---

### **6. GET /api/admin/payments**

**數據來源**: D1 `payments` 表

```sql
SELECT p.*, u.email as user_email
FROM payments p
LEFT JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
```

---

### **7. GET /api/admin/credits/users**

**數據來源**: D1 `credits` + `users`

```sql
SELECT 
  u.id as user_id, 
  u.email, 
  u.name,
  c.balance as total_credits,
  c.subscription_balance,
  c.purchased_balance,
  c.plan_type as plan
FROM users u
LEFT JOIN credits c ON u.id = c.user_id
ORDER BY c.balance DESC
```

---

### **8. POST /api/admin/credits/adjust**

**數據來源**: D1 `credits` + `credit_transactions`

**流程**:
1. 查詢當前餘額
2. 計算新餘額
3. 更新 credits 表
4. 插入 credit_transactions 記錄（含 admin_id）

---

## 🔧 TypeScript 類型定義

### **LinkData** (KV 儲存)

```typescript
export interface LinkData {
  // 基本資訊
  slug: string;
  url: string;
  userId: string;
  createdAt: number;
  updatedAt?: number;
  expiresAt?: number;
  password?: string;
  
  // 元數據（自動抓取 + 可自定義）
  title?: string;
  description?: string;
  image?: string;
  customTitle?: string;
  customDescription?: string;
  customImage?: string;
  
  // 設定
  tags?: string[];
  isActive?: boolean;
  
  // 🆕 Admin 管理欄位
  flagReason?: string;
  flaggedAt?: number;
  flaggedBy?: string;  // Admin user ID
}
```

**重要**：這些 Admin 管理欄位儲存在 KV，不在 D1！

---

## 📋 Migration 0004 正確內容

```sql
-- Migration 0004: Admin Features
-- 只添加新表，不修改 links 表

-- 1. Payments 表（新功能）
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  plan TEXT NOT NULL,
  credits INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'stripe',
  stripe_payment_id TEXT,
  stripe_customer_id TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- 2. Credit Transactions 添加 admin_id
ALTER TABLE credit_transactions ADD COLUMN admin_id TEXT;
CREATE INDEX IF NOT EXISTS idx_credit_transactions_admin_id ON credit_transactions(admin_id);
```

**不包含**：
- ❌ 對 links 表的任何修改
- ❌ clicks 欄位
- ❌ is_active 欄位
- ❌ is_flagged 欄位

---

## 🔄 資料同步策略

### **創建連結時**

```typescript
// 1. 寫入 KV（完整數據）
const linkData: LinkData = { slug, url, userId, createdAt, isActive: true, ... };
await env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

// 2. 寫入 D1 links 表（索引用，只寫基本欄位）
await env.DB.prepare(`
  INSERT INTO links (slug, url, user_id, title, created_at, updated_at, expires_at, password)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).bind(slug, url, userId, title, createdAt, null, expiresAt, password).run();

// 3. 如果是 API 創建，寫入 link_index
if (createdVia === 'api') {
  await env.DB.prepare(`
    INSERT INTO link_index (slug, user_id, created_via, api_key_id, created_at)
    VALUES (?, ?, 'api', ?, ?)
  `).bind(slug, userId, apiKeyId, createdAt).run();
}
```

---

### **更新連結時**

```typescript
// 1. 更新 KV（完整數據）
const linkData = JSON.parse(await env.LINKS.get(`link:${slug}`));
linkData.title = newTitle;
linkData.isActive = newIsActive;
linkData.updatedAt = Date.now();
await env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

// 2. 🆕 同步更新 D1（基本欄位）
await env.DB.prepare(`
  UPDATE links 
  SET title = ?, updated_at = ?, expires_at = ?, password = ?
  WHERE slug = ?
`).bind(newTitle, Date.now(), expiresAt, password, slug).run();

// 注意：不同步 is_active（不在 D1）
```

---

### **刪除連結時**

```typescript
// 1. 刪除 KV
await env.LINKS.delete(`link:${slug}`);

// 2. 刪除 D1 links
await env.DB.prepare('DELETE FROM links WHERE slug = ?').bind(slug).run();

// 3. 刪除 link_index（如果存在）
await env.DB.prepare('DELETE FROM link_index WHERE slug = ?').bind(slug).run();

// 注意：Analytics Engine 的點擊記錄保留（歷史數據）
```

---

### **Admin 禁用連結時**

```typescript
// 只更新 KV（isActive 只在 KV）
const linkData = JSON.parse(await env.LINKS.get(`link:${slug}`));
linkData.isActive = false;
linkData.flagReason = "Spam/違規內容";
linkData.flaggedAt = Date.now();
linkData.flaggedBy = adminUserId;
await env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

// 不需要更新 D1
```

---

## 📊 Admin API 數據查詢邏輯

### **Admin Links Management**

```typescript
async function getAdminLinks(env: Env, limit: number) {
  // Step 1: 從 D1 獲取基本列表
  const { results } = await env.DB.prepare(`
    SELECT l.slug, l.url, l.user_id, l.title, l.created_at,
           u.email as user_email
    FROM links l
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
    LIMIT ?
  `).bind(limit).all();
  
  if (results.length === 0) {
    return { links: [] };
  }
  
  // Step 2: 批量查詢 clicks（Analytics Engine）
  const slugs = results.map(l => `'${l.slug}'`).join(',');
  const clicksData = await queryAnalytics(env, `
    SELECT blob1 as slug, COUNT() as clicks
    FROM link_clicks
    WHERE blob1 IN (${slugs})
    GROUP BY blob1
  `);
  
  // Step 3: 批量查詢 KV 狀態
  const enrichedLinks = await Promise.all(
    results.map(async (link) => {
      const kvStr = await env.LINKS.get(`link:${link.slug}`);
      const kvData = kvStr ? JSON.parse(kvStr) : {};
      const clickInfo = clicksData.find(c => c.slug === link.slug);
      
      return {
        id: link.slug,  // Admin API 用 slug 作為 ID
        slug: link.slug,
        url: link.url,
        user_id: link.user_id,
        user_email: link.user_email,
        title: link.title,
        clicks: parseInt(clickInfo?.clicks || '0'),
        is_active: kvData.isActive ?? true,
        is_flagged: !!kvData.flagReason,
        flag_reason: kvData.flagReason,
        created_at: link.created_at,
        last_clicked_at: null,  // 未來從 AE 查詢（可選）
      };
    })
  );
  
  return { links: enrichedLinks };
}
```

---

### **Admin Analytics Dashboard**

```typescript
async function getAdminAnalytics(env: Env, range: string) {
  // 用戶增長（D1）
  const userGrowth = await env.DB.prepare(`
    SELECT 
      DATE(created_at/1000, 'unixepoch') as date,
      COUNT(*) as count
    FROM users
    WHERE created_at > ?
    GROUP BY date
    ORDER BY date
  `).bind(getRangeTimestamp(range)).all();
  
  // 連結增長（D1）
  const linkGrowth = await env.DB.prepare(`
    SELECT 
      DATE(created_at/1000, 'unixepoch') as date,
      COUNT(*) as count
    FROM links
    WHERE created_at > ?
    GROUP BY date
    ORDER BY date
  `).bind(getRangeTimestamp(range)).all();
  
  // Top Users（D1 + Analytics Engine）
  const usersWithLinks = await env.DB.prepare(`
    SELECT u.id, u.email, u.name, COUNT(l.slug) as link_count
    FROM users u
    LEFT JOIN links l ON u.id = l.user_id
    GROUP BY u.id
    ORDER BY link_count DESC
    LIMIT 10
  `).all();
  
  // 獲取每個用戶的總點擊數
  const userIds = usersWithLinks.results.map(u => `'${u.id}'`).join(',');
  const userClicks = await queryAnalytics(env, `
    SELECT blob3 as userId, COUNT() as clicks
    FROM link_clicks
    WHERE blob3 IN (${userIds})
    GROUP BY userId
  `);
  
  const topUsers = usersWithLinks.results.map(u => {
    const clicks = userClicks.find(c => c.userId === u.id);
    return {
      email: u.email,
      name: u.name,
      links: u.link_count,
      clicks: parseInt(clicks?.clicks || '0')
    };
  });
  
  // Top Links（Analytics Engine）
  const topLinks = await queryAnalytics(env, `
    SELECT blob1 as slug, blob2 as url, COUNT() as clicks
    FROM link_clicks
    GROUP BY slug
    ORDER BY clicks DESC
    LIMIT 10
  `);
  
  // 地理分佈（Analytics Engine）
  const clicksByCountry = await queryAnalytics(env, `
    SELECT blob4 as country, COUNT() as clicks
    FROM link_clicks
    GROUP BY country
    ORDER BY clicks DESC
    LIMIT 10
  `);
  
  return {
    userGrowth,
    linkGrowth,
    topUsers,
    topLinks,
    clicksByCountry
  };
}
```

---

## ⚠️ 重要注意事項

### **1. D1 Migration 路徑陷阱（實際案例 2026-01-24）**

**問題**: 使用 `--persist-to` 啟動 Worker 時，migration 也必須用相同路徑

```bash
# Worker 啟動（共享路徑）
wrangler dev --persist-to ../.wrangler/oao-shared

# ❌ 錯誤 migration（預設路徑）
wrangler d1 migrations apply DB --local
→ 應用到：.wrangler/state/（Worker 看不到）

# ✅ 正確 migration（共享路徑）
wrangler d1 migrations apply DB --local --persist-to ../.wrangler/oao-shared
→ 應用到：../.wrangler/oao-shared/（Worker 使用的）
```

**實際影響**：
- payments 表創建成功，但 API 報錯 "no such table"
- 導致數小時 debug 時間浪費
- 數據狀態混亂

---

### **2. D1 Links 表的角色**

D1 links 表**只是索引**，用於：
- ✅ 列出用戶的所有連結（`WHERE user_id = ?`）
- ✅ JOIN 查詢（與 users 表關聯）
- ✅ 複雜搜尋（多條件過濾）

**不用於**：
- ❌ 儲存完整數據（在 KV）
- ❌ 儲存點擊統計（在 Analytics Engine）
- ❌ 儲存狀態（在 KV）

---

### **3. 現有代碼的問題**

**問題**: `links.put()` 只更新 KV，不更新 D1

**影響**: D1 的 title, updated_at 等欄位會過時

**修復**: 更新時同步寫入 D1

---

### **3. Admin 刪除 vs 禁用**

**刪除**: 
- 永久移除（KV + D1 都刪）
- 不可恢復
- 連結完全消失

**禁用**:
- 只修改 KV 的 `isActive = false`
- 可恢復（改回 true）
- Core Worker 檢查 isActive，返回 410 Gone

---

## 🎯 實現優先級

### **Phase 1: 基礎修正**（立即執行）
1. 修正 Migration 0004
2. 更新 types.ts（LinkData 添加 Admin 欄位）
3. 修復 links.put() 的 D1 同步問題

### **Phase 2: Admin API 實現**（核心功能）
1. 修正 `/api/admin/links` 使用正確數據來源
2. 修正 `/api/admin/analytics` 使用 AE
3. 實現 `/api/admin/links/:slug/disable`
4. 修正 `/api/admin/links/:slug` 刪除邏輯

### **Phase 3: 測試驗證**
1. 測試所有 Admin API
2. 驗證數據正確性
3. 檢查性能

---

## 📌 總結

**正確的架構**：
- Links 完整數據 → KV
- Links 索引 → D1
- Clicks 數據 → Analytics Engine
- Payments → D1（新增）✅
- Credits → D1（已有）✅
- API Keys → D1（已有）✅

**Migration 0004 應該只做**：
- ✅ 添加 payments 表
- ✅ 添加 admin_id 到 credit_transactions
- ❌ 不修改 links 表
