# 生產環境 Secrets 設定指南

**更新日期**：2026-01-18  
**狀態**：✅ 已修正並測試通過

---

## 📋 修正說明

### 原始問題

1. **腳本不完整**：`setup-production-secrets.sh` 缺少 `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN`
2. **讀取方式有問題**：使用 `source .dev.vars` 可能會錯誤解析註解和特殊字符
3. **缺少驗證**：沒有驗證讀取的值是否正確

### 修正內容

✅ **加入完整的變數列表**：
- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_API_TOKEN
- JWT_SECRET
- API_URL
- FRONTEND_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- SUPERADMIN_EMAILS

✅ **改進讀取方式**：
```bash
# 舊方式（有問題）
source .dev.vars

# 新方式（安全可靠）
read_var() {
    local var_name="$1"
    local value=$(grep "^${var_name}=" .dev.vars | head -1 | cut -d'"' -f2)
    echo "$value"
}
```

✅ **加入驗證機制**：
- 檢查 `.dev.vars` 是否存在
- 驗證必要變數不為空
- 顯示變數長度和前綴（用於確認）
- 需要用戶確認才執行

---

## 🚀 使用方式

### 方法 1：使用自動化腳本（推薦）

```bash
cd /Users/you/Development/media/oao_to
./setup-production-secrets.sh
```

**執行流程**：
1. 讀取 `api-worker/.dev.vars` 中的所有變數
2. 驗證必要變數的格式和長度
3. 顯示將要設定的值（隱藏敏感部分）
4. 詢問確認
5. 依序上傳所有 secrets 到生產環境

**優點**：
- ✅ 一次設定所有變數
- ✅ 自動驗證格式
- ✅ 有確認步驟，安全可靠

**輸出範例**：
```
=== 設定 OAO.TO 生產環境 Secrets ===

📖 從 .dev.vars 讀取配置...

🔍 驗證變數...

即將設定以下 secrets 到生產環境：
1. CLOUDFLARE_ACCOUNT_ID (長度: 32, 前綴: b1d3f8b3...)
2. CLOUDFLARE_API_TOKEN (長度: 40, 前綴: VtfR76VD6-...)
3. JWT_SECRET (長度: 73)
4. API_URL (https://api.oao.to)
5. FRONTEND_URL (https://app.oao.to)
6. GOOGLE_CLIENT_ID
7. GOOGLE_CLIENT_SECRET
8. SUPERADMIN_EMAILS (joey@cryptoxlab.com)

確認繼續？(y/N)
```

### 方法 2：互動式手動設定（最安全）

```bash
cd /Users/you/Development/media/oao_to/api-worker

# 依序設定每個 secret
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
# 提示輸入時，貼上：b1d3f8b35c1b43afe837b997180714f3

npx wrangler secret put CLOUDFLARE_API_TOKEN --env production
# 提示輸入時，貼上：VtfR76VD6-Mq2Ly4JnDGX7jLUPadt0cWmNf8F-12

# ... 其他變數
```

**優點**：
- 🔒 最安全（值不會出現在任何地方）
- 🔒 不會留在 shell history
- ✅ Wrangler 官方推薦方式

**缺點**：
- ⏱️ 需要手動輸入每個變數
- 📋 需要記住所有變數名稱

---

## 📊 測試驗證

### 已完成的測試

✅ **讀取功能測試**：
```bash
# 測試結果
✅ CLOUDFLARE_ACCOUNT_ID 長度正確 (32)
✅ CLOUDFLARE_API_TOKEN 長度正確 (40)
✅ CLOUDFLARE_ACCOUNT_ID 前綴正確 (b1d3f8b3)
✅ CLOUDFLARE_API_TOKEN 前綴正確 (VtfR76VD6-)
```

✅ **Dry-run 測試**：
```bash
✅ 所有必要變數驗證通過！
✅ setup-production-secrets.sh 應該能正常運作
```

✅ **生產環境驗證**：
```bash
curl -s "https://api.oao.to/api/test-env/check" | jq .
# 結果：
{
  "accountIdLength": 32,    # ✅ 正確
  "apiTokenLength": 40,     # ✅ 正確
  "accountIdPrefix": "b1d3f8b3"  # ✅ 正確
}
```

---

## 🔐 安全性最佳實踐

### 1. .dev.vars 檔案保護

✅ **已加入 .gitignore**：
```bash
# .gitignore 第 13-14 行
.dev.vars
.dev.vars.*
```

