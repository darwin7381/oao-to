# 📁 Deployments 資料夾

**目的**：集中管理所有部署相關文檔和記錄

---

## 📋 文件說明

### 🚨 必讀文檔

| 文件 | 說明 | 何時閱讀 |
|------|------|---------|
| **DEPLOYMENT_CRITICAL_CHECKLIST.md** | 部署關鍵注意事項清單 | 🔴 每次部署前必讀 |
| **PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md** | 完整部署指南 | 第一次部署或不熟悉流程時 |

### 📝 部署記錄

| 文件 | 日期 | 說明 |
|------|------|------|
| DEPLOYMENT_2026-01-27_MAJOR_UPDATE.md | 2026-01-27 | Admin Portal + Database 重大更新 |
| DEPLOYMENT_2026-01-24.md | 2026-01-24 | 前端更新 |
| DEPLOYMENT_2026-01-23_API_PLATFORM.md | 2026-01-23 | API 平台功能 |

### 📖 指南文檔

| 文件 | 說明 |
|------|------|
| DEPLOYMENT_GUIDE.md | 通用部署指南 |
| FINAL_DEPLOYMENT_CHECK.md | 最終檢查清單 |

---

## 🚀 快速開始

### 第一次部署？

1. 閱讀 [PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md](./PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md)
2. 閱讀 [DEPLOYMENT_CRITICAL_CHECKLIST.md](./DEPLOYMENT_CRITICAL_CHECKLIST.md)
3. 按照指南逐步執行

### 日常部署？

1. 檢查 [DEPLOYMENT_CRITICAL_CHECKLIST.md](./DEPLOYMENT_CRITICAL_CHECKLIST.md) 的快速清單
2. 根據變更類型選擇對應流程
3. 完成後創建部署記錄

---

## 📊 部署類型

### **完整部署**（Database + Backend + Frontend）
- 適用於：重大功能更新、Schema 變更
- 參考：DEPLOYMENT_2026-01-27_MAJOR_UPDATE.md
- 時間：約 5-10 分鐘

### **前端部署**
- 適用於：UI 更新、前端功能
- 注意：需要更新 API Worker CORS
- 時間：約 2-3 分鐘

### **後端部署**
- 適用於：API 邏輯更新、Bug 修復
- 時間：約 2-3 分鐘

---

## ⚠️ 常見陷阱

1. **CORS 配置**：前端每次部署 Pages 網址都會變
2. **Migrations 順序**：必須先執行 Migrations 再部署 API Worker
3. **環境變量**：不要將 secrets 提交到 Git
4. **測試端點**：生產環境要移除測試代碼

詳見 [DEPLOYMENT_CRITICAL_CHECKLIST.md](./DEPLOYMENT_CRITICAL_CHECKLIST.md)

---

## 📝 部署後必做

1. ✅ 健康檢查所有服務
2. ✅ 功能測試
3. ✅ 記錄版本號
4. ✅ 創建部署記錄文檔
5. ✅ 更新 CHANGELOG（如果有）

---

## 🔗 相關資源

- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 文檔](https://developers.cloudflare.com/d1/)
- [Wrangler CLI 文檔](https://developers.cloudflare.com/workers/wrangler/)

---

**記住：謹慎部署，詳細記錄！** 🚀
