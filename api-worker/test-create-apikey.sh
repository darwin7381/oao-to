#!/bin/bash
# 需要一個有效的 JWT token 來測試

echo "如果您有有效的 JWT token，請執行："
echo ""
echo "curl -X POST https://api.oao.to/api/account/keys \\"
echo "  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"name\":\"Test Key\",\"scopes\":[\"links:read\",\"links:write\"]}'"
