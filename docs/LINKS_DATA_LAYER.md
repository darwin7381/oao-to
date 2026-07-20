# 短網址資料層（Links Data Layer）

> 2026-07-17 建立，對應「轉址歷史重寫」批次（migration 0012 + KV→D1 backfill）。
> 這份文件是資料層的權威說明：誰是 source of truth、每張表/namespace 的角色、寫入路徑、歷史包袱。

## 架構總覽

| 存儲 | 角色 | 內容 |
|------|------|------|
| **D1 `links` 表** | **Source of truth**（列表、統計、admin、分析的唯一讀取來源） | 全部 20,264+ 條連結完整 metadata |
| **KV `LINKS` namespace**（`link:<slug>`） | 重定向快取（core-worker 轉址熱路徑用） | slug → url + 基本欄位 JSON |
| **D1 `link_index` 表** | v1 API 建立紀錄（API key 歸屬） | slug、user_id、created_via、api_key_id |
| **Analytics Engine `link_clicks`** | 點擊事件（core-worker 寫入） | 每次轉址一筆，admin/analytics 經 CF API 查詢 |

## 寫入路徑（雙寫，D1 先行）

- **Dashboard 建連結**（`POST /api/links`，requireAuth）：**D1 先寫**（失敗 → 整個請求失敗，不產生 KV 孤兒）→ KV 寫入（失敗 → 回滾 D1）。`source='web'`、`is_custom` 依有無自訂 slug。slug 可省略，自動生成。
- **v1 API 建連結**（`POST /v1/links`，API key）：雙寫 `links`（`source='api'`、`api_key_id`）+ `link_index`。
- **flag/停用**（admin）：KV 與 D1 同步更新。

## 讀取路徑

- 使用者連結列表、analytics summary/all、admin links 列表/統計：**一律查 D1**（時間倒序、真分頁、真 total）。
- **禁止** `LINKS.list()` 做全域列舉 — KV list 無序且一次最多 1000 keys，歷史上造成「兩萬條只看得到前 1000 條字母序」的重大 bug。KV 只做單 key get。
- 點擊數：Analytics Engine SQL API（worker secret `CLOUDFLARE_API_TOKEN`，需 Account Analytics Read 權限）。`queryAnalytics` 失敗回 `[]` — token 失效時全站點擊顯示 0，排查先驗 token。

## `links.source` 欄位語意

| 值 | 意義 |
|----|------|
| `web` | Dashboard（登入後）建立 |
| `api` | v1 API 建立（`api_key_id` 必有值） |
| `backfill` | 2026-07-17 KV→D1 歷史回填、且 `link_index` 查無來源 — 幾乎全是匿名歷史連結，來源不可考 |

`is_custom` 為 NULL（backfill 列）時前端以啟發式判斷（slug 長度/字元）。

## 歷史包袱與 backfill 紀錄

- 舊架構只寫 KV，D1 `links` 因舊 schema `user_id NOT NULL` 擋匿名寫入而長期 0 列 → **migration 0012** 重建表（user_id NULL、加 source/is_custom/api_key_id/is_active/flag_reason + 索引）。
- **2026-07-17 backfill 完成**：`POST /api/admin/backfill-links?cursor=`（superadmin、INSERT OR IGNORE 冪等、分批 cursor loop）掃 KV 20,264 keys → D1 20,264 列、0 失敗。其後以 `link_index` 補正 3,054 列 `source='api'` + `api_key_id` + user_id。
- 分佈（backfill 當下）：`backfill` 17,208（全匿名）/ `api` 3,054 / `web` 2。
- endpoint 保留在 admin routes（冪等、可重跑），日後 KV/D1 疑似漂移可再跑一次對帳。KV 讀取為平行（`Promise.all`），一批 250 約 1.5 秒。

## 匿名連結

現行 `POST /api/links` 需登入（cookie JWT）；`links` 表 17,208 條 `user_id IS NULL` 為歷史匿名連結，轉址照常服務，但不歸屬任何帳號。若未來重開匿名建立，走獨立 endpoint 並確保雙寫。

## 相關

- `api-worker/migrations/0012_*.sql` — links 表重建
- `docs/PRODUCT_SPEC.md` — 產品層規格
- E2E：`api-worker/tests/e2e-core.py`（37 斷言，含 links/analytics/admin 路徑）
