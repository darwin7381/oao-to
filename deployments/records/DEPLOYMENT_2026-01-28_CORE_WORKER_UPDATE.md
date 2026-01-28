# 部署記錄 - 2026-01-28

**類型**：Core Worker 更新  
**日期**：2026-01-28  
**狀態**：待部署  

---

## 📋 變更摘要

### 1. oao.to 首頁自動跳轉
- **變更**：將 oao.to 根路徑從 landing page 改為自動跳轉到 app.oao.to
- **原因**：簡化維護，用戶體驗更直接
- **影響**：訪問 https://oao.to 會自動重定向到 https://app.oao.to

### 2. 修復尾隨斜線（Trailing Slash）Bug
- **問題**：`https://oao.to/slug/` 無法正常工作（加了 `/` 後無畫面）
- **修復**：設置 Hono `strict: false`，統一處理帶/不帶斜線的 URL
- **影響**：`/slug` 和 `/slug/` 現在都能正常重定向

### 3. 部署腳本優化
- **變更**：在 package.json 中添加 `deploy:prod` 腳本
- **原因**：避免誤部署到開發環境
- **使用**：`npm run deploy:prod` 明確部署到生產環境

---

## 📝 技術細節

### 變更 1：首頁自動跳轉

**修改文件**：`core-worker/src/index.ts`

**變更前**：
```typescript
// 根路徑：Landing Page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    ...100+ 行的 HTML Landing Page...
  `, 200);
});
```

**變更後**：
```typescript
// 根路徑：自動跳轉到 app.oao.to
app.get('/', (c) => {
  return c.redirect('https://app.oao.to', 301);
});
```

**優點**：
- ✅ 減少代碼維護負擔（減少 100+ 行 HTML）
- ✅ 更直接的用戶體驗
- ✅ 減少首頁載入時間
- ✅ 統一入口（所有功能都在 app.oao.to）

---

### 變更 2：修復尾隨斜線問題

**修改文件**：`core-worker/src/index.ts`

**變更前**：
```typescript
const app = new Hono<{ Bindings: Env }>();
```

**變更後**：
```typescript
const app = new Hono<{ Bindings: Env }>({ strict: false });
```

**說明**：
- `strict: false` 讓 Hono 自動處理尾隨斜線
- `/slug` 和 `/slug/` 被視為相同路由
- 符合用戶預期（大多數網站都支援兩種形式）

**測試場景**：
| URL | 變更前 | 變更後 |
|-----|--------|--------|
| `https://oao.to/test` | ✅ 重定向 | ✅ 重定向 |
| `https://oao.to/test/` | ❌ 404 | ✅ 重定向 |
| `https://oao.to/` | ✅ Landing Page | ✅ 跳轉到 app |
| `https://oao.to/health` | ✅ 健康檢查 | ✅ 健康檢查 |

---

### 變更 3：部署腳本優化

**修改文件**：`core-worker/package.json`

**變更後**：
```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "deploy:prod": "wrangler deploy --env=production"
  }
}
```

**使用方式**：
```bash
# 開發環境部署（一般不使用）
npm run deploy

# 生產環境部署（推薦）
npm run deploy:prod
```

**⚠️ 重要**：
- 直接執行 `npm run deploy` 會部署到**開發環境**，不是生產環境！
- 生產環境必須使用 `npm run deploy:prod` 或 `wrangler deploy --env=production`

---

## 🚀 部署流程

### 前置檢查

- [x] 變更已在本地測試
- [x] Git 狀態乾淨
- [x] 理解變更影響範圍
- [x] 已閱讀 DEPLOYMENT_CRITICAL_CHECKLIST.md

### 部署步驟

```bash
# 1. 進入 core-worker 目錄
cd core-worker

# 2. 確認當前配置
cat wrangler.toml | grep -A 5 "env.production"

# 3. 部署到生產環境
npm run deploy:prod
# 或
wrangler deploy --env=production

# 4. 記錄部署資訊
# Worker 版本: [從輸出中複製]
# 部署時間: [記錄時間]
```

### 驗證步驟

```bash
# 1. 測試首頁自動跳轉
curl -I https://oao.to
# 預期：HTTP/2 301
# 預期：Location: https://app.oao.to

# 2. 測試短網址（不帶斜線）
curl -I https://oao.to/[existing-slug]
# 預期：HTTP/2 301
# 預期：Location: [目標網址]

# 3. 測試短網址（帶斜線）
curl -I https://oao.to/[existing-slug]/
# 預期：HTTP/2 301
# 預期：Location: [目標網址]

# 4. 健康檢查
curl https://oao.to/health
# 預期：{"status":"ok","service":"oao.to-core","timestamp":...}

# 5. 瀏覽器測試
# 訪問 https://oao.to
# 預期：自動跳轉到 https://app.oao.to
```

---

## ⚠️ 注意事項

### 1. 不影響其他服務

**確認**：
- ✅ API Worker (api.oao.to) 不受影響
- ✅ Frontend (app.oao.to) 不受影響
- ✅ 短網址重定向邏輯不變
- ✅ Analytics 追蹤不變
- ✅ 只有根路徑 `/` 的行為改變

