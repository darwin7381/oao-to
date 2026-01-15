# OAO.TO Core Worker

**職責**：只處理短網址重定向，極致簡單，極致快速

**域名**：`oao.to`

## 特點

- ⚡ 延遲 < 5ms（只做 KV.get + redirect）
- 📊 背景追蹤點擊（不阻塞）
- 🎯 專注核心功能
- 🚀 99.99% 可用性

## 部署

```bash
npm install
npm run deploy
```

## 本地開發

```bash
npm run dev
```

測試：
```bash
curl -I http://localhost:8787/test
```

