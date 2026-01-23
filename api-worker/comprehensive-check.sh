#!/bin/bash
echo "========================================="
echo "OAO.TO API 平台全面檢查"
echo "========================================="
echo ""

echo "1️⃣ 資料庫表結構檢查"
echo "---"
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command "
SELECT name, type FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY type, name
" | grep -E "(users|api_keys|credits|credit_transactions|api_usage_stats|link_index|idx_)"

echo ""
echo "2️⃣ 用戶數據檢查"
echo "---"
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command "
SELECT COUNT(*) as total_users, 
       SUM(CASE WHEN role = 'superadmin' THEN 1 ELSE 0 END) as superadmins,
       SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
       SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as users
FROM users
"

echo ""
echo "3️⃣ API Keys 檢查"
echo "---"
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command "
SELECT COUNT(*) as total_keys,
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_keys
FROM api_keys
"

echo ""
echo "4️⃣ Credits 帳戶檢查"
echo "---"
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command "
SELECT COUNT(*) as total_accounts,
       SUM(balance) as total_balance,
       SUM(monthly_used) as total_monthly_used,
       SUM(total_purchased) as total_purchased,
       SUM(total_used) as total_used
FROM credits
"

echo ""
echo "5️⃣ 交易記錄檢查"
echo "---"
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command "
SELECT type, COUNT(*) as count, SUM(amount) as total_amount
FROM credit_transactions
GROUP BY type
"

echo ""
echo "6️⃣ 短網址索引檢查"
echo "---"
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command "
SELECT created_via, COUNT(*) as count
FROM link_index
GROUP BY created_via
"

echo ""
echo "7️⃣ Joey 帳號完整檢查"
echo "---"
wrangler d1 execute oao-to-db --local --persist-to ../.wrangler/oao-shared --command "
SELECT 
  u.email,
  u.role,
  c.balance,
  c.monthly_quota,
  c.monthly_used,
  c.plan_type,
  (SELECT COUNT(*) FROM api_keys WHERE user_id = u.id) as api_keys_count,
  (SELECT COUNT(*) FROM link_index WHERE user_id = u.id) as links_count
FROM users u
LEFT JOIN credits c ON u.id = c.user_id
WHERE u.email = 'joey@cryptoxlab.com'
"

echo ""
echo "========================================="
echo "檢查完成"
echo "========================================="
