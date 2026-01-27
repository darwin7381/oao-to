#!/bin/bash
set -e

echo "🧪 完整後端 API 測試"
echo "===================="
echo ""

# 生成測試 token
export TEST_TOKEN=$(node gen-token.js 2>&1 | head -1)
echo "Token: ${TEST_TOKEN:0:20}..."
echo ""

# 測試計數器
PASS=0
FAIL=0

test_api() {
  local name=$1
  local method=$2
  local url=$3
  local data=$4
  
  echo "Testing: $name"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$url" -H "Authorization: Bearer $TEST_TOKEN")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $TEST_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  status=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$status" = "200" ] || [ "$status" = "201" ]; then
    echo "  ✅ $status"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $status"
    echo "  Response: $body"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

# Admin APIs
echo "📋 Admin APIs"
echo "-------------"
test_api "Stats" "GET" "http://localhost:8788/api/admin/stats"
test_api "Users" "GET" "http://localhost:8788/api/admin/users"
test_api "Links" "GET" "http://localhost:8788/api/admin/links"
test_api "API Keys" "GET" "http://localhost:8788/api/admin/api-keys"
test_api "Analytics" "GET" "http://localhost:8788/api/admin/analytics"
test_api "Credits Users" "GET" "http://localhost:8788/api/admin/credits/users"
test_api "Payments" "GET" "http://localhost:8788/api/admin/payments"

# Audit Logs
echo "📊 Audit Logs APIs"
echo "------------------"
test_api "Audit Logs List" "GET" "http://localhost:8788/api/admin/audit-logs"
test_api "Audit Log Detail" "GET" "http://localhost:8788/api/admin/audit-logs/audit_1769406475712_mrqxh5zni"

# Support
echo "🎫 Support APIs"
echo "---------------"
test_api "Support Tickets" "GET" "http://localhost:8788/api/admin/support/tickets"
test_api "Support Ticket Detail" "GET" "http://localhost:8788/api/admin/support/tickets/ticket_test_001"

# Plans
echo "💰 Plans APIs"
echo "-------------"
test_api "Plans List" "GET" "http://localhost:8788/api/admin/plans"

# Account APIs
echo "👤 Account APIs"
echo "---------------"
test_api "My Credits" "GET" "http://localhost:8788/api/account/credits"
test_api "My Transactions" "GET" "http://localhost:8788/api/account/transactions"
test_api "My API Keys" "GET" "http://localhost:8788/api/account/keys"

# Links & Analytics
echo "🔗 Links & Analytics APIs"
echo "-------------------------"
test_api "My Links (D1)" "GET" "http://localhost:8788/api/links"
test_api "Test List (KV)" "GET" "http://localhost:8788/test-list"

# Summary
echo "===================="
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo "Total: $((PASS + FAIL))"

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "🎉 All tests passed!"
  exit 0
else
  echo ""
  echo "⚠️  Some tests failed!"
  exit 1
fi
