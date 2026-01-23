# 用戶角色權限系統

**專案**：OAO.TO  
**版本**：V1.0  
**更新**：2026-01-15  

---

## 🎯 角色系統概述

OAO.TO 實施了三層用戶角色系統，提供不同等級的權限控制。

### 角色定義

| 角色 | 名稱 | 權限等級 | 說明 |
|------|------|---------|------|
| `user` | 一般用戶 | Level 0 | 預設角色，可創建和管理自己的短網址 |
| `admin` | 管理員 | Level 1 | 可查看所有用戶和系統統計 |
| `superadmin` | 超級管理員 | Level 2 | 完整權限，可管理用戶角色 |

---

## 📊 權限矩陣

| 功能 | user | admin | superadmin |
|------|------|-------|------------|
| 創建短網址 | ✅ | ✅ | ✅ |
| 管理自己的短網址 | ✅ | ✅ | ✅ |
| 查看自己的分析數據 | ✅ | ✅ | ✅ |
| 查看所有用戶列表 | ❌ | ✅ | ✅ |
| 查看系統統計 | ❌ | ✅ | ✅ |
| 管理用戶角色 | ❌ | ❌ | ✅ |
| 刪除任何用戶 | ❌ | ❌ | ✅ |

---

## 🗄️ 資料庫結構

### users 表結構

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user',  -- 角色欄位
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX idx_users_role ON users(role);
```

### role 欄位值

- `'user'` - 預設值，所有新用戶
- `'admin'` - 管理員
- `'superadmin'` - 超級管理員

---

## 🔧 後端實現

### 1. TypeScript 類型定義

```typescript
// api-worker/src/types.ts

export type UserRole = 'user' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;  // 角色
  createdAt: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;  // JWT 中包含角色
  exp?: number;
}
```

### 2. 角色檢查 Middleware

```typescript
// api-worker/src/middleware/role.ts

// 檢查用戶是否有指定角色
export function requireRole(...allowedRoles: UserRole[]) {
  return async (c: Context, next: Next) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;
    
    if (!allowedRoles.includes(jwtPayload.role)) {
      return c.json({ 
        error: 'Forbidden',
        message: `需要角色: ${allowedRoles.join(' 或 ')}`
      }, 403);
    }

    await next();
  };
}

// 快捷方法
export function requireAdmin() {
  return requireRole('admin', 'superadmin');
}

export function requireSuperAdmin() {
  return requireRole('superadmin');
}
```

### 3. 使用範例

```typescript
// 需要管理員權限的端點
admin.get('/users', requireAdmin(), async (c) => {
  // 只有 admin 和 superadmin 可以訪問
  const users = await c.env.DB.prepare('SELECT * FROM users').all();
  return c.json({ users: users.results });
});

// 需要超級管理員權限的端點
admin.put('/users/:id/role', requireSuperAdmin(), async (c) => {
  // 只有 superadmin 可以訪問
  const { role } = await c.req.json();
  // 更新用戶角色...
});
```

---

## 🌐 API 端點

### 管理員 API (`/api/admin/*`)

#### 獲取所有用戶
```
GET /api/admin/users
Authorization: Bearer <jwt_token>
需要角色: admin, superadmin

回應：
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "user",
      "created_at": 1234567890
    }
  ],
  "total": 10
}
```

#### 更新用戶角色
```
PUT /api/admin/users/:userId/role
Authorization: Bearer <jwt_token>
需要角色: superadmin

請求：
{
  "role": "admin"
}

回應：
{
  "success": true,
  "message": "Role updated"
}
```

#### 系統統計
```
GET /api/admin/stats
Authorization: Bearer <jwt_token>
需要角色: admin, superadmin

回應：
{
  "totalUsers": 100,
  "totalLinks": 5000,
  "usersByRole": [
    { "role": "user", "count": 95 },
    { "role": "admin", "count": 4 },
    { "role": "superadmin", "count": 1 }
  ]
}
```

---

## 🎨 前端實現

### 1. 在 useAuth 中獲取角色

```typescript
// 更新後的 User 類型包含 role
const { user } = useAuth();

// 檢查角色
if (user?.role === 'admin' || user?.role === 'superadmin') {
  // 顯示管理功能
}
```

### 2. 角色權限檢查 Hook

```typescript
// hooks/useRole.ts
export function useRole() {
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';
  
  return { isAdmin, isSuperAdmin, role: user?.role };
}
```

### 3. UI 條件渲染

```typescript
import { useRole } from '../hooks/useRole';

function AdminPanel() {
  const { isAdmin } = useRole();
  
  if (!isAdmin) {
    return null; // 非管理員不顯示
  }
  
  return (
    <div>
      {/* 管理員功能 */}
    </div>
  );
}
```

---

## 🔐 安全考量

### 1. 前端檢查只是 UI 優化

```
前端的角色檢查只是為了：
✅ 隱藏不相關的 UI 元素
✅ 改善用戶體驗

❌ 不能依賴前端檢查來保護 API
✅ 必須在後端嚴格驗證角色
```

### 2. 後端必須驗證所有請求

```typescript
// ❌ 錯誤：只依賴前端檢查
app.delete('/api/admin/users/:id', async (c) => {
  // 沒有角色檢查！任何人都可以調用！
});

