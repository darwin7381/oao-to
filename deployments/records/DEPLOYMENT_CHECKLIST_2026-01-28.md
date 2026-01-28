# 🚀 Core Worker 部署檢查清單 - 2026-01-28

## ✅ 變更已完成

### 1. 代碼變更
- ✅ **首頁自動跳轉**：`oao.to/` → 自動重定向到 `app.oao.to`
- ✅ **修復尾隨斜線 Bug**：`/slug/` 現在可以正常工作
- ✅ **優化部署腳本**：添加 `npm run deploy:prod` 命令

### 2. 文檔更新
- ✅ 創建詳細部署記錄：`DEPLOYMENT_2026-01-28_CORE_WORKER_UPDATE.md`
- ✅ 更新 `CLOUDFLARE_PRODUCTION_GUIDE.md`
- ✅ 更新 `deployments/README.md`

---

## 📋 部署前最終檢查

### 配置檢查

```bash
# 1. 檢查 wrangler.toml 生產環境配置
cat core-worker/wrangler.toml | grep -A 10 "env.production"
```

**預期輸出**：
```toml
[env.production]
routes = [{ pattern = "oao.to", custom_domain = true }]

[[env.production.kv_namespaces]]
binding = "LINKS"
id = "cb616d868c134b1c9e5e6ef54afb3f64"

[[env.production.analytics_engine_datasets]]
binding = "TRACKER"
dataset = "link_clicks"
```

✅ **確認**：
- ✅ 路由設置正確：`oao.to`
- ✅ KV ID 正確：`cb616d868c134b1c9e5e6ef54afb3f64`（生產環境專用）
- ✅ Analytics Engine 已綁定

---

## 🚀 部署步驟（複製即用）

### 步驟 1：進入目錄
```bash
cd /Users/JL/Development/media/oao_to/core-worker
```

### 步驟 2：確認 Git 狀態
```bash
git status
```

### 步驟 3：部署到生產環境
```bash
# 方式 A：使用新的腳本（推薦）
npm run deploy:prod

# 方式 B：直接使用 wrangler
wrangler deploy --env=production
```

### 步驟 4：記錄部署資訊
從輸出中記錄以下資訊：
- Worker 版本 ID
- 部署時間
- 部署 URL

---

## ✅ 部署後驗證（必做）

### 1. 基本健康檢查
```bash
# 健康檢查端點
curl https://oao.to/health
```
**預期輸出**：
```json
{"status":"ok","service":"oao.to-core","timestamp":1738022400000}
```

---

### 2. 首頁跳轉測試
```bash
# 測試首頁重定向
curl -I https://oao.to
```
**預期輸出**：
```
HTTP/2 301
location: https://app.oao.to
...
```

---

### 3. 短網址測試（不帶斜線）
```bash
# 使用任一現有的短網址測試
# 如果沒有，可以先創建一個測試用的
curl -I https://oao.to/test
```
**預期**：`HTTP/2 301` 或 `404`（如果該 slug 不存在）

---

### 4. 短網址測試（帶斜線）- 新功能！
```bash
# 同樣的短網址，但加上尾隨斜線
curl -I https://oao.to/test/
```
**預期**：與不帶斜線的結果相同（這是本次修復的重點！）

---

### 5. 瀏覽器測試
1. 打開瀏覽器（建議使用無痕模式避免快取）
2. 訪問 `https://oao.to`
3. **預期**：自動跳轉到 `https://app.oao.to`

---

## ⚠️ 關鍵注意事項

### 1. 只執行一次部署命令！
```bash
# ✅ 正確：部署到生產環境
npm run deploy:prod

# ❌ 錯誤：會部署到開發環境！
npm run deploy
```

### 2. 不影響其他服務
本次變更**只影響** Core Worker (`oao.to`)，以下服務完全不受影響：
- ✅ API Worker (`api.oao.to`) - 無需重新部署
- ✅ Frontend (`app.oao.to`) - 無需重新部署
- ✅ 所有現有短網址 - 繼續正常工作
- ✅ Analytics 追蹤 - 繼續正常工作

### 3. 快取清除
如果部署後瀏覽器仍顯示舊的 Landing Page：
1. **正常情況**：等待 1-2 分鐘，Cloudflare 會自動更新
2. **立即生效**：
   ```bash
   # 使用 curl 測試（無快取）
   curl -I https://oao.to
   
   # 瀏覽器：使用無痕模式
   # 或強制重新整理：Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
   ```

---

## 📊 驗證結果記錄表

部署完成後，請填寫以下資訊：

```
部署資訊
========
部署時間：____________________ (UTC)
Worker 版本：____________________
部署者：____________________

驗證結果
========
[ ] 健康檢查：https://oao.to/health 返回 200 OK
[ ] 首頁跳轉：https://oao.to 重定向到 https://app.oao.to
[ ] 短網址（不帶斜線）：正常工作
[ ] 短網址（帶斜線）：正常工作（本次修復）
[ ] 瀏覽器測試：自動跳轉正常

問題記錄
========
遇到的問題：____________________
解決方案：____________________
```

---

## 🐛 常見問題與解決方案

### Q1: 部署後首頁仍顯示 Landing Page？
**A**: 這是快取問題
```bash
# 1. 檢查後端是否已更新
curl -I https://oao.to
# 如果顯示 301 重定向，說明後端正常

# 2. 清除瀏覽器快取
# 使用無痕模式或 Cmd+Shift+R

# 3. 如果仍有問題，在 Cloudflare Dashboard 清除快取
# Caching → Purge Cache → Purge Everything
```

---

### Q2: 短網址加斜線仍然不工作？
**A**: 檢查 Hono 配置
```bash
# 確認代碼中有設置 strict: false
grep "strict:" core-worker/src/index.ts
# 應該看到：const app = new Hono<{ Bindings: Env }>({ strict: false });
```

---

### Q3: 部署命令找不到？
**A**: 確認 package.json 已更新
```bash
cat core-worker/package.json | grep "deploy:prod"
# 應該看到："deploy:prod": "wrangler deploy --env=production"
```

---

## 📚 相關文檔參考

- **詳細部署記錄**：[DEPLOYMENT_2026-01-28_CORE_WORKER_UPDATE.md](./DEPLOYMENT_2026-01-28_CORE_WORKER_UPDATE.md)
- **通用檢查清單**：[DEPLOYMENT_CRITICAL_CHECKLIST.md](./DEPLOYMENT_CRITICAL_CHECKLIST.md)
- **Cloudflare 指南**：[CLOUDFLARE_PRODUCTION_GUIDE.md](./CLOUDFLARE_PRODUCTION_GUIDE.md)

---

## ✨ 總結

### 本次變更的好處
1. ✅ **更簡潔**：減少 100+ 行 HTML 代碼
2. ✅ **更直接**：用戶無需額外點擊
3. ✅ **更完善**：修復尾隨斜線 bug
4. ✅ **更安全**：明確的生產部署腳本

### 風險評估
- 🟢 **風險等級**：低
- 🟢 **影響範圍**：僅 Core Worker 根路徑和路由匹配
- 🟢 **回滾難度**：簡單（保留了 git 歷史）

### 預期結果
- 用戶訪問 `oao.to` 直接跳轉到 `app.oao.to`
- 短網址帶不帶斜線都能正常工作
- 其他所有功能不受影響

---

**準備好了嗎？複製上面的部署命令開始吧！** 🚀

**建立時間**：2026-01-28  
**狀態**：待執行
