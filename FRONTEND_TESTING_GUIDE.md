# 前端測試完整指南

**日期**: 2026-01-24  
**版本**: 1.0  
**測試範圍**: Dashboard + Admin Portal

---

## 🎯 測試準備

### **1. 確保後端運行**

```bash
# 檢查兩個 Worker 都在運行
curl http://localhost:8787/health  # Core Worker
curl http://localhost:8788/health  # API Worker

# 應該都返回 {"status":"ok"}
```

### **2. 確保已登入**

訪問 `http://localhost:5173` 並登入（Google OAuth）

**測試帳號**：
- joey@cryptoxlab.com (superadmin) ✅ 可訪問所有頁面
- illuminati@cryptoxlab.com (admin) ✅ 可訪問 Admin Portal
- darwin7381987654@gmail.com (user) ❌ 無 Admin 權限

---

## 📋 Dashboard 功能測試

### **1. Dashboard 主頁** (`/dashboard`)

**URL**: `http://localhost:5173/dashboard`

**測試項目**：
- [ ] 顯示連結列表（應該有 22 個）
- [ ] 搜尋功能正常
- [ ] 「Create New」按鈕可以創建連結
- [ ] 每個連結顯示：slug, URL, 創建日期
- [ ] 「Stats」按鈕可以跳轉到分析頁面
- [ ] QR Code 功能正常

**預期結果**：
```
Total Links: 22
用戶: joey@cryptoxlab.com (14 個) + anonymous (8 個)
```

---

### **2. Analytics 頁面** (`/dashboard/analytics/:slug`)

**URL**: `http://localhost:5173/dashboard/analytics/13Wdok`（用實際的 slug）

**測試項目**：
- [ ] 顯示短連結和目標 URL
- [ ] 總點擊數（可能是 0，因為 AE 數據需要時間）
- [ ] 國家分佈圖表
- [ ] 設備類型分佈
- [ ] 時間趨勢圖
- [ ] 編輯按鈕可以修改 title/description/image
- [ ] 「Back to Dashboard」按鈕正常

---

### **3. API Keys 頁面** (`/dashboard/api-keys`)

**URL**: `http://localhost:5173/dashboard/api-keys`

**測試項目**：
- [ ] 顯示現有 API Keys（應該有 4 個）
- [ ] 「Create New Key」可以創建
- [ ] 顯示 Key Prefix（oao_live_xxx）
- [ ] 顯示 Scopes
- [ ] 顯示 Total Requests
- [ ] 「Revoke」/ 「Delete」功能正常
- [ ] 創建後顯示完整 Key（只一次）

**預期結果**：
```
4 個 API Keys
3 個 Active, 1 個 Revoked
Owner: joey@cryptoxlab.com
```

---

### **4. Credits & Usage 頁面** (`/dashboard/credits`)

**URL**: `http://localhost:5173/dashboard/credits`

**測試項目**：
- [ ] 顯示總餘額（100 credits）
- [ ] 顯示 Subscription / Purchased 分解
- [ ] 顯示當前方案（Free）
- [ ] 顯示月配額使用進度
- [ ] 交易記錄列表
- [ ] 「Top Up Credits」按鈕

**預期結果**：
```
Total Balance: 100
Subscription: 0
Purchased: 100
Plan: Free
```

---

### **5. Settings 頁面** (`/dashboard/settings`)

**URL**: `http://localhost:5173/dashboard/settings`

**測試項目**：
- [ ] 顯示用戶資料（名稱、Email、頭像）
- [ ] Google 認證標識
- [ ] 通知設定（toggles）
- [ ] Save 按鈕正常

---

### **6. API Documentation** (`/dashboard/api-docs`)

**URL**: `http://localhost:5173/dashboard/api-docs`

**測試項目**：
- [ ] 側邊欄導航正常
- [ ] 顯示 API 端點列表
- [ ] 程式碼範例可複製
- [ ] Rate Limits 說明清楚

---

## 🛡️ Admin Portal 測試

### **前置條件**：

**必須使用 Admin 帳號登入！**
- joey@cryptoxlab.com (superadmin) ✅
- illuminati@cryptoxlab.com (admin) ✅

### **進入 Admin Portal**：

1. 點擊右上角的用戶選單
2. 應該看到「🛡️ Administrator」區塊
3. 點擊「Admin Panel」
4. 自動跳轉到 `/admin/analytics`

---

### **1. Analytics Dashboard** (`/admin/analytics`)

**URL**: `http://localhost:5173/admin/analytics`

**測試項目**：
- [ ] 頂部顯示「🛡️ Administrator Mode」標識
- [ ] 側邊欄顯示 8 個 Admin 導航
- [ ] 藍色主題（vs Dashboard 的橘色）
- [ ] 用戶增長折線圖
- [ ] 收入趨勢柱狀圖
- [ ] Top 5 Users 列表
- [ ] Top 5 Links 列表
- [ ] 地理分佈圖
- [ ] 時間範圍切換（7d / 30d / 90d）

**預期結果**：
```
用戶增長圖：顯示 3 個用戶的創建時間
Top Users：目前為空（因為 D1 links = 0）
```

---

