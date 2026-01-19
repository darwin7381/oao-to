#!/bin/bash

# Dry-run 測試：驗證 setup-production-secrets.sh 的邏輯
# 不會實際上傳 secrets，只測試讀取和驗證

set -e

echo "=== Dry-run 測試 setup-production-secrets.sh ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/api-worker"

# 檢查 .dev.vars 是否存在
if [ ! -f ".dev.vars" ]; then
    echo "❌ 錯誤：找不到 .dev.vars 檔案"
    exit 1
fi

# 安全讀取 .dev.vars 的函數
read_var() {
    local var_name="$1"
    local value=$(grep "^${var_name}=" .dev.vars | head -1 | cut -d'"' -f2)
    echo "$value"
}

# 讀取所有變數
echo "📖 從 .dev.vars 讀取配置..."
CLOUDFLARE_ACCOUNT_ID=$(read_var "CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN=$(read_var "CLOUDFLARE_API_TOKEN")
JWT_SECRET=$(read_var "JWT_SECRET")
GOOGLE_CLIENT_ID=$(read_var "GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET=$(read_var "GOOGLE_CLIENT_SECRET")
SUPERADMIN_EMAILS=$(read_var "SUPERADMIN_EMAILS")

# 驗證必要變數
echo ""
echo "🔍 驗證變數..."
ALL_VALID=true

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "❌ CLOUDFLARE_ACCOUNT_ID 為空"
    ALL_VALID=false
elif [ "${#CLOUDFLARE_ACCOUNT_ID}" -ne 32 ]; then
    echo "❌ CLOUDFLARE_ACCOUNT_ID 長度錯誤 (${#CLOUDFLARE_ACCOUNT_ID}, 應為 32)"
    ALL_VALID=false
else
    echo "✅ CLOUDFLARE_ACCOUNT_ID (長度: ${#CLOUDFLARE_ACCOUNT_ID}, 前綴: ${CLOUDFLARE_ACCOUNT_ID:0:8}...)"
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN 為空"
    ALL_VALID=false
elif [ "${#CLOUDFLARE_API_TOKEN}" -ne 40 ]; then
    echo "❌ CLOUDFLARE_API_TOKEN 長度錯誤 (${#CLOUDFLARE_API_TOKEN}, 應為 40)"
    ALL_VALID=false
else
    echo "✅ CLOUDFLARE_API_TOKEN (長度: ${#CLOUDFLARE_API_TOKEN}, 前綴: ${CLOUDFLARE_API_TOKEN:0:10}...)"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET 為空"
    ALL_VALID=false
else
    echo "✅ JWT_SECRET (長度: ${#JWT_SECRET})"
fi

if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo "⚠️  GOOGLE_CLIENT_ID 為空（可選）"
else
    echo "✅ GOOGLE_CLIENT_ID (長度: ${#GOOGLE_CLIENT_ID})"
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "⚠️  GOOGLE_CLIENT_SECRET 為空（可選）"
else
    echo "✅ GOOGLE_CLIENT_SECRET (長度: ${#GOOGLE_CLIENT_SECRET})"
fi

if [ -z "$SUPERADMIN_EMAILS" ]; then
    echo "⚠️  SUPERADMIN_EMAILS 為空（可選）"
else
    echo "✅ SUPERADMIN_EMAILS: $SUPERADMIN_EMAILS"
fi

# 模擬將要設定的 secrets
echo ""
echo "📋 將要設定的 secrets (Dry-run 模式):"
echo "---"
echo "1. CLOUDFLARE_ACCOUNT_ID: ${CLOUDFLARE_ACCOUNT_ID}"
echo "2. CLOUDFLARE_API_TOKEN: ${CLOUDFLARE_API_TOKEN}"
echo "3. JWT_SECRET: ${JWT_SECRET:0:20}... (長度: ${#JWT_SECRET})"
echo "4. API_URL: https://api.oao.to"
echo "5. FRONTEND_URL: https://app.oao.to"
echo "6. GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}"
echo "7. GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:0:15}... (長度: ${#GOOGLE_CLIENT_SECRET})"
echo "8. SUPERADMIN_EMAILS: ${SUPERADMIN_EMAILS}"
echo ""

if [ "$ALL_VALID" = true ]; then
    echo "✅ 所有必要變數驗證通過！"
    echo "✅ setup-production-secrets.sh 應該能正常運作"
    exit 0
else
    echo "❌ 有變數驗證失敗"
    exit 1
fi

