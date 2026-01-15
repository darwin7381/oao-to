# OAO.TO 開發環境啟動指南

## 🚀 標準啟動流程（--persist-to 方案）

### **Terminal 1: Core Worker**

```bash
cd /Users/you/Development/media/oao_to/core-worker
wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared
```

**輸出**：
```
Ready on http://localhost:8787
KV Namespace: local
```

---

### **Terminal 2: API Worker**

```bash
cd /Users/you/Development/media/oao_to/api-worker
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared
```

**輸出**：
```
Ready on http://localhost:8788
KV Namespace: local (shared with core-worker)
```

---

### **Terminal 3: Frontend**

```bash
cd /Users/you/Development/media/oao_to/frontend
npm run dev
```

**輸出**：
```
Local: http://localhost:5173
```

---

## ✅ 驗證服務

```bash
# Core Worker
curl http://localhost:8787/health
# {"status":"ok","service":"oao.to-core"}

# API Worker
curl http://localhost:8788/health
# {"status":"ok","service":"oao.to-api"}

# Frontend
open http://localhost:5173
```

---

## 🧪 測試 KV 共享

```bash
# 1. 創建短網址
curl -X POST http://localhost:8788/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com","customSlug":"gh"}'

# 回應: {"slug":"gh","shortUrl":"http://localhost:8787/gh"}

# 2. 測試重定向
curl -I http://localhost:8787/gh
# HTTP/1.1 301 Moved Permanently
# Location: https://github.com

✅ 成功！KV 共享正常！
```

---

## 📝 服務地址

| 服務 | 地址 | 用途 |
|------|------|------|
| Core Worker | http://localhost:8787 | 短網址重定向 |
| API Worker | http://localhost:8788 | API 服務 |
| Frontend | http://localhost:5173 | 管理介面 |

---

## 🔧 前端配置

**已配置的 API 端點**：
- 開發：`http://localhost:8788`
- 生產：`https://api.oao.to`

**已配置的短網址 Base**：
- 開發：`http://localhost:8787`
- 生產：`https://oao.to`

---

## 🐛 故障排除

### **問題：Frontend 顯示 "Failed to fetch"**

**檢查**：
```bash
# 1. 確認 API Worker 正在運行
curl http://localhost:8788/health

# 2. 檢查前端 Console 的錯誤
# 看看實際調用的 URL 是什麼
```

**解決**：
- 確保 API Worker 在 port 8788
- 確保前端 API URL 指向 `http://localhost:8788`

---

### **問題：KV 數據不共享**

**檢查**：
```bash
# 1. 確認兩個 Worker 都用 --persist-to
ps aux | grep "wrangler dev" | grep "persist-to"

# 2. 確認共享目錄存在
ls -la .wrangler/oao-shared/v3/kv/
```

**解決**：
- 重啟時務必加上 `--persist-to ../.wrangler/oao-shared`

---

## 📋 快速參考

**完整啟動腳本**（複製貼上）：

```bash
# Terminal 1
cd core-worker && wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared

# Terminal 2
cd api-worker && wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared

# Terminal 3
cd frontend && npm run dev
```

**全部服務啟動後，訪問**：
```
http://localhost:5173
```

---

## ✅ 確認清單

啟動前確認：
- [ ] 已停止所有舊的 wrangler 進程
- [ ] core-worker 和 api-worker 的 KV id 相同
- [ ] 兩個都使用 `--persist-to ../.wrangler/oao-shared`

啟動後確認：
- [ ] Core Worker: http://localhost:8787/health 回應正常
- [ ] API Worker: http://localhost:8788/health 回應正常
- [ ] Frontend: http://localhost:5173 可以訪問

測試確認：
- [ ] 前端可以創建短網址
- [ ] 顯示的短網址格式：`http://localhost:8787/[slug]`
- [ ] 點擊短網址能正常重定向

---

**參考完整文檔**：`MULTI_WORKER_DEVELOPMENT_GUIDE.md`

