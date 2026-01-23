# API 平台測試指南

**日期**：2026-01-23  
**狀態**：✅ 所有核心功能已實現並可測試

---

## 📋 已完成功能

### 後端 ✅
- [x] API Keys 資料表
- [x] Credits 資料表（混合池設計）
- [x] API Key 生成與驗證
- [x] KV Cache 優化
- [x] 固定窗口 Rate Limiting
- [x] Credit 扣除邏輯（混合制）
- [x] Analytics Engine 整合
- [x] V1 API 端點（/v1/links）

### 前端 ✅
- [x] API Keys 管理頁面
- [x] Credits 查詢頁面
- [x] 路由整合

---

## 🧪 測試步驟

### 1. 啟動開發環境

```bash
# Terminal 1: 啟動後端
cd /Users/you/Development/media/oao_to/api-worker
npm run dev
# 應該運行在 http://localhost:8788

# Terminal 2: 啟動前端
cd /Users/you/Development/media/oao_to/frontend
npm run dev
# 應該運行在 http://localhost:5173
```

---

### 2. 測試用戶登入

1. 開啟瀏覽器：http://localhost:5173
2. 點擊「Sign in with Google」
3. 完成 OAuth 登入流程

**預期結果**：
- ✅ 登入成功，跳轉到 Dashboard
- ✅ 自動創建 credits 記錄（初始 100 credits）
- ✅ 記錄歡迎獎勵交易

---

### 3. 測試 API Key 創建

#### 3.1 通過前端創建

1. 訪問：http://localhost:5173/api-keys
2. 點擊「Create API Key」
3. 填寫：
   - Name: `My Test Key`
   - Environment: `Test`
   - Scopes: 勾選 `links:read` 和 `links:write`
4. 點擊「Create」

**預期結果**：
- ✅ 顯示完整 API Key（格式：`oao_test_...`）
- ✅ 警告提示「只顯示一次」
- ✅ API Key 列表中出現新的 Key

#### 3.2 通過 API 創建

```bash
# 獲取你的 JWT Token（從瀏覽器開發者工具 localStorage 取得）
TOKEN="eyJhbGciOiJIUzI1NiIs..." # 替換成你的 token

curl -X POST http://localhost:8788/api/account/keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "scopes": ["links:read", "links:write"],
    "environment": "live"
  }'
```

**預期回應**：
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Production API Key",
    "key": "oao_live_abc123...",
    "keyPrefix": "oao_live_",
    "scopes": ["links:read", "links:write"],
    "createdAt": 1706025600000
  },
  "warning": "⚠️ Please save this API key securely..."
}
```

---

### 4. 測試 API Key 驗證

```bash
# 使用你創建的 API Key
API_KEY="oao_test_..." # 替換成你的 API Key

# 測試驗證
curl -X POST http://localhost:8788/v1/links \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.google.com"
  }'
```

**預期回應**（成功）：
```json
{
  "success": true,
  "data": {
    "slug": "abc123",
    "url": "https://www.google.com",
    "shortUrl": "https://oao.to/abc123",
    "createdAt": 1706025600000
  },
  "credits": {
    "cost": 1,
    "balanceAfter": 99
  }
}
```

**檢查 Response Headers**：
```
X-RateLimit-Limit-Minute: 10
X-RateLimit-Remaining-Minute: 9
X-RateLimit-Reset-Minute: 1706025660
X-RateLimit-Limit-Day: 1000
X-RateLimit-Remaining-Day: 999
X-RateLimit-Reset-Day: 1706112000
```

---

### 5. 測試 Rate Limiting

```bash
# 快速發送多次請求（超過每分鐘限制）
for i in {1..15}; do
  curl -X POST http://localhost:8788/v1/links \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"https://example.com/test$i\"}"
  echo ""
  sleep 0.1
done
```

**預期結果**：
- ✅ 前 10 次成功（免費用戶限制 10/分鐘）
- ✅ 第 11 次開始返回 429 錯誤

**429 錯誤回應**：
```json
{
  "error": "Rate limit exceeded",
  "message": "Rate limit exceeded: 10 requests per minute",
  "retryAfter": "1706025660"
}
```

---

### 6. 測試 Credit 扣除

#### 6.1 查看初始餘額

```bash
curl http://localhost:8788/api/account/credits \
  -H "Authorization: Bearer $TOKEN"
```

**預期回應**：
```json
{
  "success": true,
  "data": {
    "balance": {
      "total": 100,
      "subscription": 0,
      "purchased": 100
    },
    "plan": {
      "type": "free",
      "monthlyQuota": 100,
      "monthlyUsed": 0,
      "monthlyRemaining": 100
    }
  }
}
```

#### 6.2 創建短網址消耗 Credits

```bash
curl -X POST http://localhost:8788/v1/links \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.example.com",
    "customSlug": "test-slug"
  }'
