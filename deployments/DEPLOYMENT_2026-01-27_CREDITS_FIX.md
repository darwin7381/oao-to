# Credits 系统修复部署指南 - 2026-01-27

## 📋 修复内容

### 问题 1：Credits 余额显示不变
**根因**：前端只显示 `balance`，未包含 `monthly_remaining`  
**修复**：显示总可用 = `monthly_remaining + balance`

### 问题 2：My Links 显示所有连结
**根因**：D1 `links` 表为空，前端使用了不安全的 `/test-list` 端点  
**修复**：使用认证端点 `/api/links`，从 KV 读取并过滤用户数据

### 问题 3：扣款逻辑错误
**根因**：扣款时同步减少 `purchased_balance`（应该只减 `balance`）  
**修复**：只扣 `balance`，来源追踪字段不变

---

## 🔧 修改的文件

1. ✅ `frontend/src/pages/dashboard/Credits.tsx` - 修正显示公式
2. ✅ `frontend/src/lib/api.ts` - 使用认证端点
3. ✅ `api-worker/src/routes/links.ts` - 添加认证并从 KV 过滤
4. ✅ `api-worker/src/utils/credit-manager.ts` - 修正扣款逻辑
5. ✅ `api-worker/fix-credits-classification.sql` - 数据修复脚本

---

## 📦 部署步骤

### Step 1: 修复数据库数据

```bash
cd api-worker

# 本地测试（可选）
wrangler d1 execute oao-to-db --local --file=fix-credits-classification.sql

# 生产环境修复
wrangler d1 execute oao-to-db --remote --file=fix-credits-classification.sql
```

**预期输出**：
- 显示需要修复的记录数
- 执行修复
- 验证 `still_wrong = 0`

### Step 2: 部署后端

```bash
cd api-worker
npm run deploy
```

**预期输出**：
```
✨ Successfully published your script to
 https://api.oao.to
```

### Step 3: 部署前端

```bash
# 前端由 Cloudflare Pages 自动部署
# 推送代码即可
git add frontend/
git commit -m "fix: credits display and links auth"
git push
```

**预期**：
- Cloudflare Pages 自动触发构建
- 约 2-3 分钟完成部署

### Step 4: 清除缓存并验证

1. 打开浏览器开发者工具
2. 右键点击刷新按钮
3. 选择「清空缓存并强制刷新」

---

## ✅ 验证清单

### 1. Credits 页面验证

访问：`https://app.oao.to/dashboard/credits`

**检查项**：
- [ ] Available Credits 显示 **198**（而非 100）
- [ ] 显示「本月免費：98」
- [ ] 显示「付費餘額：100」
- [ ] Monthly Quota 进度条显示 2/100 (2%)

**使用 API 创建 1 个连结后**：
- [ ] Available Credits: 198 → 197 ✓
- [ ] 本月免费：98 → 97 ✓
- [ ] 付费余额：100 → 100（不变）✓
- [ ] Monthly Quota: 2/100 → 3/100 ✓

### 2. My Links 页面验证

访问：`https://app.oao.to/dashboard`

**检查项**：
- [ ] Total Links 显示**该用户自己的连结数量**（不是 57）
- [ ] 连结列表只显示该用户创建的
- [ ] 管理员访问时，也只看到自己的（不是所有系统的）

**API 请求验证**：
- [ ] 打开 Network 面板
- [ ] 刷新页面
- [ ] 确认请求 `GET /api/links` 带有 `Authorization: Bearer ...`
- [ ] 响应只包含该用户的连结

### 3. 交易记录验证

访问：`https://app.oao.to/dashboard/credits`

**检查 Recent Transactions**：
- [ ] 显示「Create short link via API -1」
- [ ] balance_after 字段正确（使用月配额时不变，超过配额时减少）

---

## 🎯 预期效果

### 修复前
```
Credits 页面：
  Total Balance: 100 ← 不变（误导）
  
My Links：
  Total Links: 57 ← 看到所有人的
```

### 修复后
```
Credits 页面：
  Available Credits: 198 ← 正确的总可用
  - 本月免费：98
  - 付费余额：100
  
My Links：
  Total Links: 2 ← 只看到自己的
```

---

## 🐛 如果出现问题

### 问题：Credits 还是显示 100

**原因**：前端缓存或未部署  
**解决**：
1. 确认 Cloudflare Pages 部署完成
2. 强制刷新（Cmd+Shift+R）
3. 清除 LocalStorage

### 问题：My Links 还是显示 57 个

**原因**：后端未部署或前端缓存  
**解决**：
1. 确认 `npm run deploy` 成功
2. 检查 Network 面板确认使用 `/api/links`
3. 清除缓存

### 问题：API 请求 401 Unauthorized

**原因**：Token 过期或丢失  
**解决**：
1. 重新登录
2. 检查 LocalStorage 中的 `token`

---

## 📊 部署后监控

### 1. 检查错误日志
```bash
# 查看 Worker 日志
wrangler tail --format=pretty
```

### 2. 检查数据一致性
```bash
wrangler d1 execute oao-to-db --remote --command \
  "SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN purchased_balance = 0 AND total_purchased = 0 THEN 1 ELSE 0 END) as correct
   FROM credits 
   WHERE plan_type = 'free'"
```

---

## ✅ 完成标志

- [x] 后端部署成功
- [x] 前端部署成功
- [ ] Credits 显示 198
- [ ] My Links 只显示自己的
- [ ] 使用后余额正确减少
- [ ] 无 console 错误

全部完成后，此修复即为成功！
