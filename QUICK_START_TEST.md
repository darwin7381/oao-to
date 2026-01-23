# 快速開始測試

## ✅ 當前狀態

**後端**: ✅ 運行中
- URL: http://localhost:53929
- Health: http://localhost:53929/health

**前端**: ⏸ 需要啟動

---

## 🚀 啟動前端

請在新的終端運行：

```bash
cd /Users/you/Development/media/oao_to/frontend
npm run dev
```

前端應該會運行在：http://localhost:5173

---

## 🧪 測試步驟

### 1. 訪問前端並登入

1. 開啟瀏覽器：http://localhost:5173
2. 點擊右上角用戶選單
3. 你會看到新的選項：
   - **API Platform** (新增)
     - 🔑 API Keys
     - 💰 Credits & Usage

### 2. 測試 API Keys 頁面

1. 點擊 **API Keys**
2. 點擊 **Create API Key**
3. 填寫表單：
   - Name: `My Test Key`
   - Environment: `Test` 
   - Scopes: 勾選你需要的權限
4. 點擊 **Create**
5. ⚠️ **複製並保存顯示的 API Key**（只會顯示一次！）

### 3. 測試 Credits 頁面

1. 點擊 **Credits & Usage**
2. 你應該看到：
   - 總 Credits: 100（初始贈送）
   - 月配額: 100/100
   - 當前方案: FREE
   - 交易記錄（包含註冊獎勵）

### 4. 測試 API 調用

使用你剛創建的 API Key：

```bash
API_KEY="oao_test_xxx..."  # 替換成你的 Key

curl -X POST http://localhost:53929/v1/links \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.google.com"
  }'
```

**預期回應**：
```json
{
  "success": true,
  "data": {
    "slug": "abc123",
    "url": "https://www.google.com",
    "shortUrl": "https://oao.to/abc123",
    ...
  },
  "credits": {
    "cost": 1,
    "balanceAfter": 99
  }
}
```

### 5. 檢查 Rate Limit Headers

```bash
curl -i http://localhost:53929/v1/links \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**檢查 Response Headers**：
```
X-RateLimit-Limit-Minute: 10
X-RateLimit-Remaining-Minute: 9
X-RateLimit-Reset-Minute: 1706025660
```

### 6. 測試 Rate Limiting

快速發送 15 次請求：

```bash
for i in {1..15}; do
  echo "Request $i:"
  curl http://localhost:53929/v1/links \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"https://example.com/test$i\"}"
  echo ""
  sleep 0.5
done
```

**預期**：
- 前 10 次成功
- 第 11 次開始返回 429 錯誤

---

## 🎯 UI 檢查清單

### API Keys 頁面 (`/api-keys`)
- [ ] 顯示所有 API Keys
- [ ] 顯示 Key 前綴（完整 Key 只在創建時顯示一次）
- [ ] 顯示 Scopes（權限範圍）
- [ ] 顯示 Rate Limit 配置
- [ ] 顯示使用統計（總請求數、最後使用時間）
- [ ] 可以啟用/停用 Key
- [ ] 可以刪除 Key
- [ ] 創建新 Key 時顯示完整 Key + 警告

### Credits 頁面 (`/credits`)
- [ ] 顯示總 Credits
- [ ] 顯示月配額使用情況（進度條）
- [ ] 顯示當前方案（FREE/STARTER/PRO/ENTERPRISE）
- [ ] 顯示訂閱餘額 vs 購買餘額
- [ ] 顯示月配額重置時間
- [ ] 顯示交易記錄（類型、金額、描述、時間）
- [ ] 顯示累計統計（總購買、總使用）

---

## 📸 預期截圖

### 用戶選單
```
┌─────────────────────────────┐
│ 👤 User Name                │
│ user@example.com            │
├─────────────────────────────┤
│ 📊 Dashboard                │
│                             │
│ API PLATFORM                │
│ 🔑 API Keys                 │
│ 💰 Credits & Usage          │
│                             │
│ ADMIN (如果是 admin)        │
│ 👥 User Management          │
│ 📈 System Stats             │
├─────────────────────────────┤
│ 🚪 Sign out                 │
└─────────────────────────────┘
```

---

## ✨ 功能驗證

測試這些核心功能：

1. ✅ **API Key 創建**：能成功創建並只顯示一次完整 Key
2. ✅ **API Key 驗證**：使用 Key 調用 API 成功
3. ✅ **KV Cache**：第二次調用更快（檢查後端日誌 "cache HIT"）
4. ✅ **Rate Limiting**：超過限制返回 429
5. ✅ **Credit 扣除**：調用 API 後餘額減少
6. ✅ **交易記錄**：能看到扣款記錄
7. ✅ **月配額**：優先從月配額扣除
8. ✅ **前端即時更新**：創建短網址後 Credits 頁面數字更新

---

**準備好了嗎？開始測試吧！** 🚀

1. 先啟動前端
2. 訪問 http://localhost:5173
3. 查看新的 UI 選單
4. 開始測試各項功能


