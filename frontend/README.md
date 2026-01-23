# OAO.TO Frontend

基於 React + Vite + TailwindCSS 的短網址服務前端。

## 🚀 快速開始

```bash
cd frontend
npm install
npm run dev
```

訪問 `http://localhost:5173`

## 📦 部署到 Cloudflare Pages

```bash
npm run deploy
```

## 🛠️ 技術棧

- React 18
- React Router 6
- Vite
- TailwindCSS
- Recharts (圖表)
- TypeScript

## 📁 專案結構

```
frontend/
├── src/
│   ├── pages/         # 頁面組件
│   │   ├── Home.tsx           # 首頁
│   │   ├── Dashboard.tsx      # 儀表板
│   │   ├── Analytics.tsx      # 分析頁面
│   │   └── AuthCallback.tsx   # OAuth 回調
│   ├── components/    # 通用組件
│   ├── lib/
│   │   └── api.ts     # API 客戶端
│   ├── hooks/
│   │   └── useAuth.ts # 認證 Hook
│   └── main.tsx       # 入口
└── index.html
```

## 🎨 功能

- ✅ Google OAuth 登入
- ✅ 創建/編輯/刪除短網址
- ✅ 詳細分析儀表板
- ✅ 響應式設計
- ✅ 複製短網址
- ✅ 圖表視覺化


