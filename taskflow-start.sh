#!/bin/bash
echo "==========================================="
echo "   Task-Flow Portable Startup Script (Linux/Mac)  "
echo "==========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Error: Node.js is not installed. Please install Node.js v18 or higher."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js detected: $(node -v)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed."
fi

# Ask the user if they want to build for production or run in dev mode
echo ""
echo "Select mode:"
echo "1) Production Mode (Faster performance, requires build)"
echo "2) Development Mode (Instant start, live reload)"
read -p "Enter 1 or 2 [Default: 2]: " mode

if [ "$mode" == "1" ]; then
    prod_port=6000
    while true; do
        # Check if the port is in use using lsof or netstat
        if lsof -Pi :$prod_port -sTCP:LISTEN -t &>/dev/null || netstat -tuln 2>/dev/null | grep -q ":$prod_port "; then
            echo "⚠️ Port $prod_port is in use. Checking next..."
            prod_port=$((prod_port+1))
        else
            break
        fi
    done
    echo "✅ Found available port for Production: $prod_port"
    echo "🔨 Building Task-Flow..."
    npm run build
    
    echo "🚀 Starting Task-Flow Production Server on port $prod_port in background..."
    npx next start -p $prod_port &
    SERVER_PID=$!
    
    echo "⏳ Waiting for server to initialize (5s)..."
    sleep 5
    
    echo "☁️ Starting Cloudflare Tunnel automatically..."
    API_URL="http://localhost:$prod_port/api/tunnel"
    START_RESP=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d '{"action":"start"}' 2>/dev/null)
    
    echo ""
    echo "==========================================="
    echo "   Task-Flow Production URL and Tunnel Info"
    echo "==========================================="
    echo "$START_RESP"
    echo "==========================================="
    echo ""
    
    read -p "Press [Enter] at any time to stop the server and tunnel..."
    
    echo ""
    echo "🛑 Stopping Cloudflare Tunnel..."
    curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d '{"action":"stop"}' &>/dev/null
    
    echo "🛑 Stopping Next.js Server process..."
    kill $SERVER_PID
    echo "✅ Cleanup complete."
else
    echo "🚀 Starting Task-Flow Development Server..."
    npm run dev
fi
