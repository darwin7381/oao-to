# API 平台優化方案選項

**狀態**：核心已完成，待選擇優化策略  
**日期**：2026-01-23

---

## ✅ 已完成的核心部分

以下是**無論選擇何種方案都必須的**核心功能，已全部實現：

### 1. 資料庫結構 ✅
- `migrations/0003_api_platform_core.sql`
- 包含：
  - `api_keys` - API Key 管理
  - `credits` - Credit 餘額和方案
  - `credit_transactions` - 交易記錄
  - `api_usage_stats` - 使用統計
  - `link_index` - 短網址索引

### 2. TypeScript 類型定義 ✅
- 更新 `src/types.ts`
- 新增類型：
  - `ApiKey`, `Credits`, `CreditTransaction`
  - `ApiUsageStats`, `LinkIndex`
  - `ApiKeyValidation`, `CreditDeduction`

### 3. 核心工具 ✅
- `utils/api-key.ts` - API Key 生成與驗證
- `utils/credit-manager.ts` - Credit 扣除與管理（混合制邏輯）

### 4. Middleware ✅
- `middleware/api-key.ts`
  - `verifyApiKey()` - 驗證 API Key
  - `requireScope()` - 檢查權限
  - `requireCredits()` - 檢查餘額

### 5. API 路由 ✅
- `routes/api-keys.ts` - API Key CRUD
- `routes/account.ts` - Credits 查詢、交易記錄、使用統計

### 6. 主入口整合 ✅
- 已加入新路由到 `src/index.ts`

---

## 🔧 需要選擇的優化方案

現在核心已完成，以下是幾個需要你決定的優化方向：

---

## 方案 A：API Key 驗證優化

### 現況
```
每次 API 請求：
1. 查 D1 驗證 API Key（10-50ms）
2. 執行業務邏輯
```

### 選項 1：KV Cache ✅ **已採用**

**做法**：
- 驗證後將 API Key 資訊 cache 到 KV（5 分鐘 TTL）
- 下次請求先查 KV（1-5ms）
- Cache miss 才查 D1

**優點**：
- ✅ 延遲降低 80-90%
- ✅ 減少 D1 查詢負載
- ✅ 實現簡單

**缺點**：
- ❌ 管理員改 Rate Limit 後，5 分鐘才生效
- ❌ 增加少量 KV 讀取成本

**成本影響**：
- 每百萬次請求：約 +$0.5 KV 成本

---

### 選項 2：Durable Objects

**做法**：
- 用 Durable Objects 管理 API Key 狀態
- 每個 API Key 一個 DO 實例
- 內存操作，極快

**優點**：
- ✅ 最快（內存操作）
- ✅ 精確的 Rate Limiting
- ✅ 即時更新

**缺點**：
- ❌ 複雜度高
- ❌ 成本較高（$0.15/百萬次請求）

**成本影響**：
- 每百萬次請求：約 +$15

---

### 選項 3：JWT Token Exchange

**做法**：
- API Key 先 exchange 成短期 JWT
- 後續請求用 JWT（不查 D1）
- JWT 包含 userId, scopes, rateLimit

**優點**：
- ✅ 幾乎零延遲
- ✅ 零 D1 查詢
- ✅ 安全（短期過期）

**缺點**：
- ❌ 用戶要先 exchange（多一步）
- ❌ JWT 內資訊可能過期（1 小時內的誤差）

**成本影響**：
- 幾乎無額外成本

---

**最終決策**：✅ 選項 1（KV Cache）

**升級路徑**：
- 規模化（> 100 萬次/月）：考慮選項 3（JWT）
- 企業客戶需求：考慮選項 2（Durable Objects）

詳見 `API_PLATFORM_UPGRADE_PATHS.md`

---

## 方案 B：Credit 扣除策略

### 現況
```
Credit 扣除在業務邏輯執行後（同步）：
1. 執行操作
2. 扣除 Credit（查 D1 → 寫 D1）
3. 返回結果
```

### 選項 1：同步扣除 ✅ **已採用**

**做法**：
- 操作完成後立即扣除
- 確保餘額準確

**優點**：
- ✅ 餘額絕對準確
- ✅ 不會超支

**缺點**：
- ❌ 增加響應時間（~20-50ms）
- ❌ D1 寫入負載大

---

### 選項 2：異步扣除（樂觀策略）

**做法**：
```javascript
// 1. 快速檢查（可能不準確）
const cachedBalance = getFromKV('balance:' + userId);
if (cachedBalance < cost) return 402;

// 2. 執行業務邏輯
const result = await createLink(...);

// 3. 背景異步扣除
c.executionCtx.waitUntil(
  deductCredits(userId, cost)
);

// 4. 立即返回（不等扣款完成）
return result;
```

**優點**：
- ✅ 響應快（不阻塞）
- ✅ 用戶體驗好

**缺點**：
- ❌ 可能超支幾次請求（並發情況）
- ❌ 需要欠費偵測和補償機制

