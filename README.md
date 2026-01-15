# OAO.TO - 專業短網址服務

**版本**：V1.0  
**狀態**：✅ 開發完成，準備部署  
**架構**：微服務（3 層分離）  

---

## ✨ 特色

- ⚡ **極速**：< 10ms 全球重定向延遲
- 📊 **詳細分析**：追蹤點擊、地理位置、設備類型
- 🔒 **安全可靠**：Google OAuth、99.99% 可用性
- 💰 **成本極低**：$39/月支撐百萬次訪問
- 🎲 **智慧生成**：預設隨機，可選自訂
- 🌍 **全球分散**：Cloudflare 300+ 節點

---

## 🏗️ 架構

```
oao.to          → Core Worker (短網址重定向)
api.oao.to      → API Worker (業務邏輯)
app.oao.to      → Frontend Pages (管理介面)
```

**完整說明**：[FINAL_ARCHITECTURE.md](./FINAL_ARCHITECTURE.md)

---

## 🚀 快速開始

### **本地開發**

```bash
# Terminal 1: Core Worker
cd core-worker
wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared

# Terminal 2: API Worker
cd api-worker
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared

# Terminal 3: Frontend
cd frontend
npm run dev

# 訪問: http://localhost:5173
```

**詳細說明**：[START_DEV.md](./START_DEV.md)

---

## 📚 文檔導航

### **🎯 核心文檔（必讀）**

| 文檔 | 用途 | 何時閱讀 |
|------|------|---------|
| **[FINAL_ARCHITECTURE.md](./FINAL_ARCHITECTURE.md)** | 完整架構設計 | 了解系統設計 |
| **[START_DEV.md](./START_DEV.md)** | 本地開發啟動 | 每次開發前 |
| **[LOCAL_VS_PRODUCTION.md](./LOCAL_VS_PRODUCTION.md)** | 環境差異對比 | 準備部署前 |

### **📖 參考文檔**

| 文檔 | 用途 |
|------|------|
| **[PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md](./PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md)** | 🌟 完整部署實戰指南（含所有坑與解決方案）|
| **[MULTI_WORKER_DEVELOPMENT_GUIDE.md](./MULTI_WORKER_DEVELOPMENT_GUIDE.md)** | 多 Worker 開發完整歷程 |
| **[D1_AND_MIGRATIONS_GUIDE.md](./D1_AND_MIGRATIONS_GUIDE.md)** | D1 資料庫與 Migration |
| **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** | 部署指南（基礎）|
| **[GOOGLE_LOGIN_SETUP.md](./GOOGLE_LOGIN_SETUP.md)** | Google OAuth 登入設定 |
| **[USER_ROLES_SYSTEM.md](./USER_ROLES_SYSTEM.md)** | 用戶角色權限系統 |
| **[ENV_VARS_BEST_PRACTICES.md](./ENV_VARS_BEST_PRACTICES.md)** | 環境變數最佳實踐 |

---

## 🛠️ 技術棧

**後端**：Cloudflare Workers + Hono + TypeScript  
**數據**：Workers KV + D1 Database + Analytics Engine  
**前端**：React 18 + Vite + TailwindCSS + Recharts  

---

## 📁 專案結構

```
oao_to/
├── core-worker/        # oao.to - 核心轉址
├── api-worker/         # api.oao.to - API 服務
├── frontend/           # app.oao.to - 前端
├── shorty-dot-dev/     # Cloudflare 官方範例
└── docs/               # 文檔
    ├── FINAL_ARCHITECTURE.md
    ├── START_DEV.md
    └── ...
```

---

## 💡 重要提醒

### **Analytics Engine 本地限制**

根據 Cloudflare 官方範例（shorty.dev）：
> Analytics Engine **在本地開發時不完整工作**

- ✅ 可以調用 `writeDataPoint()`
- ⚠️ 但數據可能不會真正存儲
- ⚠️ SQL 查詢可能返回空結果
- ✅ **需要在生產環境測試真實 Analytics**

### **本地測試範圍**

```
✅ 本地可測試：
- 短網址創建
- 短網址重定向
- KV 讀寫
- D1 查詢
- 前端 UI

⏭️ 生產測試：
- Analytics Engine 真實數據
- 全球分散式性能
- SSL 證書
```

---

## 📊 快速命令

```bash
# 本地開發（詳見 START_DEV.md）
cd core-worker && wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared
cd api-worker && wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared
cd frontend && npm run dev

# 部署（詳見 DEPLOYMENT_GUIDE.md）
cd core-worker && wrangler deploy -e production
cd api-worker && wrangler deploy -e production
cd frontend && npm run build && wrangler pages deploy dist

# 測試
curl http://localhost:8787/health  # Core Worker
curl http://localhost:8788/health  # API Worker
open http://localhost:5173         # Frontend
```

---

## 🎯 生產環境

**已部署**：
- ✅ Core Worker: https://oao.to
- ✅ API Worker: https://api.oao.to
- ✅ Frontend: https://28ad8abb.oao-to-app.pages.dev
- ⏳ Custom Domain（Frontend）: app.oao.to（需手動設定）

**功能狀態**：
- ✅ 短網址創建與重定向
- ✅ Google OAuth 登入
- ✅ 用戶角色系統
- ✅ 分析功能（生產環境數據累積中）
- ✅ 管理儀表板

**詳細部署文檔**：[PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md](./PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md)

---

**Made with ❤️ using Cloudflare Developer Platform**