### **2. Links Management** (`/admin/links`)

**URL**: `http://localhost:5173/admin/links`

**重要測試** ⭐

**測試項目**：
- [ ] 顯示 **22 個連結**
- [ ] 統計卡片：Total Links: 22, Active: 22, Flagged: 0
- [ ] 連結列表顯示：slug, URL, user email, clicks
- [ ] 搜尋功能（by slug, URL, email）
- [ ] 過濾功能（All / Active / Flagged / Inactive）
- [ ] 「View Details」按鈕
- [ ] 「Flag」按鈕（標記違規）
- [ ] 「Delete」按鈕
- [ ] Export 按鈕

**預期結果**：
```
Total: 22 links
Users: joey@cryptoxlab.com (14), anonymous (8)
Clicks: 0（AE 數據可能需要時間）
```

---

### **3. API Keys Monitoring** (`/admin/api-keys`)

**URL**: `http://localhost:5173/admin/api-keys`

**測試項目**：
- [ ] 顯示 **4 個 API Keys**
- [ ] 統計卡片：Total: 4, Today's Requests: xxx
- [ ] Keys 列表顯示：User, Key Name, Prefix
- [ ] 顯示 Requests（Total / Today）
- [ ] 顯示 Rate Limit Hits
- [ ] 顯示 Error Rate（高錯誤率標紅）
- [ ] 「Details」按鈕
- [ ] 「Revoke」按鈕（強制撤銷）

**預期結果**：
```
4 Keys
Owner: joey@cryptoxlab.com
1 個有請求記錄（total_requests: 2）
```

---

### **4. User Management** (`/admin/users`)

**URL**: `http://localhost:5173/admin/users`

**測試項目**：
- [ ] 顯示 **3 個用戶**
- [ ] 顯示：Email, Name, Role, Avatar
- [ ] 角色標籤（superadmin, admin, user）
- [ ] 創建日期
- [ ] 修改角色功能（superadmin only）

**預期結果**：
```
3 Users
1 superadmin, 1 admin, 1 user
```

---

### **5. Payments Management** (`/admin/payments`)

**URL**: `http://localhost:5173/admin/payments`

**測試項目**：
- [ ] 統計卡片顯示
- [ ] Payments 列表（目前為空）
- [ ] 搜尋功能
- [ ] 狀態過濾（All / Completed / Pending / Failed / Refunded）
- [ ] Export 按鈕

**預期結果**：
```
目前無付款記錄（空列表）
```

---

### **6. Credits Management** (`/admin/credits`)

**URL**: `http://localhost:5173/admin/credits`

**測試項目**：
- [ ] 總 Credits 統計（應該是 300）
- [ ] 用戶列表（3 個用戶）
- [ ] 每個用戶顯示：Total / Subscription / Purchased
- [ ] 搜尋功能
- [ ] 「Adjust」按鈕
- [ ] 彈出視窗可以 Add / Deduct credits
- [ ] 需要填寫 Reason
- [ ] Recent Adjustments 列表

**預期結果**：
```
3 Users, 300 Total Credits
每人 100 (Subscription: 0, Purchased: 100)
```

---

### **7. System Stats** (`/admin/stats`)

**URL**: `http://localhost:5173/admin/stats`

**測試項目**：
- [ ] 統計卡片：Users, Links, Revenue, API Requests
- [ ] User Growth 詳情
- [ ] Credits Overview
- [ ] System Health 指標

**預期結果**：
```
Total Users: 3
Total Links: 22 (從 KV)
System Health: Operational
```

---

### **8. System Settings** (`/admin/settings`)

**URL**: `http://localhost:5173/admin/settings`

**測試項目**：
- [ ] General Settings（Platform Name, Support Email）
- [ ] Security Policies（2FA, Session Timeout, IP Whitelist）
- [ ] Email Gateway 設定
- [ ] API Configuration
- [ ] Save 按鈕

---

## 🔍 如何測試

### **快速測試流程**：

```bash
# 1. 確保後端運行
curl http://localhost:8788/health

# 2. 打開瀏覽器
open http://localhost:5173

# 3. 登入（使用 joey@cryptoxlab.com）

# 4. 測試 Dashboard 功能
→ /dashboard - 查看連結列表
→ /dashboard/api-keys - 查看 API Keys
→ /dashboard/credits - 查看 Credits

# 5. 進入 Admin Portal
→ 點擊用戶選單
→ 點擊「Admin Panel」
→ 自動跳轉到 /admin/analytics

# 6. 測試所有 Admin 頁面
→ 使用側邊欄切換各頁面
→ 確認數據正確顯示
→ 測試各種操作（搜尋、過濾、操作按鈕）
```

---

## ⚠️ 已知問題

### **1. Analytics Engine 延遲**

**症狀**: Clicks 數據顯示為 0  
**原因**: Analytics Engine 有 1-10 分鐘寫入延遲  
**解決**: 正常現象，等待或實際點擊短連結產生數據

### **2. D1 Links 為 0**

**症狀**: Admin Stats 顯示 0 links  
**原因**: D1 被清空重置，但 KV 有數據  
**影響**: 不影響功能（Admin Links 從 KV 讀取）  
**解決**: 可選 - 未來 Cron 自動同步