// ✅ 正確：後端嚴格驗證
app.delete('/api/admin/users/:id', 
  requireSuperAdmin(),  // ← 必須！
  async (c) => {
    // 處理邏輯
  }
);
```

### 3. JWT Payload 包含角色

```typescript
// Token 中包含角色資訊
const token = await sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role,  // ← 重要！
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30),
  },
  secret,
  'HS256'
);
```

**優點**：
- 每次驗證 token 就能知道用戶角色
- 不需要額外查詢資料庫
- 更快的權限檢查

**注意**：
- 角色變更後，需要用戶重新登入才能生效
- 或實現 token refresh 機制

---

## 👤 設定第一個超級管理員

### 方法 1：直接操作資料庫

```bash
cd api-worker

# 本地開發
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared \
  --command "UPDATE users SET role = 'superadmin' WHERE email = 'your@email.com'"

# 生產環境
wrangler d1 execute oao-to-db --remote \
  --command "UPDATE users SET role = 'superadmin' WHERE email = 'your@email.com'"
```

### 方法 2：Migration 腳本

創建 `migrations/0003_set_initial_superadmin.sql`：
```sql
-- 設定初始超級管理員
UPDATE users 
SET role = 'superadmin' 
WHERE email = 'your@email.com';
```

### 方法 3：環境變數控制

在 auth.ts 中添加：
```typescript
// 檢查是否為預設的超級管理員
const isSuperAdmin = c.env.SUPERADMIN_EMAILS?.split(',').includes(userData.email);

await c.env.DB.prepare(
  'INSERT INTO users (id, email, name, avatar, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
).bind(
  userId,
  userData.email,
  userData.name,
  userData.picture,
  isSuperAdmin ? 'superadmin' : 'user',  // 根據 email 決定
  Date.now()
).run();
```

---

## 🧪 測試角色系統

### 1. 創建測試用戶

```bash
# 登入三個不同的 Google 帳號
user1@example.com    → 自動成為 'user'
admin@example.com    → 手動設為 'admin'
super@example.com    → 手動設為 'superadmin'
```

### 2. 更新角色

```bash
# 設定管理員
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared \
  --command "UPDATE users SET role = 'admin' WHERE email = 'admin@example.com'"

# 設定超級管理員
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared \
  --command "UPDATE users SET role = 'superadmin' WHERE email = 'super@example.com'"
```

### 3. 測試權限

```bash
# 一般用戶嘗試訪問管理員 API（應該返回 403）
curl -H "Authorization: Bearer <user_token>" \
  http://localhost:8788/api/admin/users

# 管理員訪問（應該成功）
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:8788/api/admin/users
```

---

## 📱 前端管理介面（未來擴展）

### Admin Dashboard 頁面

```typescript
// pages/Admin/Users.tsx
export default function AdminUsers() {
  const { isAdmin } = useRole();
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    // 獲取用戶列表
    fetch('http://localhost:8788/api/admin/users', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
    .then(res => res.json())
    .then(data => setUsers(data.users));
  }, [isAdmin]);
  
  return (
    <div>
      <h1>用戶管理</h1>
      <table>
        {/* 用戶列表 */}
      </table>
    </div>
  );
}
```

### 角色徽章組件

```typescript
function RoleBadge({ role }: { role: UserRole }) {
  const colors = {
    user: 'bg-gray-100 text-gray-800',
    admin: 'bg-blue-100 text-blue-800',
    superadmin: 'bg-purple-100 text-purple-800',
  };
  
  const labels = {
    user: '用戶',
    admin: '管理員',
    superadmin: '超級管理員',
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[role]}`}>
      {labels[role]}
    </span>
  );
}
```

---

## 🚀 部署注意事項

### 生產環境 Migration

```bash
cd api-worker

# 執行所有 migrations 到生產環境
wrangler d1 migrations apply oao-to-db --remote

# 確認 migrations 狀態
wrangler d1 migrations list oao-to-db --remote
```

### 設定第一個超級管理員

```bash
# 生產環境
wrangler d1 execute oao-to-db --remote \
  --command "UPDATE users SET role = 'superadmin' WHERE email = 'your@email.com'"

# 驗證
wrangler d1 execute oao-to-db --remote \
  --command "SELECT email, role FROM users WHERE role = 'superadmin'"
```

---

## 📝 未來擴展建議

### 1. 細粒度權限

除了角色之外，可以添加具體權限：
```typescript
interface Permission {
  action: 'create' | 'read' | 'update' | 'delete';
  resource: 'links' | 'users' | 'analytics';
}

interface Role {
  name: UserRole;
  permissions: Permission[];
}
```

### 2. 團隊/組織功能

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER
);

CREATE TABLE organization_members (
  org_id TEXT,
  user_id TEXT,
  role TEXT,  -- owner, admin, member
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3. 審計日誌

記錄角色變更：
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  resource TEXT,
  details TEXT,
  created_at INTEGER
);
```

---

## ✅ 實施檢查清單

### 後端
- [x] Migration 添加 role 欄位
- [x] TypeScript 類型定義更新
- [x] 創建用戶時設定預設 role
- [x] JWT payload 包含 role
- [x] 角色檢查 middleware 實現
- [x] 管理員 API 端點創建

### 前端
- [ ] useRole hook 實現
- [ ] 角色徽章組件
- [ ] Admin Dashboard 頁面
- [ ] 用戶管理介面

### 測試
- [ ] 一般用戶權限測試
- [ ] 管理員權限測試
- [ ] 超級管理員權限測試
- [ ] 403 錯誤處理測試

---

**角色系統已完整實施！** 🎉