```

**預期**：
- ✅ 扣除 1 credit
- ✅ 優先從 monthly_quota 扣除

#### 6.3 查看交易記錄

```bash
curl http://localhost:8788/api/account/transactions \
  -H "Authorization: Bearer $TOKEN"
```

**預期回應**：
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "...",
        "type": "usage_quota",
        "amount": -1,
        "balanceAfter": 100,
        "description": "使用月配額（1/100）",
        "createdAt": 1706025600000
      },
      {
        "id": "...",
        "type": "bonus",
        "amount": 100,
        "balanceAfter": 100,
        "description": "註冊歡迎獎勵",
        "createdAt": 1706025000000
      }
    ]
  }
}
```

---

### 7. 測試 KV Cache

#### 7.1 第一次請求（Cache Miss）

```bash
# 查看日誌，應該看到 "API Key cache MISS"
curl -X POST http://localhost:8788/v1/links \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://cache-test.com"
  }'
```

#### 7.2 第二次請求（Cache Hit）

```bash
# 立即再次請求，應該看到 "API Key cache HIT"
curl -X POST http://localhost:8788/v1/links \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://cache-test-2.com"
  }'
```

**檢查**：
- ✅ 第二次請求速度明顯更快
- ✅ 後端日誌顯示 "cache HIT"

---

### 8. 測試前端頁面

#### 8.1 API Keys 頁面

訪問：http://localhost:5173/api-keys

**檢查**：
- ✅ 顯示所有 API Keys
- ✅ 顯示每個 Key 的 scopes、rate limit、使用統計
- ✅ 可以啟用/停用 Key
- ✅ 可以刪除 Key
- ✅ 創建新 Key 後顯示完整 Key（只一次）

#### 8.2 Credits 頁面

訪問：http://localhost:5173/credits

**檢查**：
- ✅ 顯示總 Credits
- ✅ 顯示月配額使用情況
- ✅ 顯示進度條
- ✅ 顯示訂閱/購買餘額分解
- ✅ 顯示交易記錄

---

## 🐛 常見問題排查

### 問題 1：API Key 驗證失敗

**症狀**：返回 401 Unauthorized

**檢查**：
```bash
# 1. 確認 API Key 格式正確
echo $API_KEY
# 應該是: oao_live_xxx 或 oao_test_xxx

# 2. 確認 API Key 是否啟用
curl http://localhost:8788/api/account/keys \
  -H "Authorization: Bearer $TOKEN"
```

---

### 問題 2：Rate Limit 沒生效

**症狀**：可以無限發送請求

**檢查**：
```bash
# 查看 KV 中的 Rate Limit 記錄
# 應該在 Workers Dev Tools 中可以看到
# Key 格式: ratelimit:apikey:{keyId}:minute:{timestamp}
```

---

### 問題 3：Credits 沒扣除

**症狀**：創建短網址後餘額不變

**檢查**：
```bash
# 查看交易記錄
curl http://localhost:8788/api/account/transactions \
  -H "Authorization: Bearer $TOKEN"

# 應該有新的 usage_quota 或 usage 記錄
```

---

## ✅ 完整功能清單

### 核心功能
- [x] API Key CRUD
- [x] API Key 驗證（KV Cache）
- [x] Rate Limiting（固定窗口）
- [x] Credit 扣除（混合制）
- [x] Analytics Engine 記錄
- [x] 交易記錄審計
- [x] Scopes 權限控制

### 前端功能
- [x] API Keys 管理介面
- [x] Credits 查詢介面
- [x] 交易記錄展示
- [x] 即時餘額更新

### 優化功能
- [x] KV Cache（5 分鐘 TTL）
- [x] 背景異步更新
- [x] Rate Limit Headers
- [x] 錯誤處理

---

## 🚀 下一步

1. **生產環境部署**：
   ```bash
   # 執行 migration 到生產
   cd api-worker
   wrangler d1 migrations apply oao-to-db --remote
   
   # 部署 Worker
   npm run deploy
   
   # 部署前端
   cd ../frontend
   npm run build
   # 部署到 Cloudflare Pages
   ```

2. **監控設置**：
   - 設置 Analytics Engine 查詢
   - 配置告警（Credit 低、錯誤率高）
   - Dashboard 可視化

3. **文檔完善**：
   - API 文檔（Swagger/OpenAPI）
   - SDK 生成（Python, Node.js）
   - 使用範例

---

**所有核心功能已完成並可測試！** 🎉


