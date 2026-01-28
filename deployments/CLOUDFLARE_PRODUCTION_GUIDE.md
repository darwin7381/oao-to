# Cloudflare 生产环境部署指南

## 🎯 环境配置

### 我们有两个环境

```
开发环境（默认）：
  Database: oao-to-db (db9693c9-d2de-43b7-ad28-e2211e736e16)
  KV: 8f133853496a4bdfb8151a39dd251518
  Domain: *.workers.dev

生产环境（production）：
  Database: oao-to-prod (bc49236e-acc9-499b-ba68-6aa90a000444)
  KV: cb616d868c134b1c9e5e6ef54afb3f64
  Domain: api.oao.to
```

---

## ⚠️ 常见错误：部署到错误的环境

### ❌ 错误做法
```bash
npm run deploy  # 默认部署到开发环境！
wrangler deploy  # 默认部署到开发环境！
wrangler d1 migrations apply oao-to-db --remote  # 错误的数据库名！
```

### ✅ 正确做法
```bash
# API Worker 部署
cd api-worker
wrangler deploy --env=production

# Core Worker 部署（如有變更）
cd ../core-worker
npm run deploy:prod
# 或
wrangler deploy --env=production

# Migration
cd ../api-worker
wrangler d1 migrations apply oao-to-prod --env=production --remote

# 查询生产数据库
wrangler d1 execute oao-to-prod --env=production --remote --command "SELECT ..."
```

---

## 📋 部署检查清单

### 部署前

- [ ] 确认 git 状态干净或已提交
- [ ] 本地测试通过
- [ ] 确认要部署的环境（dev or prod）

### Migration 部署

```bash
# 1. 查看待执行的 migrations
wrangler d1 migrations list oao-to-prod --env=production --remote

# 2. 执行 migrations
wrangler d1 migrations apply oao-to-prod --env=production --remote

# 3. 验证表结构
wrangler d1 execute oao-to-prod --env=production --remote \
  --command "PRAGMA table_info(credits)"

# 4. 验证数据
wrangler d1 execute oao-to-prod --env=production --remote \
  --command "SELECT COUNT(*) FROM credits"
```

### 后端部署

```bash
cd api-worker

# ⚠️ 必须指定 --env=production
wrangler deploy --env=production

# 验证
curl https://api.oao.to/health
```

### 前端部署

```bash
# Cloudflare Pages 自动部署
git push

# 检查部署状态
# 访问 Cloudflare Dashboard > Pages > oao-to-app
```

---

## 🔍 验证清单

### 数据库验证

```bash
# 1. 确认正确的数据库
wrangler d1 execute oao-to-prod --env=production --remote \
  --command "SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 3"

# 2. 验证表结构
wrangler d1 execute oao-to-prod --env=production --remote \
  --command "PRAGMA table_info(credits)"

# 3. 测试动态 JOIN
wrangler d1 execute oao-to-prod --env=production --remote \
  --command "SELECT c.plan_type, p.monthly_credits FROM credits c LEFT JOIN plans p ON c.plan_type = p.name LIMIT 1"
```

### 功能验证

```bash
# API 健康检查
curl https://api.oao.to/health

# 测试 credits 查询（需要 JWT token）
curl https://api.oao.to/api/account/credits \
  -H "Authorization: Bearer YOUR_TOKEN"

# 测试创建短网址（需要 API key）
curl -X POST https://api.oao.to/v1/links \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

---

## 🚨 紧急回滚

如果部署出现问题：

```bash
# 1. 回滚 Worker 版本
wrangler rollback --env=production

# 2. Migration 无法自动回滚！
# 需要手动执行反向 SQL 或恢复备份

# 3. 前端回滚
# Cloudflare Pages Dashboard > Deployments > Rollback
```

---

## 💡 最佳实践

### 1. 始终明确指定环境
```bash
# 好习惯：明确写出 --env
wrangler deploy --env=production
wrangler deploy --env=development

# 坏习惯：依赖默认值
wrangler deploy  # 容易出错！
```

### 2. Migration 先测试
```bash
# 先在开发环境测试
wrangler d1 migrations apply oao-to-db --local

# 确认无误后再生产
wrangler d1 migrations apply oao-to-prod --env=production --remote
```

### 3. 部署前备份关键数据
```bash
# 导出 credits 数据
wrangler d1 execute oao-to-prod --env=production --remote \
  --command "SELECT * FROM credits" > backup_credits.json
```

---

## 📝 环境对应表

| 资源 | 开发环境 | 生产环境 |
|------|---------|---------|
| Worker 名称 | oao-to-api | oao-to-api-production |
| Database 名称 | oao-to-db | oao-to-prod |
| Database ID | db9693c9... | bc49236e... |
| KV ID | 8f133853... | cb616d86... |
| Domain | *.workers.dev | api.oao.to |
| 部署命令 | `wrangler deploy` | `wrangler deploy --env=production` |

---

## 🎯 快速参考

```bash
# === 生产环境操作 ===

# 查询数据库
wrangler d1 execute oao-to-prod --env=production --remote --command "..."

# 执行 Migration
wrangler d1 migrations apply oao-to-prod --env=production --remote

# 部署 Worker
wrangler deploy --env=production

# 查看日志
wrangler tail --env=production

# === 记住 ===
生产 = oao-to-prod + --env=production
```

**记住这个规则，避免部署到错误环境！**
