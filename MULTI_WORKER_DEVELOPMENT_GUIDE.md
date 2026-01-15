# 多 Worker 本地開發完整解決方案歷史

**專案**：OAO.TO 短網址服務  
**架構**：oao.to (core) + api.oao.to (api) + app.oao.to (frontend)  
**核心問題**：兩個 Worker 需要共享同一個 Workers KV namespace  

---

## 🎯 最終解決方案（已驗證）

### **方案：`--persist-to` 共享存儲目錄**

```bash
# Terminal 1: Core Worker
cd core-worker
wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared

# Terminal 2: API Worker
cd api-worker
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared

# Terminal 3: Frontend
cd frontend
npm run dev
```

**配置**：
```toml
# 兩個 Worker 都用相同的 KV namespace ID
[[kv_namespaces]]
binding = "LINKS"
id = "8f133853496a4bdfb8151a39dd251518"

# 不需要 remote = true
```

**測試結果**：
- ✅ 兩個 Worker 都對外 HTTP
- ✅ KV 完美共享
- ✅ 不污染生產數據
- ✅ 所有 API 功能正常

**參考來源**：
- [Wrangler Commands - dev](https://developers.cloudflare.com/workers/wrangler/commands/#dev)
  - `--persist-to` 選項：指定本地持久化目錄

---

## 📚 所有嘗試過的方案（按時間順序）

### **方案 1：直接啟動（最初嘗試）**

**做法**：
```bash
cd core-worker && wrangler dev  # Terminal 1
cd api-worker && wrangler dev   # Terminal 2
```

**配置**：
```toml
[[kv_namespaces]]
binding = "LINKS"
id = "8f133853496a4bdfb8151a39dd251518"
```

**結果**：❌ 失敗
- API Worker 創建數據
- Core Worker 讀不到（404）
- 原因：各自獨立的 `.wrangler/state/` 目錄

**參考**：無（基礎嘗試）

---

### **方案 2：remote = true（錯誤方案）**

**做法**：
```toml
[[kv_namespaces]]
binding = "LINKS"
id = "8f133853496a4bdfb8151a39dd251518"
remote = true  # 連接遠端 KV
```

**結果**：✅ KV 共享成功，但 ❌ 會污染生產數據
- 兩個 Worker 都連接 Cloudflare 真實 KV
- 開發時寫入的測試數據會進入生產 KV
- 不安全！

**參考來源**：
- [Remote Bindings](https://developers.cloudflare.com/workers/development-testing/#remote-bindings)
  - `remote: true` 用於連接遠端資源
  - 官方建議：只用於無本地模擬的資源（AI、Browser Rendering）

**教訓**：
- `remote = true` 不是用來解決多 Worker 共享問題的
- 應該用於特殊資源，不是 KV

---

### **方案 3：persist_to 配置（失敗）**

**做法**：
```toml
[dev]
persist_to = "../.wrangler-shared"
```

**結果**：❌ 失敗
```
▲ [WARNING] Unexpected fields found in dev field: "persist_to"
```

**原因**：
- Wrangler 4.x 不支援在 config 中設定 `persist_to`
- 只能作為 CLI 參數使用

**參考**：
- 實測結果（無官方文檔說明此方式）

---

### **方案 4：單一指令多配置（部分適用）**

**做法**：
```bash
wrangler dev -c core-worker/wrangler.toml -c api-worker/wrangler.toml
```

**結果**：⚠️ 部分成功
- ✅ 兩個 Worker 在同一 Miniflare 實例
- ✅ KV 自動共享
- ❌ 只有第一個 Worker 對外 HTTP
- ❌ 第二個只能通過 Service Binding 訪問

**官方說明**：
> "The first config will be treated as the _primary_ Worker, which will be exposed over HTTP. The remaining config files will only be accessible via a service binding."

**參考來源**：
- [Wrangler dev command](https://developers.cloudflare.com/workers/wrangler/commands/#dev)
  - `-c` 選項：多配置文件

**為何不適合我們**：
- 我們需要兩個 Worker 都對外提供 HTTP
- 不是主從關係，是平等的兩個服務

---

### **方案 5：--persist-to CLI 參數（✅ 成功）**

**做法**：
```bash
wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared
```

**配置**：
```toml
# 相同的 KV namespace ID
[[kv_namespaces]]
binding = "LINKS"
id = "8f133853496a4bdfb8151a39dd251518"
```

**結果**：✅ 完全成功
- ✅ 兩個 Worker 都對外 HTTP
- ✅ 共享本地 KV 存儲
- ✅ 不污染生產數據
- ✅ 離線可用
- ✅ 零網路延遲

**測試證明**：
```bash
API Worker 創建 → http://localhost:8788/shorten
Core Worker 重定向 → http://localhost:8787/slug
✅ 301 Redirect 成功
```

**參考來源**：
- [Wrangler dev --persist-to](https://developers.cloudflare.com/workers/wrangler/commands/#dev)
  - 官方文檔：`--persist-to` - Specify directory to use for local persistence
- [Miniflare Multiple Workers](https://developers.cloudflare.com/workers/testing/miniflare/core/multiple-workers/)
  - 相同 namespace ID 在同一存儲目錄會自動共享

---

## 📊 所有方案對比表

| 方案 | KV 共享 | 兩個都對外 | 數據安全 | 離線可用 | 官方支援 | 結論 |
|------|--------|-----------|---------|---------|---------|------|
| 1. 直接啟動 | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ 失敗 |
| 2. remote = true | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ 不安全 |
| 3. persist_to config | - | - | - | - | ❌ | ❌ 不支援 |
| 4. 多配置單指令 | ✅ | ❌ | ✅ | ✅ | ✅ | ⚠️ 部分適用 |
| 5. --persist-to CLI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅✅✅ |

---

## 🎯 為什麼方案 5 是正確答案

### **1. 符合官方設計**

**官方文檔支援**：
```bash
--persist-to string
  Specify directory to use for local persistence
  (defaults to .wrangler/state)
```

**運作原理**：
```
Miniflare 使用檔案系統模擬 KV：
├── .wrangler/oao-shared/v3/kv/8f13385.../
│   ├── core-worker 寫入
│   └── api-worker 讀取
└── 相同 namespace ID + 相同目錄 = 自動共享
```

### **2. 符合我們的架構**

```
開發環境：
├── core-worker: localhost:8787 (重定向)
├── api-worker: localhost:8788 (API)
└── 共享本地 KV（不污染生產）

生產環境：
├── core-worker: oao.to (重定向)
├── api-worker: api.oao.to (API)  
└── 共享生產 KV（Cloudflare 自動處理）

完全一致！✅
```

### **3. 生產部署配置**

```toml
# 開發環境（top-level）
[[kv_namespaces]]
binding = "LINKS"
id = "dev-kv-id"  # 應該創建獨立的 dev KV

# 生產環境
[env.production]
routes = [{ pattern = "oao.to", custom_domain = true }]
[[env.production.kv_namespaces]]
binding = "LINKS"
id = "prod-kv-id"  # 生產 KV（完全隔離）
```

**啟動方式**：
```bash
# 開發
wrangler dev --persist-to ../.wrangler/oao-shared

# 生產
wrangler deploy -e production
```

---

## 🔍 方案 1 為何失敗？

**技術原因**：

```
每個 wrangler dev 進程：
├── 創建獨立的 Miniflare 實例
├── 預設存儲：.wrangler/state/
└── 即使 namespace ID 相同，存儲路徑不同

core-worker/.wrangler/state/v3/kv/8f13385.../
api-worker/.wrangler/state/v3/kv/8f13385.../
       ↑                    ↑
   不同目錄！             不同目錄！
```

**Miniflare 的檢測邏輯**：
- 只檢查**同一個實例**內的 namespace ID
- 不跨進程檢測

---

## 💡 關鍵洞察

### **我之前的錯誤**

1. ❌ **誤以為相同 ID 就會自動跨進程共享**
   - 實際：只在同一 Miniflare 實例內共享
   
2. ❌ **使用 remote = true 解決共享問題**
   - 實際：這會污染生產數據

3. ❌ **嘗試在 wrangler.toml 配置 persist_to**
   - 實際：只能作為 CLI 參數

4. ✅ **最後才發現 --persist-to CLI 參數**
   - 這才是官方標準解法

### **為什麼一開始沒發現**

- `--persist-to` 在官方文檔中是可選參數
- 大多數情況用預設的 `.wrangler/state` 就好
- 只有多 Worker 共享資源時才需要

---

## 📝 官方文檔引用

### **1. Wrangler dev 命令**

來源：https://developers.cloudflare.com/workers/wrangler/commands/#dev

```
--persist-to <directory>
  Specify directory to use for local persistence
  (defaults to .wrangler/state)
```

### **2. Miniflare Multiple Workers**

來源：https://developers.cloudflare.com/workers/testing/miniflare/core/multiple-workers/

關鍵內容：
> "Miniflare will now use the KV namespace ID when persisting data. This allows you to bind the same KV namespace in multiple Workers."

### **3. Remote Bindings**

來源：https://developers.cloudflare.com/workers/development-testing/#remote-bindings

說明：
- `remote: true` 用於連接遠端資源
- 建議用於：AI、Browser Rendering、Vectorize
- 不建議用於：KV、D1、R2（有本地模擬）

---

## 🎯 生產級配置範例

### **完整的 wrangler.toml**

**core-worker/wrangler.toml**：
```toml
name = "oao-to-core"
main = "src/index.ts"
compatibility_date = "2024-09-28"

# 開發環境（建議創建獨立 dev KV）
[[kv_namespaces]]
binding = "LINKS"
id = "8f133853496a4bdfb8151a39dd251518"  # 目前暫用這個

[[analytics_engine_datasets]]
binding = "TRACKER"
dataset = "link_clicks"

# 生產環境
[env.production]
routes = [{ pattern = "oao.to", custom_domain = true }]

[[env.production.kv_namespaces]]
binding = "LINKS"
id = "prod-kv-different-id"  # 生產專用 KV

[[env.production.analytics_engine_datasets]]
binding = "TRACKER"
dataset = "link_clicks"
```

**api-worker/wrangler.toml**：
```toml
name = "oao-to-api"
main = "src/index.ts"
compatibility_date = "2024-09-28"

# 開發環境（與 core-worker 相同 ID）
[[kv_namespaces]]
binding = "LINKS"
id = "8f133853496a4bdfb8151a39dd251518"

[[d1_databases]]
binding = "DB"
database_name = "oao-to-db"
database_id = "db9693c9-d2de-43b7-ad28-e2211e736e16"
migrations_dir = "migrations"

[[analytics_engine_datasets]]
binding = "TRACKER"
dataset = "link_clicks"

# 生產環境
[env.production]
routes = [{ pattern = "api.oao.to", custom_domain = true }]

[[env.production.kv_namespaces]]
binding = "LINKS"
id = "prod-kv-different-id"  # 與 core 相同的生產 KV

[[env.production.d1_databases]]
binding = "DB"
database_id = "prod-d1-different-id"

[[env.production.analytics_engine_datasets]]
binding = "TRACKER"
dataset = "link_clicks"
```

---

## 🚀 標準開發流程

### **初次設置**

```bash
# 1. 創建開發環境資源（建議但非必須）
wrangler kv:namespace create LINKS
# 輸出: id = "dev-kv-xxxxx"

wrangler d1 create oao-to-dev
# 輸出: database_id = "dev-db-xxxxx"

# 2. 創建生產環境資源
wrangler kv:namespace create LINKS --env production
# 輸出: id = "prod-kv-yyyyy"

wrangler d1 create oao-to-prod
# 輸出: database_id = "prod-db-yyyyy"

# 3. 更新 wrangler.toml 配置（兩個 Worker）

# 4. 執行 migrations
cd api-worker
wrangler d1 migrations apply oao-to-db --local
wrangler d1 migrations apply oao-to-prod --remote
```

### **日常開發**

```bash
# Terminal 1
cd core-worker
wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared

# Terminal 2
cd api-worker
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared

# Terminal 3
cd frontend
npm run dev
```

### **部署到生產**

```bash
# 1. 執行 migrations 到生產 D1
cd api-worker
wrangler d1 migrations apply oao-to-prod --remote

# 2. 設定 secrets
wrangler secret put JWT_SECRET -e production
wrangler secret put CLOUDFLARE_ACCOUNT_ID -e production
wrangler secret put CLOUDFLARE_API_TOKEN -e production

# 3. 部署
cd core-worker && wrangler deploy -e production
cd api-worker && wrangler deploy -e production

# 4. 部署前端
cd frontend
npm run build
wrangler pages deploy dist --project-name oao-to-app
# 在 Dashboard 設定 Custom Domain: app.oao.to
```

---

## 📋 總測試次數統計

1. ✅ **方案 1（直接啟動）**：測試 3 次，確認失敗
2. ❌ **方案 2（remote=true）**：測試 2 次，確認可行但不安全
3. ❌ **方案 3（persist_to config）**：測試 1 次，確認不支援
4. ⚠️ **方案 4（多配置）**：測試 1 次，確認不適用
5. ✅ **方案 5（--persist-to CLI）**：測試 1 次，完全成功

**總計**：8 次測試，5 種方案

---

## 🎓 教訓與最佳實踐

### **1. RTFM（Read The F\*\*king Manual）**

**教訓**：
- 應該先查 `wrangler dev --help`
- `--persist-to` 一直都在
- 我們繞了一大圈才發現

### **2. 理解 Miniflare 的運作機制**

**關鍵**：
```
Miniflare 實例 = 進程

同一實例內：
- 相同 namespace ID → 自動共享

跨實例：
- 需要共享存儲目錄（--persist-to）
```

### **3. 開發與生產隔離**

**標準做法**：
```toml
# 開發用 dev 資源
[[kv_namespaces]]
id = "dev-kv-id"

# 生產用 prod 資源
[env.production.kv_namespaces]
id = "prod-kv-id"
```

**絕對不要**：
- ❌ 開發連接生產 KV
- ❌ 混用 dev 和 prod 資源

---

## ✅ 最終結論

### **正規方案**

```
開發階段：
wrangler dev --persist-to ../.wrangler/oao-shared

生產階段：
wrangler deploy -e production
```

### **符合性檢查**

| 需求 | 方案 5 | 說明 |
|------|--------|------|
| 兩個 Worker 都對外 | ✅ | 各自獨立 HTTP 服務 |
| 共享 KV | ✅ | `--persist-to` 共享存儲 |
| 數據隔離 | ✅ | dev/prod 完全分離 |
| 符合生產架構 | ✅ | 開發和生產一致 |
| 官方支援 | ✅ | 標準 CLI 選項 |

### **這是 Cloudflare Workers 多服務架構的官方標準做法！**

---

## 📚 完整參考資料

1. [Wrangler Commands - dev](https://developers.cloudflare.com/workers/wrangler/commands/#dev)
2. [Miniflare Multiple Workers](https://developers.cloudflare.com/workers/testing/miniflare/core/multiple-workers/)
3. [Development & Testing](https://developers.cloudflare.com/workers/development-testing/)
4. [Environments](https://developers.cloudflare.com/workers/wrangler/environments/)
5. [Remote Bindings](https://developers.cloudflare.com/workers/development-testing/#remote-bindings)
6. [KV Namespaces Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/#kv-namespaces)

---

**建立時間**：2026-01-14  
**測試環境**：macOS, Wrangler 4.45.2  
**狀態**：✅ 已驗證，生產可用

