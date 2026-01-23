# 修復 Admin 訪問問題

**問題**: Superadmin 無法訪問 `/admin/users`  
**原因**: 前端的 token 或 user 資料過時

---

## 🔧 立即修復（在瀏覽器 Console 執行）

### 方案 1: 更新 Token 並重新載入

```javascript
// 1. 設置正確的 token
localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4OWE5ODJiZS05OGU5LTQ1NmMtYmY1OS01NWRhM2JmYmIzODAiLCJlbWFpbCI6ImpvZXlAY3J5cHRveGxhYi5jb20iLCJyb2xlIjoic3VwZXJhZG1pbiIsImV4cCI6MTc3MTc1MDg0Mn0.T5G4e1noli3N8T--j7qff_44-sQ5maMFwucseuXlRF8');

// 2. 刷新頁面
location.reload();

// 3. 刷新後，再次訪問
// http://localhost:5173/admin/users
```

### 方案 2: 清除所有資料並重新登入（推薦）

```javascript
// 1. 清除所有本地資料
localStorage.clear();

// 2. 刷新頁面
location.reload();

// 3. 重新登入
// 點擊 "Sign in with Google"
```

---

## 🔍 驗證步驟

### 1. 檢查 Token

在 Console 執行：
```javascript
const token = localStorage.getItem('token');
console.log('Token:', token);

// 解析 token payload
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Role:', payload.role);
  console.log('Expires:', new Date(payload.exp * 1000));
}
```

應該看到：
```
Role: "superadmin"
Expires: 2026-02-22... (未過期)
```

### 2. 檢查 User 資料

```javascript
// 觸發重新獲取
window.location.reload();

// 檢查 localStorage
console.log('User in state:', localStorage.getItem('user'));
```

---

## 🎯 根本原因分析

### 問題追蹤

```
前端權限檢查流程:
1. AdminRoute 組件檢查 isAdmin
   ↓
2. useRole() 讀取 user.role
   ↓
3. useAuth() 從 API 獲取 user
   ↓
4. API /auth/me 返回 user (包含 role) ✅
   ↓
5. 問題: localStorage 中的 token 不包含 role
   或者 user 資料沒有正確設置
```

### 為什麼會發生

可能的原因：
1. Token 是舊的（在 role 系統實現之前簽發的）
2. Token 簽名用了不同的 JWT_SECRET
3. User 資料沒有正確從 API 更新

---

## ✅ 驗證修復成功

執行修復後，測試：

1. **訪問 Admin 頁面**
   ```
   http://localhost:5173/admin/users
   ```
   
   應該看到：
   - ✅ 不會跳轉
   - ✅ 顯示用戶列表（3 個用戶）

2. **檢查用戶選單**
   
   應該看到：
   - ✅ ADMIN 區塊出現
   - ✅ User Management 連結
   - ✅ System Stats 連結

---

## 🐛 Debug 模式

如果還是失敗，在 Console 執行：

```javascript
// 檢查完整狀態
console.log('=== Debug Info ===');
console.log('Token:', localStorage.getItem('token'));
console.log('Token length:', localStorage.getItem('token')?.length);

// 解析 token
const token = localStorage.getItem('token');
if (token) {
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    console.log('Payload:', payload);
    console.log('Role:', payload.role);
    console.log('Expires:', new Date(payload.exp * 1000));
    console.log('Expired?', Date.now() > payload.exp * 1000);
  } catch (e) {
    console.error('Invalid token:', e);
  }
}

// 檢查 useAuth
import { useAuth } from './hooks/useAuth';
// 在 React DevTools 中查看 user 物件
```

---

## 📝 長期解決方案

### 在部署時實施

1. **強制重新登入**
```javascript
// 在 AuthCallback.tsx 中
useEffect(() => {
  // 清除舊 token
  localStorage.clear();
  
  // 從 URL 獲取新 token
  const urlToken = new URLSearchParams(window.location.search).get('token');
  if (urlToken) {
    localStorage.setItem('token', urlToken);
  }
}, []);
```

2. **Token 版本控制**
```javascript
// 在 JWT payload 中加入版本
{
  userId: "...",
  email: "...",
  role: "...",
  tokenVersion: 2,  // ← 新增
  exp: ...
}

// 前端檢查版本
const payload = JSON.parse(atob(token.split('.')[1]));
if (payload.tokenVersion < 2) {
  // 舊 token，強制重新登入
  logout();
}
```

---

**現在請在瀏覽器執行方案 1 或方案 2，應該就能解決問題！**


