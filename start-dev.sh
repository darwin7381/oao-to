#!/bin/bash
set -e

# 記住專案根目錄
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 啟動 OAO.TO 開發環境..."
echo ""

# 啟動 Core Worker
echo "📦 啟動 Core Worker (oao.to)..."
cd "$PROJECT_ROOT/core-worker"
wrangler dev --port 8787 --persist-to ../.wrangler/oao-shared &
CORE_PID=$!
sleep 3

# 啟動 API Worker
echo "📦 啟動 API Worker (api.oao.to)..."
cd "$PROJECT_ROOT/api-worker"
wrangler dev --port 8788 --persist-to ../.wrangler/oao-shared &
API_PID=$!
sleep 3

# 啟動 Frontend
echo "🎨 啟動 Frontend (app.oao.to)..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 所有服務已啟動！"
echo ""
echo "📍 訪問:"
echo "   Frontend: http://localhost:5173"
echo "   Core Worker: http://localhost:8787"
echo "   API Worker: http://localhost:8788"
echo ""
echo "按 Ctrl+C 停止所有服務"

# 等待中斷信號
trap "echo ''; echo '🛑 停止所有服務...'; kill $CORE_PID $API_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
