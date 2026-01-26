# 前端 API Client 架構規範

**適用範圍**: 所有專案  
**優先級**: P0（強制遵守）  
**違反後果**: 導致錯誤處理不一致、維護困難、bug 頻發

---

## 🎯 核心原則

**永遠不要在組件中直接使用 fetch**

---

## ❌ 錯誤做法（禁止）

```typescript
// ❌ 在組件中直接 fetch
export default function MyComponent() {
  const { token } = useAuth();
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetch(`${apiUrl}/api/something`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setData(data));
  }, []);
  
  // 問題：
  // 1. 沒有錯誤處理
  // 2. 沒有 loading 狀態
  // 3. token 管理分散
  // 4. response 格式不統一
  // 5. 難以測試
  // 6. 難以維護
}
```

---

## ✅ 正確做法（強制）

### **架構**：

```
src/
├── lib/
│   ├── api.ts          # 一般用戶 API client
│   └── adminApi.ts     # Admin API client（如果需要）
├── pages/
│   ├── dashboard/
│   │   └── *.tsx       # 使用 api.ts
│   └── admin/
│       └── *.tsx       # 使用 adminApi.ts
```

### **實現**：

```typescript
// lib/api.ts
class API {
  private getToken() {
    return localStorage.getItem('token');
  }

  private async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // 所有 API 方法
  async getLinks() { return this.request('/links'); }
  async createLink(data) { return this.request('/links', { method: 'POST', body: JSON.stringify(data) }); }
  // ... 更多方法
}

export const api = new API();
```

### **使用**：

```typescript
// 組件中使用
import { api } from '../lib/api';

export default function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await api.getLinks();  // ✅ 統一的 API 調用
        setData(result.links);
      } catch (err) {
        setError(err.message);  // ✅ 統一的錯誤處理
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);
  
  if (loading) return <Loading />;
  if (error) return <Error message={error} />;
  if (!data) return <Empty />;
  
  return <DataDisplay data={data} />;
}
```

---

## 📊 兩種模式對比

| 特性 | 直接 fetch | API Client |
|------|-----------|-----------|
| **Token 管理** | 每個組件重複 | 統一管理 ✅ |
| **錯誤處理** | 每個組件不同 | 統一處理 ✅ |
| **Loading 狀態** | 容易遺漏 | 統一模式 ✅ |
| **Response 驗證** | 沒有 | 統一驗證 ✅ |
| **測試** | 難 | 易（Mock API）✅ |
| **維護** | 難（散落各處）| 易（集中管理）✅ |
| **重構** | 難 | 易 ✅ |
| **Bug 追蹤** | 難 | 易 ✅ |

---

## 🚨 為什麼這次違反了規範

### **OAO.TO 專案的情況**：

**Dashboard** (正確)：
- ✅ 使用 `lib/api.ts`
- ✅ 所有頁面一致

**Admin Portal** (錯誤)：
- ❌ 直接使用 fetch（10個頁面，17次調用）
- ❌ 每頁重複 token 處理
- ❌ 沒有統一錯誤處理

### **為什麼會犯錯**：

1. **時間壓力** - 快速開發時忽略規範
2. **複製貼上** - 從第一個錯誤頁面複製到其他頁面
3. **沒有 Code Review** - 沒有檢查是否遵循規範

---

## ✅ 立即修正方案

### **創建 adminApi.ts**：

```typescript
// lib/adminApi.ts
import { api } from './api';

class AdminAPI {
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:8788/api/admin${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      ...options
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error);
    }
    
    return res.json();
  }

  // Admin APIs
  async getLinks() { return this.request('/links'); }
  async getPlans() { return this.request('/plans'); }
  async updatePlan(id: string, data: any) { 
    return this.request(`/plans/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }); 
  }
  async adjustCredits(userId: string, type: string, amount: number, reason: string) {
    return this.request('/credits/adjust', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, type, amount, reason })
    });
  }
  // ... 所有 Admin API
}

export const adminApi = new AdminAPI();
```

### **重構所有 Admin 頁面**：

```typescript
// 從
fetch(`${apiUrl}/api/admin/plans`, { headers: ... })

// 改為
adminApi.getPlans()
```

---

## 📋 規範檢查清單

開發任何新頁面前必須確認：

- [ ] 是否使用統一的 API client？
- [ ] 是否有完整的 TypeScript interface？
- [ ] 是否有 loading/error/empty 狀態？
- [ ] 是否有統一的錯誤處理？
- [ ] 是否遵循專案的代碼模式？

---

## 🎓 教訓

**本次專案教訓**：
- 開發 Admin Portal 時沒有遵循 Dashboard 的模式
- 導致 10 個頁面都有同樣的問題
- 花費大量時間修補

**未來預防**：
- ✅ 所有 API 調用必須通過統一 client
- ✅ 開發前先檢查是否有既有模式
- ✅ 第一個頁面做對，其他頁面複製
- ✅ Code Review 檢查規範遵守

---

**違反此規範 = 技術債務 = 未來的痛苦**
