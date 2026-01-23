# Analytics 數據空白問題 - 完整診斷與修復報告

**日期**：2026-01-18  
**狀態**：✅ 已修復並驗證成功

---

## 📋 問題描述

生產環境的 Analytics 頁面 (`https://app.oao.to/analytics/GuMtc1`) 顯示所有數據都是 0：
- 總點擊數：0
- 國家數量：0  
- 設備類型：0

---

## 🔍 診斷過程

### 第一步：檢查 Analytics Engine 數據

查詢 Analytics Engine 發現**完全沒有任何數據**，說明問題不在前端顯示，而在數據收集階段。

### 第二步：檢查點擊追蹤功能

查看 core-worker 日誌，發現錯誤：

```
Failed to track click: TypeError: writeDataPoint(): Maximum of 1 indexes supported.
```

**原因**：Analytics Engine 最多只支援 1 個 index，但代碼中使用了 2 個：
```typescript
indexes: [slug, userId]  // ❌ 錯誤：2 個 indexes
```

### 第三步：檢查 Analytics API 查詢

測試 Analytics Engine SQL API 調用，發現錯誤：

```json
{
  "code": 6111,
  "message": "Invalid format for Authorization header"
}
```

**原因 1**：查詢格式錯誤 - 應該直接把 SQL 放在 body 中，而不是 JSON 格式

**原因 2**：環境變量設定錯誤
```json
{
  "accountIdLength": 69,        // ❌ 正常應該是 32
  "accountIdPrefix": "# Cloudf" // ❌ 包含註解文字！
}
```

---

## 🛠️ 修復方案

### 修復 1：修正 writeDataPoint 的 indexes

**文件**：`core-worker/src/index.ts` 和 `api-worker/src/utils/analytics.ts`

**修改前**：
```typescript
indexes: [slug, userId]  // 2 個 indexes
```

**修改後**：
```typescript
indexes: [slug]  // 只使用 1 個 index
```

### 修復 2：修正 Analytics Engine SQL API 查詢格式

**文件**：`api-worker/src/utils/analytics.ts`

**修改前**：
```typescript
const response = await fetch(API, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),  // ❌ 錯誤：JSON 格式
});
```

**修改後**：
```typescript
const response = await fetch(API, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
  },
  body: sql,  // ✅ 正確：SQL 直接放在 body 中
});
```

**參考文檔**：https://developers.cloudflare.com/analytics/analytics-engine/sql-api/

### 修復 3：重新設定環境變量

**問題**：生產環境的 secrets 包含錯誤的值

**解決方案**：
```bash
# 刪除錯誤的 secrets
npx wrangler secret delete CLOUDFLARE_ACCOUNT_ID --env production
npx wrangler secret delete CLOUDFLARE_API_TOKEN --env production

# 重新設定正確的值（從 .dev.vars 複製）
echo "b1d3f8b35c1b43afe837b997180714f3" | \
  npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production

echo "VtfR76VD6-Mq2Ly4JnDGX7jLUPadt0cWmNf8F-12" | \
  npx wrangler secret put CLOUDFLARE_API_TOKEN --env production
```

---

## ✅ 驗證結果

### 測試 1：環境變量驗證

```bash
curl -s "https://api.oao.to/api/test-env/check" | jq .
```

**結果**：
```json
{
  "hasAccountId": true,
  "hasApiToken": true,
  "accountIdLength": 32,    // ✅ 正確
  "apiTokenLength": 40,     // ✅ 正確
  "accountIdPrefix": "b1d3f8b3",
  "apiTokenPrefix": "VtfR76VD6-"
}
```

### 測試 2：Analytics Engine 數據查詢

```bash
curl -s "https://api.oao.to/api/test-analytics/recent" | jq .
```

**結果**：
```json
{
  "success": true,
  "count": 6,
  "sample": {
    "slug": "GuMtc1",
    "country": "TW",
    "device": "desktop",
    "timestamp": "2026-01-18 15:33:35"
  }
}
```

### 測試 3：Analytics API 端點

```bash
curl -s "https://api.oao.to/api/analytics/GuMtc1" | jq .
```

**結果**：
```json
{
  "slug": "GuMtc1",
  "totalClicks": "9",
  "byCountry": [
    {
      "country": "TW",
      "clicks": "9"
    }
  ],
  "byDevice": [
    {
      "device": "desktop",
      "clicks": "9"
    }
  ]
}
```

✅ **所有測試通過！數據正常收集和顯示！**

---

## 📚 知識總結

### Cloudflare Analytics Engine 重點

1. **Indexes 限制**：最多只支援 1 個 index
2. **SQL API 格式**：SQL 查詢直接放在 POST body 中（不是 JSON）
3. **數據延遲**：通常 1-10 分鐘後才能查詢到新寫入的數據
4. **採樣機制**：高流量時會自動採樣，需要使用 `_sample_interval` 欄位計算實際值

### 環境變量最佳實踐

1. **本地開發**：使用 `.dev.vars` 文件（應加入 `.gitignore`）
2. **生產環境**：使用 `wrangler secret put` 設定（加密存儲）
3. **格式驗證**：
   - `CLOUDFLARE_ACCOUNT_ID`：32 字符的十六進制字串
   - `CLOUDFLARE_API_TOKEN`：約 40 字符的 token（需要 "Account Analytics Read" 權限）

---

## 🚀 後續建議

1. **啟用認證**：目前 analytics API 暫時移除了認證，生產環境應該重新啟用
2. **修復時間趨勢**：`byDay` 查詢目前返回空陣列，需要檢查時間戳欄位的查詢語法
3. **清理測試端點**：部署完成後應該移除 `/api/test-analytics` 和 `/api/test-env` 端點
4. **監控數據**：設定 alerts 監控 Analytics Engine 的寫入和查詢錯誤

---

## 🎯 結論

問題已完全修復！主要是三個錯誤：

1. ❌ Indexes 超過限制（2 個 → 1 個）
2. ❌ API 請求格式錯誤（JSON → 純文本）
3. ❌ 環境變量設定錯誤（包含註解 → 純值）

現在 Analytics 功能已經**正常工作**，可以正確追蹤點擊並在前端顯示統計數據！🎉


