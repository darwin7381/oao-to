# OAO.TO Backend

基於 Cloudflare Workers + Hono 的短網址服務後端。

## 🚀 快速開始

### 1. 安裝依賴

```bash
cd backend
npm install
```

### 2. 創建 Cloudflare 資源

#### 創建 KV Namespace（短網址存儲）

```bash
npx wrangler kv:namespace create LINKS
```

複製輸出的 `id`，替換 `wrangler.toml` 中的 `REPLACE_WITH_YOUR_KV_ID`

#### 創建 D1 Database（用戶資料）

```bash
npx wrangler d1 create oao-to-db
```

複製輸出的 `database_id`，替換 `wrangler.toml` 中的 `REPLACE_WITH_YOUR_D1_ID`

#### 初始化 D1 Schema

```bash
npx wrangler d1 execute oao-to-db --file=./schema.sql
```

### 3. 配置環境變數

```bash
cp .dev.vars.example .dev.vars
```

編輯 `.dev.vars`，填入：
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID
- `CLOUDFLARE_API_TOKEN`: Analytics Engine API Token
- `JWT_SECRET`: 任意安全字串
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret

### 4. 本地開發

```bash
npm run dev
```

訪問 `http://localhost:8787`

### 5. 部署

```bash
npm run deploy
```

## 📁 專案結構

```
backend/
├── src/
│   ├── index.ts           # 主入口，核心重定向邏輯
│   ├── types.ts           # TypeScript 型別定義
│   ├── routes/
│   │   ├── auth.ts        # Google OAuth 認證
│   │   ├── links.ts       # 短網址 CRUD
│   │   └── analytics.ts   # 分析 API
│   ├── middleware/
│   │   └── auth.ts        # JWT 認證中介層
│   └── utils/
│       └── analytics.ts   # Analytics Engine 工具
├── wrangler.toml          # Cloudflare Workers 配置
├── schema.sql             # D1 資料庫 Schema
└── package.json
```

## 🔑 API 端點

### 認證

- `GET /api/auth/google` - 開始 Google OAuth 流程
- `GET /api/auth/google/callback` - OAuth 回調
- `GET /api/auth/me` - 獲取當前用戶資訊

### 短網址

- `POST /api/links` - 創建短網址
- `GET /api/links` - 獲取用戶的所有短網址
- `GET /api/links/:slug` - 獲取短網址詳情
- `PUT /api/links/:slug` - 更新短網址
- `DELETE /api/links/:slug` - 刪除短網址

### 分析

- `GET /api/analytics/:slug` - 獲取短網址分析數據
- `GET /api/analytics/summary/all` - 獲取所有鏈接統計摘要

### 核心功能

- `GET /:slug` - 短網址重定向（核心功能）

## 🔧 技術細節

### 性能優化

- 短網址重定向直接從 Workers KV 讀取（< 5ms）
- Analytics 追蹤在背景執行（不阻塞重定向）
- JWT 認證使用 Hono 內建中介層

### 安全性

- 所有 API 端點都需要 JWT 認證
- CORS 配置限制允許的域名
- SQL 查詢使用 prepared statements

## 📊 數據流

```
用戶訪問短網址
    ↓
Workers 收到請求
    ↓
KV.get(slug) → 獲取目標網址
    ↓
301 重定向（< 10ms）
    ↓
(背景) 寫入 Analytics Engine
```

