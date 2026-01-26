#!/bin/bash
# 測試 Audit Logs API

export ADMIN_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const payload = {
  userId: '89a982be-98e9-456c-bf59-55da3bfbb380',
  email: 'joey@cryptoxlab.com',
  name: 'Joey Luo',
  role: 'superadmin',
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
};
console.log(jwt.sign(payload, 'your-secret-key-here', { algorithm: 'HS256' }));
")

echo "Testing Audit Logs API..."
echo "Token: $ADMIN_TOKEN"
echo ""

curl -v http://localhost:8788/api/admin/audit-logs \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  2>&1 | grep -E "< HTTP|permission|error|data"
