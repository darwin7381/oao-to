#!/bin/bash
set -e

echo "========================================="
echo "修正生產環境部署"
echo "========================================="
echo ""

# 1. Core Worker
echo "1. 部署 Core Worker（production）"
cd core-worker
wrangler deploy --env production
echo "✅ Core Worker 部署完成"
echo ""

# 2. API Worker  
echo "2. 部署 API Worker（production）"
cd ../api-worker

# 先檢查 production D1 是否需要 migrations
echo "檢查 migrations 狀態..."
wrangler d1 migrations list DB --env production --remote 2>&1 || echo "需要執行 migrations"

# 執行 migrations
echo "執行 migrations..."
wrangler d1 migrations apply DB --env production --remote

echo "✅ Migrations 完成"
echo ""

# 部署 Worker
echo "部署 API Worker..."
wrangler deploy --env production

echo "✅ API Worker 部署完成"
echo ""

# 3. 測試
echo "3. 測試生產環境"
echo "Core: https://oao.to"
curl -s https://oao.to/health | head -1
echo ""
echo "API: https://api.oao.to"
curl -s https://api.oao.to/health | head -1
echo ""

echo "========================================="
echo "✅ 部署完成"
echo "========================================="
