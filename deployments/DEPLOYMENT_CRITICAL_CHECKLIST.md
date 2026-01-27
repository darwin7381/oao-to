# 🚨 部署關鍵注意事項清單

**創建日期**：2026-01-27  
**版本**：V2.0  
**狀態**：必讀文檔 - 每次部署前必須檢查

---

## 📋 目錄

1. [快速檢查清單](#快速檢查清單)
2. [Database Migrations 注意事項](#database-migrations-注意事項)
3. [CORS 配置問題](#cors-配置問題)
4. [環境變量管理](#環境變量管理)
5. [前後端依賴關係](#前後端依賴關係)
6. [歷史錯誤與教訓](#歷史錯誤與教訓)
7. [部署前驗證步驟](#部署前驗證步驟)
8. [回滾方案](#回滾方案)

---

## ⚡ 快速檢查清單

**部署前必須確認的 10 項**：

- [ ] 1. 檢查是否有新的 Database Migrations
- [ ] 2. 確認 Migrations 語法正確（特別是 ALTER TABLE）
- [ ] 3. 更新 API Worker CORS 配置（如果前端有重新部署）
- [ ] 4. 確認所有環境變量已設定
- [ ] 5. 檢查 wrangler.toml 配置正確
- [ ] 6. 確認 D1 database ID 正確
- [ ] 7. 確認 KV namespace ID 正確
- [ ] 8. 前端 API 端點配置正確
- [ ] 9. 測試端點已移除（生產環境）
- [ ] 10. 備份當前生產版本資訊

---

## 🗄️ Database Migrations 注意事項

### ⚠️ 關鍵規則

1. **永遠先檢查當前狀態**
   ```bash
   # 檢查生產環境已執行的 migrations
   npx wrangler d1 migrations list oao-to-prod --env production --remote
   ```

2. **測試 Migration 語法**
   - SQLite 不支援 `ADD COLUMN IF NOT EXISTS`
   - 必須使用 `CREATE INDEX IF NOT EXISTS`
   - 外鍵約束要小心（ON DELETE 行為）

3. **ALTER TABLE 常見錯誤**
   ```sql
   ❌ 錯誤：
   -- ALTER TABLE table_name ADD COLUMN column_name TYPE;
   -- （如果欄位已存在會失敗）
   
   ✅ 正確：
   ALTER TABLE table_name ADD COLUMN column_name TYPE;
   -- 接受可能的錯誤，或先檢查欄位是否存在
   ```

4. **Migration 執行順序**
   - ⚠️ **不可跳過**：必須按順序執行
   - ⚠️ **不可回滾**：D1 不支援自動回滾
   - ✅ **先測試**：在本地環境完整測試

### 📝 Migration 檢查清單

- [ ] Migration 檔案命名正確（0001_xxx.sql 格式）
- [ ] 包含必要的註解說明
- [ ] 所有 CREATE TABLE 使用 `IF NOT EXISTS`
- [ ] 所有 CREATE INDEX 使用 `IF NOT EXISTS`
- [ ] 外鍵約束定義正確
- [ ] 初始數據插入使用 `ON CONFLICT DO NOTHING`
- [ ] 已在本地測試成功

### 🚨 歷史錯誤案例

**案例 1：0004_admin_features.sql 失敗**
- **錯誤**：`no such column: admin_id`
- **原因**：Migration 中註解掉了 `ALTER TABLE` 語句，但創建索引時引用了不存在的欄位
- **教訓**：如果創建索引，必須先確保欄位存在
- **修復**：啟用 `ALTER TABLE credit_transactions ADD COLUMN admin_id TEXT`

---

## 🔒 CORS 配置問題

### ⚠️ 核心問題

**Cloudflare Pages 預設網址會隨每次部署改變！**

```
部署 1：https://44e055e8.oao-to-app.pages.dev
部署 2：https://6cb6fda4.oao-to-app.pages.dev
部署 3：https://[new-id].oao-to-app.pages.dev
```

### 🔧 解決方案

#### **方案 A：只使用 Custom Domain（推薦）** ⭐

```typescript
// api-worker/src/index.ts
app.use('*', cors({
  origin: [
    'https://app.oao.to',           // Custom Domain（永遠不變）
    'http://localhost:5173',        // 本地開發
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

**優點**：
- ✅ 不需要每次更新 CORS
- ✅ 更安全
- ✅ 更簡潔

**缺點**：
- ⚠️ Custom Domain 設定前無法使用
- ⚠️ Preview Deployments 無法使用

#### **方案 B：使用通配符（不推薦）**

```typescript
origin: [
  'https://app.oao.to',
  /^https:\/\/[a-f0-9]+\.oao-to-app\.pages\.dev$/,  // 正則匹配
  'http://localhost:5173',
]
```

**優點**：
- ✅ 支援所有 Pages 部署
- ✅ 支援 Preview Deployments

**缺點**：
- ⚠️ 安全性較低
- ⚠️ 可能被濫用

#### **方案 C：每次部署時更新（當前方案）**

**流程**：
1. 前端部署成功 → 記下新的部署 ID
2. 更新 API Worker CORS 配置
3. 重新部署 API Worker

**優點**：
- ✅ 完全控制
- ✅ 安全性高

**缺點**：
- ⚠️ 需要手動更新
- ⚠️ 容易忘記

### 📋 CORS 更新檢查清單

- [ ] 前端部署完成後記下新的部署 ID
- [ ] 更新 `api-worker/src/index.ts` 的 CORS origin
- [ ] 重新部署 API Worker
- [ ] 測試前端可以正常調用 API

---

## 🔐 環境變量管理

### ⚠️ 絕對禁止

- ❌ **永遠不要**將 secrets 提交到 Git
- ❌ **永遠不要**在代碼中硬編碼敏感資訊
- ❌ **永遠不要**使用 `.dev.vars` 的值直接設定生產環境

### ✅ 正確做法

#### **1. 本地開發**
```bash
# 使用 .dev.vars 文件（已加入 .gitignore）
# api-worker/.dev.vars
JWT_SECRET=local-dev-secret-only
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

#### **2. 生產環境**
```bash
# 使用 wrangler secret put（加密存儲）
echo "strong-production-secret" | npx wrangler secret put JWT_SECRET --env production

# 從 .dev.vars 複製時要小心
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
# 然後手動輸入值
```

### 🚨 歷史錯誤案例

**案例：環境變量包含註解**
- **錯誤**：`CLOUDFLARE_ACCOUNT_ID` 包含了 `# Cloudflare...` 註解文字
- **原因**：錯誤地從文件複製了整行（包括註解）
- **結果**：Analytics Engine API 調用失敗
- **教訓**：設定 secrets 時要驗證格式

### 📋 環境變量檢查清單

- [ ] `.dev.vars` 已加入 `.gitignore`
- [ ] 生產環境 secrets 已正確設定
- [ ] 驗證環境變量格式正確（無空格、無註解）
- [ ] 敏感資訊已加密存儲
- [ ] 文檔中不包含實際的 secret 值

---

## 🔗 前後端依賴關係

### ⚠️ 部署順序很重要

#### **情境 1：Database Schema 變更**

**正確順序**：
```
1. 執行 Database Migrations ⚠️ 優先
2. 部署 API Worker（使用新 schema）
3. 部署前端（調用新 API）
```

**錯誤順序**：
```
❌ 1. 部署 API Worker（引用不存在的表/欄位）
   2. 執行 Migrations
   → 結果：API 在 Migrations 完成前會報錯
```

#### **情境 2：API 端點變更**

**正確順序**：
```
1. 部署 API Worker（新舊端點都支援）
2. 部署前端（使用新端點）
3. 移除舊端點（可選）
```

**向後兼容性原則**：
- ✅ 新增端點：隨時可以
- ⚠️ 修改端點：先支援舊格式
- ❌ 刪除端點：確認前端已更新

#### **情境 3：只更新前端**

**順序**：
```
1. 部署前端
2. 更新 API Worker CORS（使用新的 Pages 網址）
3. 驗證前後端通信正常
```

### 📋 依賴檢查清單

- [ ] 確認是否有 Database Schema 變更
- [ ] 確認 API 端點變更是否向後兼容
- [ ] 確認前端 API 調用是否匹配後端
- [ ] 按正確順序部署各組件

---

## 📚 歷史錯誤與教訓

### 🔴 嚴重錯誤

#### **1. Analytics Engine Indexes 超過限制**
- **日期**：2026-01-18
- **錯誤**：`writeDataPoint()` 使用了 2 個 indexes
- **限制**：Analytics Engine 最多支援 1 個 index
- **修復**：改為只使用 `[slug]` 作為 index
- **教訓**：查閱官方文檔確認限制

#### **2. Analytics Engine API 請求格式錯誤**
- **日期**：2026-01-18
- **錯誤**：使用 JSON 格式發送 SQL 查詢
  ```typescript
  ❌ body: JSON.stringify({ query: sql })
  ```
- **正確**：SQL 直接放在 body
  ```typescript
  ✅ body: sql
  ```
- **教訓**：參考官方範例代碼

#### **3. Migration 欄位不存在**
- **日期**：2026-01-27
- **錯誤**：創建索引引用不存在的欄位
- **原因**：`ALTER TABLE` 被註解掉
- **教訓**：Migration 中所有語句要保持一致性

### 🟡 中等錯誤

#### **4. CORS 配置過時**
- **頻率**：每次前端部署
- **錯誤**：前端無法調用 API
- **原因**：Pages 預設網址變更但 CORS 未更新
- **教訓**：建立標準流程或改用 Custom Domain

#### **5. 測試端點未移除**
- **日期**：2026-01-20
- **錯誤**：生產環境包含測試端點
- **安全隱患**：`/api/test-analytics`、`/api/test-env`
- **教訓**：部署前檢查清單包含移除測試代碼

### 🟢 輕微錯誤

#### **6. 環境變量格式錯誤**
- **錯誤**：包含註解或空格
- **影響**：API 調用失敗
- **教訓**：設定後立即驗證

---

## ✅ 部署前驗證步驟

### **1. 本地驗證（開發環境）**

```bash
# 1.1 檢查 Linter 錯誤
cd api-worker && npm run lint
cd ../frontend && npm run lint

# 1.2 本地構建測試
cd frontend && npm run build
# 確認無錯誤

# 1.3 本地 Migrations 測試（如有新的）
cd api-worker
npx wrangler d1 migrations apply oao-to-db --local

# 1.4 本地完整測試
# 啟動所有服務，手動測試核心功能
```

### **2. 代碼檢查**

```bash
# 2.1 確認無敏感資訊
grep -r "password\|secret\|token" --exclude-dir=node_modules

# 2.2 確認測試端點已移除
grep -r "test-analytics\|test-env" api-worker/src/

# 2.3 確認 CORS 配置
cat api-worker/src/index.ts | grep -A 10 "cors({"
```

### **3. 配置文件檢查**

- [ ] `wrangler.toml` 的 database_id 正確
- [ ] `wrangler.toml` 的 KV namespace ID 正確
- [ ] `frontend` 的 API 端點配置正確
- [ ] `.gitignore` 包含所有敏感文件

### **4. Git 狀態檢查**

```bash
# 確認所有變更已提交
git status

# 確認在正確的分支
git branch

# 標記版本（可選）
git tag -a v1.x.x -m "Version 1.x.x"
```

---

## 🔄 標準部署流程

### **完整部署（Database + Backend + Frontend）**

```bash
# Step 1: 檢查 Migrations
cd api-worker
npx wrangler d1 migrations list oao-to-prod --env production --remote

# Step 2: 執行 Migrations（如有新的）
npx wrangler d1 migrations apply oao-to-prod --env production --remote

# Step 3: 部署 API Worker
npx wrangler deploy --env production
# 記下版本號

# Step 4: 部署 Core Worker
cd ../core-worker
npx wrangler deploy --env production
# 記下版本號

# Step 5: 構建前端
cd ../frontend
npm run build

# Step 6: 部署前端
npx wrangler pages deploy dist --project-name oao-to-app
# ⚠️ 記下新的部署 ID！

# Step 7: 更新 CORS（如果 Pages ID 改變）
cd ../api-worker
# 編輯 src/index.ts，更新 CORS origin
npx wrangler deploy --env production

# Step 8: 驗證
curl https://oao.to/health
curl https://api.oao.to/health
curl https://app.oao.to
```

### **僅前端部署**

```bash
# Step 1: 構建前端
cd frontend
npm run build

# Step 2: 部署
npx wrangler pages deploy dist --project-name oao-to-app
# ⚠️ 記下新的部署 ID

# Step 3: 更新 API Worker CORS
cd ../api-worker
# 編輯 src/index.ts，更新 Pages 網址
npx wrangler deploy --env production

# Step 4: 驗證
curl -I https://[new-deployment-id].oao-to-app.pages.dev
# 測試前後端通信
```

### **僅後端部署**

```bash
# Step 1: 部署 API Worker
cd api-worker
npx wrangler deploy --env production

# Step 2: 部署 Core Worker（可選）
cd ../core-worker
npx wrangler deploy --env production

# Step 3: 驗證
curl https://api.oao.to/health
```

---

## 🔙 回滾方案

### **Worker 回滾**

Cloudflare Workers 保留歷史版本：

```bash
# 1. 查看版本歷史（Dashboard）
# Cloudflare Dashboard → Workers → oao-to-api-production → Deployments

# 2. 回滾到特定版本
# 在 Dashboard 中點擊 "Rollback to this version"

# 或使用命令行（需要版本 ID）
npx wrangler rollback oao-to-api-production --version [VERSION_ID]
```

### **Pages 回滾**

```bash
# 1. 查看部署歷史
npx wrangler pages deployments list oao-to-app

# 2. 回滾到特定部署
# 在 Dashboard: Pages → oao-to-app → Deployments → Rollback

# 3. 更新 CORS（使用舊的部署 ID）
cd api-worker
# 編輯 src/index.ts
npx wrangler deploy --env production
```

### **Database 回滾**

⚠️ **D1 Database 不支援自動回滾！**

**選項**：
1. **寫反向 Migration**：
   ```sql
   -- 例如：刪除添加的欄位
   -- 創建新的 migration 檔案
   ALTER TABLE table_name DROP COLUMN column_name;
   ```

2. **從備份恢復**（如果有）：
   ```bash
   # D1 目前不支援自動備份
   # 需要手動導出/導入數據
   ```

3. **數據修復腳本**：
   - 如果是數據問題，寫 SQL 腳本修復

### 📋 回滾檢查清單

- [ ] 確認回滾版本號
- [ ] 備份當前狀態（如果可能）
- [ ] 執行回滾操作
- [ ] 更新相關依賴（如 CORS）
- [ ] 完整驗證功能
- [ ] 記錄回滾原因和過程

---

## 📊 部署後驗證清單

### **基本健康檢查**

```bash
# 1. Core Worker
curl https://oao.to/health
# 預期：{"status":"ok","service":"oao.to-core"}

# 2. API Worker
curl https://api.oao.to/health
# 預期：{"status":"ok","service":"oao.to-api"}

# 3. Frontend
curl -I https://app.oao.to
# 預期：HTTP/2 200
```

### **功能測試**

```bash
# 4. 創建短網址
curl -X POST https://api.oao.to/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
# 預期：{"success":true,"slug":"..."}

# 5. 測試重定向
curl -I https://oao.to/[slug]
# 預期：HTTP/2 301 + Location header

# 6. Analytics API
curl https://api.oao.to/api/analytics/[slug]
# 預期：返回統計數據
```

### **前後端整合測試**

- [ ] 前端可以正常載入
- [ ] 登入功能正常
- [ ] 創建短網址正常
- [ ] Dashboard 顯示正常
- [ ] Analytics 頁面正常
- [ ] Admin Portal 正常（如果是 admin）

### **Database 驗證（如有 Migrations）**

```bash
# 檢查新表是否存在
npx wrangler d1 execute oao-to-prod --env production --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"

# 檢查新欄位是否存在
npx wrangler d1 execute oao-to-prod --env production --remote \
  --command "PRAGMA table_info(table_name)"
```

---

## 📝 部署記錄模板

每次部署後應創建記錄文件：

```markdown
# 部署記錄 - YYYY-MM-DD

## 部署資訊
- **日期**：YYYY-MM-DD HH:MM UTC
- **執行人**：XXX
- **類型**：Major Update / Minor Update / Hotfix / Bugfix

## 變更內容
### Database
- [ ] 新增 Migrations：0XXX_xxx.sql
- [ ] 新增表：XXX
- [ ] 修改欄位：XXX

### API Worker
- **版本**：[version-id]
- **變更**：
  - XXX 功能
  - XXX 修復

### Core Worker
- **版本**：[version-id]
- **變更**：XXX

### Frontend
- **部署 ID**：[deployment-id]
- **變更**：
  - XXX 頁面
  - XXX 功能

## CORS 更新
- Pages 網址：https://[id].oao-to-app.pages.dev
- API Worker 已更新：✅/❌

## 驗證結果
- [ ] 健康檢查通過
- [ ] 功能測試通過
- [ ] 整合測試通過

## 問題與解決
- 問題 1：XXX
  - 解決：XXX

## 下次注意
- XXX
```

---

## 🎯 關鍵提醒

### **絕對不要**

1. ❌ 不檢查就執行 Migrations
2. ❌ 忘記更新 CORS 配置
3. ❌ 將 secrets 提交到 Git
4. ❌ 跳過驗證步驟
5. ❌ 在生產環境留測試代碼

### **永遠要做**

1. ✅ 部署前完整測試
2. ✅ 按正確順序部署
3. ✅ 記錄所有版本號
4. ✅ 驗證所有功能
5. ✅ 創建部署記錄

### **最佳實踐**

1. 🎯 使用 Custom Domain 避免 CORS 問題
2. 🎯 Migrations 先在本地測試
3. 🎯 保持部署文檔更新
4. 🎯 建立自動化腳本（未來）
5. 🎯 定期檢查 Cloudflare Dashboard

---

## 📚 相關文檔

- [PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md](./PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md)
- [部署記錄檔案](./DEPLOYMENT_2026-01-27_MAJOR_UPDATE.md)
- [Environment Variables Best Practices](../ENV_VARS_BEST_PRACTICES.md)

---

**記住：謹慎部署，完整驗證，詳細記錄！** 🚀

**最後更新**：2026-01-27  
**下次更新**：當有新的錯誤或教訓時