### 2. 用戶體驗變化

**變更前**：
```
用戶訪問 oao.to → 看到 Landing Page → 點擊「開始使用」→ 跳轉到 app.oao.to
```

**變更後**：
```
用戶訪問 oao.to → 自動跳轉到 app.oao.to
```

**好處**：減少一次點擊，更直接

### 3. SEO 考量

**影響**：
- 使用 301 永久重定向（對 SEO 友好）
- 搜索引擎會理解 oao.to 的主要內容在 app.oao.to
- 如果未來需要 Landing Page，建議使用子域名（如 www.oao.to）

### 4. 快取問題

**可能情況**：
- 部署後，某些用戶可能仍看到舊的 Landing Page（瀏覽器快取）
- Cloudflare 邊緣快取可能需要幾分鐘更新

**解決方案**：
- 正常情況：等待 1-2 分鐘，Cloudflare 會自動更新
- 如需立即生效：在 Cloudflare Dashboard 清除快取
- 用戶端：強制重新整理（Ctrl+Shift+R）

---

## 📊 部署資訊

### 環境資訊

| 項目 | 值 |
|------|-----|
| Worker 名稱 | oao-to-core |
| 環境 | production |
| 域名 | oao.to |
| KV Namespace | cb616d868c134b1c9e5e6ef54afb3f64 |
| Analytics Dataset | link_clicks |

### 部署結果（待填寫）

- **部署時間**：YYYY-MM-DD HH:MM UTC
- **Worker 版本**：[待記錄]
- **部署者**：[待記錄]
- **驗證結果**：
  - [ ] 首頁跳轉正常
  - [ ] 短網址（不帶斜線）正常
  - [ ] 短網址（帶斜線）正常
  - [ ] 健康檢查正常

---

## 🐛 潛在問題與解決方案

### 問題 1：部署後首頁仍顯示 Landing Page

**原因**：瀏覽器或 Cloudflare 快取

**解決**：
```bash
# 1. 檢查後端是否已更新
curl -I https://oao.to
# 應該看到 301 重定向

# 2. 清除 Cloudflare 快取
# Dashboard → Caching → Purge Cache → Purge Everything

# 3. 用戶端：無痕模式測試
```

### 問題 2：某些短網址加斜線仍然 404

**原因**：可能是特定路由的問題

**排查**：
```bash
# 測試 health 端點（應該不受影響）
curl -I https://oao.to/health
curl -I https://oao.to/health/

# 測試正常短網址
curl -I https://oao.to/test
curl -I https://oao.to/test/
```

**解決**：檢查 Hono 版本和配置是否正確

### 問題 3：Analytics 數據不一致

**原因**：不會有這個問題（只改了首頁和路由匹配）

**確認**：
```typescript
// 追蹤邏輯沒有變更
if (c.env.TRACKER) {
  c.executionCtx.waitUntil(trackClick(c.env, slug, linkData, c.req.raw));
}
```

---

## ✅ 部署檢查清單

### 部署前
- [x] 代碼變更已審查
- [x] 本地測試通過
- [x] 理解變更影響
- [x] 準備好驗證步驟

### 部署中
- [ ] 執行部署命令
- [ ] 記錄 Worker 版本
- [ ] 記錄部署時間

### 部署後
- [ ] 首頁跳轉測試
- [ ] 短網址測試（帶/不帶斜線）
- [ ] 健康檢查
- [ ] 記錄驗證結果

---

## 📚 相關文檔

- [DEPLOYMENT_CRITICAL_CHECKLIST.md](./DEPLOYMENT_CRITICAL_CHECKLIST.md) - 部署檢查清單
- [CLOUDFLARE_PRODUCTION_GUIDE.md](./CLOUDFLARE_PRODUCTION_GUIDE.md) - Cloudflare 生產指南
- [PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md](./PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md) - 完整部署指南

---

## 💡 經驗總結

### 學到的教訓

1. **簡單就是美**
   - 移除不必要的 Landing Page HTML
   - 用重定向代替靜態頁面
   - 減少維護負擔

2. **URL 規範化很重要**
   - 用戶會隨意加/不加斜線
   - 必須統一處理
   - `strict: false` 是個好選擇

3. **部署腳本明確性**
   - `deploy` vs `deploy:prod` 要清楚區分
   - 避免誤部署到錯誤環境

### 未來改進建議

1. **考慮 CI/CD**
   - 自動化部署流程
   - Git push → 自動部署
   - 降低人為錯誤

2. **監控和告警**
   - 設置 Cloudflare Analytics 告警
   - 監控重定向成功率
   - 異常時自動通知

3. **A/B 測試**
   - 如果未來需要 Landing Page
   - 可以考慮 Cloudflare Workers 的 A/B 測試功能
   - 測試不同首頁策略的效果

---

**部署狀態**：⏳ 待部署  
**下次更新**：部署完成後填寫驗證結果  
**建立時間**：2026-01-28
