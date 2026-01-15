#!/bin/bash

# 設定生產環境 Secrets 的腳本
# 請在 api-worker 目錄執行

echo "=== 設定 OAO.TO 生產環境 Secrets ==="
echo ""

cd "$(dirname "$0")/api-worker"

# 從 .dev.vars 讀取值作為參考
echo "從 .dev.vars 讀取本地配置作為參考..."
source .dev.vars

echo ""
echo "即將設定以下 secrets 到生產環境："
echo "1. API_URL"
echo "2. FRONTEND_URL"
echo "3. GOOGLE_CLIENT_ID"
echo "4. GOOGLE_CLIENT_SECRET"
echo "5. SUPERADMIN_EMAILS"
echo ""

# API_URL
echo "設定 API_URL..."
echo "https://api.oao.to" | wrangler secret put API_URL -e production

# FRONTEND_URL  
echo "設定 FRONTEND_URL..."
echo "https://app.oao.to" | wrangler secret put FRONTEND_URL -e production

# GOOGLE_CLIENT_ID
echo "設定 GOOGLE_CLIENT_ID..."
echo "$GOOGLE_CLIENT_ID" | wrangler secret put GOOGLE_CLIENT_ID -e production

# GOOGLE_CLIENT_SECRET
echo "設定 GOOGLE_CLIENT_SECRET..."
echo "$GOOGLE_CLIENT_SECRET" | wrangler secret put GOOGLE_CLIENT_SECRET -e production

# SUPERADMIN_EMAILS
echo "設定 SUPERADMIN_EMAILS..."
echo "$SUPERADMIN_EMAILS" | wrangler secret put SUPERADMIN_EMAILS -e production

echo ""
echo "✅ 所有 Secrets 設定完成！"
echo ""
echo "現在可以部署了："
echo "  wrangler deploy -e production"

