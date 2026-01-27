# 🔒 CORS 配置問題完整解決方案

**問題**：為什麼 Pages 預設網址會變？為什麼需要更新 CORS？  
**創建日期**：2026-01-27

---

## 📋 問題說明

### Cloudflare Pages 的運作機制

每次部署 Pages 時，Cloudflare 會：
1. 基於部署內容生成唯一的哈希值
2. 創建格式為 `https://[hash].project-name.pages.dev` 的預覽網址
3. 這個哈希值每次部署都可能不同

**範例**：
```
2026-01-23: https://63b5ef92.oao-to-app.pages.dev
2026-01-24: https://44e055e8.oao-to-app.pages.dev
2026-01-27: https://6cb6fda4.oao-to-app.pages.dev
```

### 為什麼會改變？

- ✅ **設計目的**：每個部署都有唯一的預覽網址
- ✅ **好處**：
  - 可以查看歷史版本
  - 支援 Preview Deployments
  - 方便回滾
  - 測試新功能不影響主網站

### 為什麼需要更新 CORS？

因為我們的 API Worker 使用**嚴格的 CORS 白名單**：

```typescript
// api-worker/src/index.ts
app.use('*', cors({
  origin: [
    'https://app.oao.to',                          // ✅ Custom Domain（不會變）
    'https://6cb6fda4.oao-to-app.pages.dev',      // ⚠️ Pages 網址（會變）
    'http://localhost:5173',                       // ✅ 本地開發
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

**當前端重新部署時**：
- 舊網址：`https://44e055e8.oao-to-app.pages.dev` ❌ 失效
- 新網址：`https://6cb6fda4.oao-to-app.pages.dev` ⚠️ 不在白名單
- 結果：API 調用被 CORS 阻擋 🚫

---

## 🔧 三種解決方案

### **方案 A：只使用 Custom Domain（推薦）** ⭐