**實現**：
- 定期檢查負餘額
- 超支用戶：下次請求時擋住 + 通知補款

---

### 選項 3：混合策略

**做法**：
- 免費用戶：同步扣除（防濫用）
- 付費用戶：異步扣除（體驗優先）
- Enterprise：不扣除（無限）

**優點**：
- ✅ 平衡安全與體驗
- ✅ 付費用戶獲得更好體驗

**缺點**：
- ❌ 邏輯複雜

---

**最終決策**：✅ 選項 1（同步扣除）

**升級路徑**：
- 付費用戶 > 100：考慮選項 3（混合策略）

---

## 方案 C：Rate Limiting 實現

### 選項 1：KV 固定窗口 ✅ **已採用**

**做法**：
```javascript
// Key: ratelimit:{keyId}:minute:20260123143000
// Value: 計數
// TTL: 90 秒
```

**優點**：
- ✅ 簡單
- ✅ 成本低

**缺點**：
- ❌ 窗口邊界問題（14:30:59 用 60 次 + 14:31:00 又用 60 次）

---

### 選項 2：滑動窗口（Durable Objects）

**做法**：
- 記錄每次請求的時間戳
- 檢查時計算最近 60 秒的請求數

**優點**：
- ✅ 最精確

**缺點**：
- ❌ 複雜
- ❌ 需要 Durable Objects

---

### 選項 3：令牌桶算法

**做法**：
- 每秒補充令牌
- 請求消耗令牌
- 允許短時間爆發

**優點**：
- ✅ 更靈活
- ✅ 用戶體驗好（允許短時間高頻）

**缺點**：
- ❌ 實現複雜

---

**最終決策**：✅ 選項 1（固定窗口）

**升級路徑**：
- 用戶反饋體驗差：考慮選項 3（令牌桶）

---

## 方案 D：統計數據收集

### 選項 1：即時寫入 D1（當前實現）

**做法**：
- 每次請求後寫 `api_usage_stats`
- 背景異步

**優點**：
- ✅ 數據即時
- ✅ 實現簡單

**缺點**：
- ❌ 高頻寫入可能達到 D1 限制
- ❌ 成本較高

---

### 選項 2：批次聚合

**做法**：
- Worker 內存累積
- 每 100 次請求或每分鐘 batch 寫入一次

**優點**：
- ✅ 減少 D1 寫入
- ✅ 成本更低

**缺點**：
- ❌ Worker 重啟可能丟失數據
- ❌ 統計延遲

---

### 選項 3：Analytics Engine ✅ **已採用**

**做法**：
- 用 Cloudflare Analytics Engine
- 專為高頻寫入設計
- 定期從 AE 聚合到 D1

**優點**：
- ✅ 專為此設計
- ✅ 無寫入限制
- ✅ 自動聚合

**缺點**：
- ❌ 需要額外查詢 AE

---

**最終決策**：✅ 選項 3（Analytics Engine）

**升級路徑**：
- 需要歷史查詢：實現 AE + D1 聚合

---

## 總結建議

### ✅ 當前實現（已完成）

**技術選型**：
- API Key 驗證：**KV Cache**（5 分鐘 TTL）
- Credit 扣除：**同步扣除**（準確）
- Rate Limiting：**KV 固定窗口**（簡單可靠）
- 統計收集：**Analytics Engine**（高頻寫入優化）
- Credit 池：**混合池**（對外共用、對內分離）

**效能表現**：
- 延遲：1-50ms（視 Cache Hit/Miss）
- 成本：< $20/月（1000 萬次調用）
- 可支撐：月調用量 1000 萬次

**優點**：
- ✅ 簡單、可靠、已上線
- ✅ 成本可控
- ✅ 效能足夠

---

### 🚀 升級路徑

所有升級方案已詳細記錄在 `API_PLATFORM_UPGRADE_PATHS.md`

**推薦優先級**：
1. **P0**: Stripe 支付整合（立即需要）
2. **P1**: Webhook 通知、SDK 生成（3-6 個月）
3. **P2**: 技術優化（根據流量和反饋決定）

---

## ✅ 已完成項目

### 核心功能
- [x] 執行 Migration
- [x] 實現 KV Cache
- [x] 實現固定窗口 Rate Limiting
- [x] 實現同步 Credit 扣除
- [x] 整合 Analytics Engine
- [x] 實現混合池 Credit 系統
- [x] 前端管理介面
- [x] API 使用文檔

### 已部署
- [x] 生產環境部署
- [x] Database Migration
- [x] KV 綁定
- [x] 所有 Secrets 配置

---

## 📚 相關文件

- `API_PLATFORM_DESIGN.md` - 完整設計規格
- `API_PLATFORM_STATUS.md` - 當前狀態報告
- `API_PLATFORM_UPGRADE_PATHS.md` - 升級路徑詳細規劃

---

更新時間: 2026-01-23


