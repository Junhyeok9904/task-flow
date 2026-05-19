#!/bin/bash
# ==========================================
#  Task-Flow Tunnel Status Checker (Linux/Mac)
# ==========================================

PORT=${1:-3000}
API_URL="http://localhost:${PORT}/api/tunnel"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ☁️  Task-Flow Tunnel Status Checker    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check if the server is even running
check_server() {
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}" 2>/dev/null
}

check_tunnel() {
  RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"action":"status"}' 2>/dev/null)

  if [ -z "$RESPONSE" ]; then
    echo "❌ Task-Flow 서버가 응답하지 않습니다. (http://localhost:${PORT})"
    echo "   → 먼저 서버를 시작하세요: ./taskflow-start.sh"
    return 1
  fi

  STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

  if [ "$STATUS" == "running" ] && [ -n "$URL" ]; then
    echo "✅ Tunnel Active!"
    echo ""
    echo "┌──────────────────────────────────────────┐"
    echo "│  🌐 Public URL:                          │"
    echo "│  $URL"
    echo "│                                          │"
    echo "│  📋 Copy this URL to share your app!     │"
    echo "└──────────────────────────────────────────┘"
    echo ""
    return 0
  else
    echo "⚫ Tunnel is OFFLINE."
    echo "   → 웹 UI에서 'Start Public Tunnel' 버튼을 클릭하세요."
    echo "   → 또는 이 스크립트에서 바로 시작할 수 있습니다."
    return 2
  fi
}

start_tunnel() {
  echo "🚀 Tunnel을 시작합니다..."
  RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"action":"start"}' 2>/dev/null)

  URL=$(echo "$RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
  ERROR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$URL" ]; then
    echo ""
    echo "✅ Tunnel이 성공적으로 시작되었습니다!"
    echo ""
    echo "┌──────────────────────────────────────────┐"
    echo "│  🌐 Public URL:                          │"
    echo "│  $URL"
    echo "│                                          │"
    echo "│  📋 Copy this URL to share your app!     │"
    echo "└──────────────────────────────────────────┘"
  elif [ -n "$ERROR" ]; then
    echo "❌ Error: $ERROR"
  else
    echo "❌ 알 수 없는 오류가 발생했습니다."
    echo "   Response: $RESPONSE"
  fi
}

stop_tunnel() {
  echo "🛑 Tunnel을 중지합니다..."
  curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"action":"stop"}' > /dev/null 2>&1
  echo "✅ Tunnel이 중지되었습니다."
}

# Main logic
check_tunnel
RESULT=$?

if [ $RESULT -eq 1 ]; then
  # Server not running
  exit 1
fi

if [ $RESULT -eq 0 ]; then
  # Tunnel is running, ask if user wants to stop
  echo ""
  read -p "터널을 중지하시겠습니까? (y/N): " choice
  if [ "$choice" == "y" ] || [ "$choice" == "Y" ]; then
    stop_tunnel
  fi
else
  # Tunnel is not running, ask if user wants to start
  echo ""
  read -p "터널을 시작하시겠습니까? (Y/n): " choice
  if [ "$choice" != "n" ] && [ "$choice" != "N" ]; then
    start_tunnel
  fi
fi

echo ""
echo "Done."
