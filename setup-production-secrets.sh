#!/bin/bash

# 設定生產環境 Secrets 的腳本
# 使用方式：在專案根目錄執行 ./setup-production-secrets.sh

set -e  # 遇到錯誤立即停止

echo "=== 設定 OAO.TO 生產環境 Secrets ==="
echo ""

# 切換到 api-worker 目錄
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
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "❌ 錯誤：CLOUDFLARE_ACCOUNT_ID 為空"
    exit 1
fi
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ 錯誤：CLOUDFLARE_API_TOKEN 為空"
    exit 1
fi

# 顯示將要設定的變數（隱藏敏感資訊）
echo ""
echo "即將設定以下 secrets 到生產環境："
echo "1. CLOUDFLARE_ACCOUNT_ID (長度: ${#CLOUDFLARE_ACCOUNT_ID}, 前綴: ${CLOUDFLARE_ACCOUNT_ID:0:8}...)"
echo "2. CLOUDFLARE_API_TOKEN (長度: ${#CLOUDFLARE_API_TOKEN}, 前綴: ${CLOUDFLARE_API_TOKEN:0:10}...)"
echo "3. JWT_SECRET (長度: ${#JWT_SECRET})"
echo "4. API_URL (https://api.oao.to)"
echo "5. FRONTEND_URL (https://app.oao.to)"
echo "6. GOOGLE_CLIENT_ID"
echo "7. GOOGLE_CLIENT_SECRET"
echo "8. SUPERADMIN_EMAILS ($SUPERADMIN_EMAILS)"
echo ""
read -p "確認繼續？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

echo ""
echo "⚙️  開始設定 secrets..."

# CLOUDFLARE_ACCOUNT_ID
echo "設定 CLOUDFLARE_ACCOUNT_ID..."
echo "$CLOUDFLARE_ACCOUNT_ID" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID -e production

# CLOUDFLARE_API_TOKEN
echo "設定 CLOUDFLARE_API_TOKEN..."
echo "$CLOUDFLARE_API_TOKEN" | npx wrangler secret put CLOUDFLARE_API_TOKEN -e production

# JWT_SECRET
echo "設定 JWT_SECRET..."
echo "$JWT_SECRET" | npx wrangler secret put JWT_SECRET -e production

# API_URL
echo "設定 API_URL..."
echo "https://api.oao.to" | npx wrangler secret put API_URL -e production

# FRONTEND_URL  
echo "設定 FRONTEND_URL..."
echo "https://app.oao.to" | npx wrangler secret put FRONTEND_URL -e production

# GOOGLE_CLIENT_ID
echo "設定 GOOGLE_CLIENT_ID..."
echo "$GOOGLE_CLIENT_ID" | npx wrangler secret put GOOGLE_CLIENT_ID -e production

# GOOGLE_CLIENT_SECRET
echo "設定 GOOGLE_CLIENT_SECRET..."
echo "$GOOGLE_CLIENT_SECRET" | npx wrangler secret put GOOGLE_CLIENT_SECRET -e production

# SUPERADMIN_EMAILS
echo "設定 SUPERADMIN_EMAILS..."
echo "$SUPERADMIN_EMAILS" | npx wrangler secret put SUPERADMIN_EMAILS -e production

echo ""
echo "✅ 所有 Secrets 設定完成！"
echo ""
echo "📝 下一步："
echo "  1. 部署 API Worker: cd api-worker && npx wrangler deploy -e production"
echo "  2. 部署 Core Worker: cd core-worker && npx wrangler deploy -e production"
echo ""