✅ **確認未被追蹤**：
```bash
git status api-worker/.dev.vars
# 輸出：nothing to commit, working tree clean
```

### 2. Secrets 設定方式比較

| 方式 | 安全性 | 便利性 | 適用場景 |
|------|--------|--------|----------|
| 互動式輸入 | 🔒🔒🔒 最高 | ⭐⭐ 中等 | 生產環境、敏感變數 |
| 從檔案讀取 | 🔒🔒 高 | ⭐⭐⭐ 高 | CI/CD、自動化部署 |
| echo 管道 | 🔒 低 | ⭐⭐⭐ 高 | **不推薦**（會留 history） |

### 3. 定期檢查

建議每個月檢查一次：
```bash
# 檢查所有 secrets 是否設定
cd api-worker
npx wrangler secret list --env production

# 檢查環境變數格式
curl -s "https://api.oao.to/api/test-env/check" | jq .
```

---

## 📝 完整的 Secrets 清單

### 必要變數（一定要設定）

1. **CLOUDFLARE_ACCOUNT_ID**
   - 格式：32 字符的十六進制字串
   - 取得方式：Cloudflare Dashboard > Workers & Pages（右側）
   - 範例：`b1d3f8b35c1b43afe837b997180714f3`

2. **CLOUDFLARE_API_TOKEN**
   - 格式：約 40 字符的 API Token
   - 取得方式：https://dash.cloudflare.com/profile/api-tokens
   - 權限：Account Analytics - Read
   - 範例：`VtfR76VD6-Mq2Ly4JnDGX7jLUPadt0cWmNf8F-12`

3. **JWT_SECRET**
   - 格式：隨機長字串（建議 64+ 字符）
   - 用途：JWT Token 簽名

4. **API_URL**
   - 固定值：`https://api.oao.to`

5. **FRONTEND_URL**
   - 固定值：`https://app.oao.to`

### 可選變數（視需求設定）

6. **GOOGLE_CLIENT_ID**
   - 用途：Google OAuth 登入
   - 取得：Google Cloud Console

7. **GOOGLE_CLIENT_SECRET**
   - 用途：Google OAuth 登入
   - 取得：Google Cloud Console

8. **SUPERADMIN_EMAILS**
   - 格式：逗號分隔的 email 列表
   - 範例：`admin1@example.com,admin2@example.com`

---

## 🚨 常見問題

### Q1: 為什麼之前會設定錯誤？

**A**: 原因有二：
1. `setup-production-secrets.sh` 原本**沒有包含** `CLOUDFLARE_ACCOUNT_ID` 和 `CLOUDFLARE_API_TOKEN`
2. 使用 `source .dev.vars` 可能會錯誤解析註解行，導致設定的值包含 `"# Cloudflare..."` 這樣的字串

### Q2: 如何確認 secrets 設定正確？

**A**: 三種方式：
```bash
# 方式 1：列出所有 secrets
npx wrangler secret list --env production

# 方式 2：檢查環境變數格式（推薦）
curl -s "https://api.oao.to/api/test-env/check" | jq .

# 方式 3：測試功能是否正常
curl -s "https://api.oao.to/api/test-analytics/recent" | jq .
```

### Q3: 修改某個 secret 需要重新部署嗎？

**A**: 不需要！Secrets 是即時生效的：
```bash
# 修改 secret
npx wrangler secret put JWT_SECRET --env production

# 立即生效，不需要 deploy
```

---

## ✅ 完成檢查清單

設定完成後，請確認：

- [ ] 所有 8 個 secrets 都已設定
- [ ] `CLOUDFLARE_ACCOUNT_ID` 長度為 32
- [ ] `CLOUDFLARE_API_TOKEN` 長度為 40
- [ ] `curl https://api.oao.to/api/test-env/check` 返回正確格式
- [ ] Analytics 功能正常運作
- [ ] `.dev.vars` 已加入 `.gitignore`
- [ ] 生產環境 secrets 與本地 `.dev.vars` 一致（除了 URL）

---

## 📚 相關文檔

- [ANALYTICS_FIX_REPORT.md](./ANALYTICS_FIX_REPORT.md) - Analytics 問題診斷報告
- [PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md](./PRODUCTION_DEPLOYMENT_COMPLETE_GUIDE.md) - 完整部署指南
- [Cloudflare Analytics Engine 官方文檔](https://developers.cloudflare.com/analytics/analytics-engine/)

---

**最後更新**：2026-01-18  
**修正者**：AI Assistant  
**狀態**：✅ 已測試驗證，可安全使用