**配置**：
```typescript
// api-worker/src/index.ts
app.use('*', cors({
  origin: [
    'https://app.oao.to',        // ✅ Custom Domain（永遠不變）
    'http://localhost:5173',     // ✅ 本地開發
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

**優點**：
- ✅ 不需要每次更新 CORS
- ✅ 配置簡潔
- ✅ 安全性最高
- ✅ 用戶體驗最好

**缺點**：
- ⚠️ 需要先設定 Custom Domain
- ⚠️ Preview Deployments 無法使用（需要手動測試）

**適用場景**：
- 生產環境標準配置
- 不需要頻繁測試預覽版本
- 已設定 Custom Domain

**設定步驟**：
1. 在 Cloudflare Dashboard 設定 Custom Domain（app.oao.to）
2. 更新 API Worker CORS 配置（移除 Pages 網址）
3. 重新部署 API Worker
4. 前端之後的所有部署都不需要更新 CORS

**結論**：✅ **最推薦的長期方案**

---

### **方案 B：使用正則表達式匹配（中等推薦）**

**配置**：
```typescript
// api-worker/src/index.ts
app.use('*', cors({
  origin: [
    'https://app.oao.to',
    /^https:\/\/[a-f0-9]{8}\.oao-to-app\.pages\.dev$/,  // 正則匹配所有部署
    'http://localhost:5173',
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

**說明**：
- `[a-f0-9]{8}`：匹配 8 位十六進制字符（部署 ID）
- `^` 和 `$`：確保完整匹配
- `\/`：轉義斜線

**優點**：
- ✅ 自動支援所有新部署
- ✅ 支援 Preview Deployments
- ✅ 不需要手動更新

**缺點**：
- ⚠️ 安全性略低（允許所有符合模式的網址）
- ⚠️ 可能被濫用（如果有人猜到模式）
- ⚠️ 依賴 Cloudflare 保持 ID 格式不變

**適用場景**：
- 需要頻繁測試 Preview Deployments
- 團隊協作（多人同時開發）
- 暫時沒有 Custom Domain

**安全考量**：
- Cloudflare Pages 的部署 ID 很難猜測（雖然可預測格式）
- 攻擊者需要知道你的 project name
- 相對風險可控

**結論**：⚠️ **適合開發階段或需要預覽的場景**

---

### **方案 C：每次手動更新（當前方案）**

**流程**：
```bash
# 1. 前端部署
cd frontend
npm run build
npx wrangler pages deploy dist --project-name oao-to-app
# ✨ Success! ... https://6cb6fda4.oao-to-app.pages.dev

# 2. 記下新的部署 ID
NEW_ID="6cb6fda4"

# 3. 更新 API Worker CORS
cd ../api-worker
# 編輯 src/index.ts，更新 Pages 網址
vim src/index.ts  # 或使用其他編輯器

# 4. 重新部署 API Worker
npx wrangler deploy --env production
```

**優點**：
- ✅ 完全控制
- ✅ 安全性最高（明確的白名單）
- ✅ 可以同時保留舊版本（過渡期）

**缺點**：
- ❌ 需要手動操作
- ❌ 容易忘記更新
- ❌ 增加部署步驟
- ❌ 出錯風險高

**適用場景**：
- 臨時方案
- 極度重視安全性
- 部署頻率低

**常見錯誤**：
- 忘記更新 CORS → 前端無法調用 API
- 只部署前端忘記部署 API → CORS 失效
- 複製錯誤的部署 ID → CORS 失效

**結論**：⚠️ **不推薦作為長期方案**

---

## 📊 方案對比

| 特性 | 方案 A（Custom Domain）| 方案 B（正則匹配）| 方案 C（手動更新）|
|------|---------------------|-----------------|-----------------|
| **安全性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **維護成本** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **部署便利性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Preview 支援** | ❌ | ✅ | ✅ |
| **出錯風險** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **推薦度** | ✅ 最推薦 | ⚠️ 中等推薦 | ❌ 不推薦 |

---

## 🎯 推薦配置

### **生產環境（已有 Custom Domain）**

```typescript
// ✅ 推薦配置
app.use('*', cors({
  origin: [
    'https://app.oao.to',        // Custom Domain
    'http://localhost:5173',     // 本地開發
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

### **開發環境（需要 Preview）**

```typescript
// ⚠️ 開發期間配置
app.use('*', cors({
  origin: [
    'https://app.oao.to',
    /^https:\/\/[a-f0-9]{8}\.oao-to-app\.pages\.dev$/,  // 所有 Pages 部署
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

### **混合配置（最佳實踐）**

```typescript
// 🎯 根據環境自動切換
const isProd = process.env.NODE_ENV === 'production';

app.use('*', cors({
  origin: isProd 
    ? [
        'https://app.oao.to',
        'http://localhost:5173',
      ]
    : [
        'https://app.oao.to',
        /^https:\/\/[a-f0-9]{8}\.oao-to-app\.pages\.dev$/,
        'http://localhost:5173',
        'http://localhost:3000',
      ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## 🔄 遷移步驟（從方案 C 到方案 A）

### Step 1: 確認 Custom Domain 已設定

```bash
# 測試 Custom Domain 是否正常工作
curl -I https://app.oao.to
# 預期：HTTP/2 200
```

### Step 2: 更新 API Worker CORS

```typescript
// api-worker/src/index.ts
app.use('*', cors({
  origin: [
    'https://app.oao.to',        // ✅ 只保留這個
    'http://localhost:5173',
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

### Step 3: 重新部署 API Worker

```bash
cd api-worker
npx wrangler deploy --env production
```

### Step 4: 驗證

```bash
# 1. 使用 Custom Domain 測試
curl -X POST https://api.oao.to/shorten \
  -H "Origin: https://app.oao.to" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

# 2. 前端測試
# 訪問 https://app.oao.to，測試所有功能

# 3. 確認無 CORS 錯誤
# 打開瀏覽器 Console，檢查是否有 CORS 錯誤
```

### Step 5: 之後的部署

```bash
# ✅ 前端部署變得超級簡單
cd frontend
npm run build
npx wrangler pages deploy dist --project-name oao-to-app

# ✅ 不需要更新 CORS！
# ✅ 不需要重新部署 API Worker！
```

---

## 📋 常見問題

### Q1: 為什麼不用通配符 `*`？

```typescript
// ❌ 非常不安全
cors({ origin: '*' })
```

**原因**：
- 允許任何網站調用你的 API
- 無法使用 `credentials: true`（cookies、JWT）
- 容易被 CSRF 攻擊
- 不符合安全最佳實踐

### Q2: 本地開發如何測試？

```typescript
// ✅ 保留 localhost
origin: [
  'https://app.oao.to',
  'http://localhost:5173',  // Vite 開發服務器
  'http://localhost:3000',  // 備用端口
]
```

### Q3: Preview Deployments 怎麼辦？

**方案 A（Custom Domain）**：
- Preview 網址無法使用 API
- 需要本地測試或使用方案 B

**方案 B（正則匹配）**：
- 所有 Preview 都可以使用
- 方便團隊協作

### Q4: 舊的 Pages 網址還能訪問嗎？

能！但無法調用 API（如果使用方案 A）。
- 可以查看靜態頁面
- API 調用會被 CORS 阻擋
- 適合查看歷史版本的 UI

---

## 🎯 最終建議

### **立即採用**：方案 A（Custom Domain Only）

**理由**：
1. ✅ 最安全
2. ✅ 最簡單
3. ✅ 最省心（不需要每次更新）
4. ✅ 符合生產環境最佳實踐

**執行**：
```bash
# 1. 確認 Custom Domain 設定完成
curl https://app.oao.to

# 2. 更新 CORS（移除 Pages 網址）
# 編輯 api-worker/src/index.ts

# 3. 部署
cd api-worker
npx wrangler deploy --env production

# 4. 測試
# 訪問 https://app.oao.to，確認所有功能正常

# 5. 享受便利
# 以後前端部署不需要再碰 API Worker！
```

---

## 📚 相關文檔

- [Cloudflare Pages Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [CORS 最佳實踐](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Hono CORS Middleware](https://hono.dev/middleware/builtin/cors)

---

**記住：使用 Custom Domain，省去 CORS 更新的煩惱！** 🎯