---

## ✅ 測試檢查清單

### **Dashboard 功能** (6 頁)
- [ ] Dashboard - 連結列表
- [ ] Analytics - 分析圖表
- [ ] API Keys - Keys 管理
- [ ] Credits - 餘額查詢
- [ ] Settings - 用戶設定
- [ ] API Docs - 文檔

### **Admin Portal** (8 頁)
- [ ] Analytics - 總覽儀表板
- [ ] Links - 連結管理（22 個）
- [ ] API Keys - Keys 監控（4 個）
- [ ] Users - 用戶管理（3 個）
- [ ] Payments - 付款記錄
- [ ] Credits - Credits 管理
- [ ] Stats - 系統統計
- [ ] Settings - 系統設定

### **導航與 UX**
- [ ] 側邊欄摺疊功能
- [ ] 響應式設計（桌面/移動）
- [ ] Dashboard ↔ Admin 切換流暢
- [ ] 「Back to Dashboard」按鈕正常
- [ ] 所有頁面的 Loading 狀態
- [ ] 錯誤處理（API 失敗時的顯示）

---

## 🎨 視覺驗證

### **配色主題**

**Dashboard**：
- 主色：橘色/粉色
- 背景：淺橘色漸層
- 卡片：白色/半透明

**Admin Portal**：
- 主色：藍色/靛藍
- 背景：淺藍色漸層
- 卡片：白色/半透明
- 頂部：「🛡️ Administrator Mode」標識

### **側邊欄**

**Dashboard**：
- Logo: 橘色 "O"
- 5 個導航項目
- 底部：Credits 卡片

**Admin Portal**：
- Logo: 藍色盾牌 + "Admin Panel"
- 8 個導航項目
- 頂部：「Back to Dashboard」
- 底部：Administrator 徽章

---

## 🐛 常見問題排查

### **問題 1: 看不到 Admin Panel 入口**

**原因**: 帳號沒有 Admin 權限  
**解決**: 
```bash
# 檢查當前用戶角色
curl http://localhost:8788/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# 如果需要，手動設定為 admin
cd api-worker
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared \
  --command "UPDATE users SET role = 'admin' WHERE email = 'your@email.com'"
```

---

### **問題 2: Admin 頁面顯示空數據**

**原因**: API 返回空陣列或 404  
**檢查**:
```bash
# 1. 確認後端 API 正常
curl http://localhost:8788/api/admin/links \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# 2. 檢查瀏覽器 Console 錯誤
# 3. 檢查 Network tab 的 API 請求
```

---

### **問題 3: Clicks 顯示為 0**

**原因**: Analytics Engine 數據延遲或無點擊記錄  
**解決**: 
```bash
# 實際訪問短連結產生點擊
curl http://localhost:8787/13Wdok -L

# 等待 1-10 分鐘後重新載入頁面
```

---

## 📊 測試數據預期值

### **已知的系統數據**：

```javascript
{
  users: 3,
  roles: {
    superadmin: 1,  // joey@cryptoxlab.com
    admin: 1,       // illuminati@cryptoxlab.com
    user: 1         // darwin7381987654@gmail.com
  },
  
  links: 22,
  linkOwners: {
    "joey@cryptoxlab.com": 14,
    "anonymous": 8
  },
  
  apiKeys: 4,
  activeKeys: 3,
  
  credits: {
    total: 300,
    perUser: 100,
    plan: "free"
  }
}
```

---

## 🎯 重點測試頁面

### **最重要的 3 個頁面**：

1. **`/admin/links`** ⭐⭐⭐
   - 核心功能
   - 應該顯示 22 個連結
   - 測試所有操作（查看、搜尋、標記、刪除）

2. **`/admin/api-keys`** ⭐⭐
   - 監控 API 使用
   - 應該顯示 4 個 keys
   - 測試 Revoke 功能

3. **`/dashboard/api-keys`** ⭐⭐
   - 一般用戶功能
   - 測試創建新 Key
   - 測試完整 Key 只顯示一次

---

## 📝 測試報告模板

```markdown
## Frontend 測試報告

**測試日期**: 2026-01-24
**測試者**: [你的名字]
**瀏覽器**: Chrome/Safari/Firefox

### Dashboard 功能
- [ ] ✅/❌ Dashboard 主頁
- [ ] ✅/❌ Analytics
- [ ] ✅/❌ API Keys
- [ ] ✅/❌ Credits
- [ ] ✅/❌ Settings
- [ ] ✅/❌ API Docs

### Admin Portal
- [ ] ✅/❌ Analytics Dashboard
- [ ] ✅/❌ Links Management (22 links?)
- [ ] ✅/❌ API Keys Monitor (4 keys?)
- [ ] ✅/❌ User Management (3 users?)
- [ ] ✅/❌ Payments
- [ ] ✅/❌ Credits Management
- [ ] ✅/❌ System Stats
- [ ] ✅/❌ Settings

### 發現的問題
1. [描述問題]
2. [描述問題]

### 總結
- 測試通過: __/14
- 成功率: __%
```

---

**開始測試！** 🚀
