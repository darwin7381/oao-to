#!/bin/bash

# 測試腳本：驗證從 .dev.vars 讀取變數的功能

echo "=== 測試讀取 .dev.vars ==="
echo ""

cd "$(dirname "$0")/api-worker"

# 安全讀取 .dev.vars 的函數（與 setup-production-secrets.sh 相同）
read_var() {
    local var_name="$1"
    local value=$(grep "^${var_name}=" .dev.vars | head -1 | cut -d'"' -f2)
    echo "$value"
}

# 讀取變數
CLOUDFLARE_ACCOUNT_ID=$(read_var "CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN=$(read_var "CLOUDFLARE_API_TOKEN")
JWT_SECRET=$(read_var "JWT_SECRET")

echo "測試結果："
echo "---"
echo "CLOUDFLARE_ACCOUNT_ID:"
echo "  值: $CLOUDFLARE_ACCOUNT_ID"
echo "  長度: ${#CLOUDFLARE_ACCOUNT_ID}"
echo "  前 8 字元: ${CLOUDFLARE_ACCOUNT_ID:0:8}"
echo "  預期: b1d3f8b3 (長度 32)"
echo ""

echo "CLOUDFLARE_API_TOKEN:"
echo "  值: $CLOUDFLARE_API_TOKEN"
echo "  長度: ${#CLOUDFLARE_API_TOKEN}"
echo "  前 10 字元: ${CLOUDFLARE_API_TOKEN:0:10}"
echo "  預期: VtfR76VD6- (長度 40)"
echo ""

echo "JWT_SECRET:"
echo "  長度: ${#JWT_SECRET}"
echo "  前 20 字元: ${JWT_SECRET:0:20}..."
echo ""

# 驗證
echo "---"
echo "驗證結果："
if [ "${#CLOUDFLARE_ACCOUNT_ID}" -eq 32 ]; then
    echo "✅ CLOUDFLARE_ACCOUNT_ID 長度正確 (32)"
else
    echo "❌ CLOUDFLARE_ACCOUNT_ID 長度錯誤 (${#CLOUDFLARE_ACCOUNT_ID}, 應為 32)"
fi

if [ "${#CLOUDFLARE_API_TOKEN}" -eq 40 ]; then
    echo "✅ CLOUDFLARE_API_TOKEN 長度正確 (40)"
else
    echo "❌ CLOUDFLARE_API_TOKEN 長度錯誤 (${#CLOUDFLARE_API_TOKEN}, 應為 40)"
fi

if [ "${CLOUDFLARE_ACCOUNT_ID:0:8}" = "b1d3f8b3" ]; then
    echo "✅ CLOUDFLARE_ACCOUNT_ID 前綴正確"
else
    echo "❌ CLOUDFLARE_ACCOUNT_ID 前綴錯誤 (${CLOUDFLARE_ACCOUNT_ID:0:8}, 應為 b1d3f8b3)"
fi

if [ "${CLOUDFLARE_API_TOKEN:0:10}" = "VtfR76VD6-" ]; then
    echo "✅ CLOUDFLARE_API_TOKEN 前綴正確"
else
    echo "❌ CLOUDFLARE_API_TOKEN 前綴錯誤 (${CLOUDFLARE_API_TOKEN:0:10}, 應為 VtfR76VD6-)"
fi

