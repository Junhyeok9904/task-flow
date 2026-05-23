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
    
    export START_RESP_ENV="$START_RESP"
    TUNNEL_URL=$(node -e "try { console.log(JSON.parse(process.env.START_RESP_ENV).url || ''); } catch(e) { console.log(''); }")
    TUNNEL_STATUS=$(node -e "try { console.log(JSON.parse(process.env.START_RESP_ENV).status || ''); } catch(e) { console.log(''); }")
    TUNNEL_ERR=$(node -e "try { console.log(JSON.parse(process.env.START_RESP_ENV).error || ''); } catch(e) { console.log(''); }")

    echo ""
    echo "==========================================="
    echo "   Task-Flow Production URL and Tunnel Info"
    echo "==========================================="
    if [ ! -z "$TUNNEL_URL" ]; then
        echo "  🟢 Status: $TUNNEL_STATUS"
        echo "  🔗 Public URL: $TUNNEL_URL"
        echo "  🏠 Local URL:  http://localhost:$prod_port"
    else
        echo "  ❌ Status: Error"
        if [ ! -z "$TUNNEL_ERR" ]; then
            echo "  ❌ Error Details: $TUNNEL_ERR"
        else
            echo "  ❌ Could not start or parse tunnel info."
        fi
    fi
    echo "==========================================="
    echo ""

    if [ ! -z "$TUNNEL_URL" ]; then
        echo "Select tunnel URL sharing option:"
        echo "1) Open URL in Brave Browser (PC) to use Brave Sync/Send-to-device"
        echo "2) Open QR Code image in Browser (Scan with Mobile Camera)"
        echo "3) Send directly to connected Android Mobile (via ADB)"
        echo "4) Skip sharing [Default: 4]"
        read -p "Enter choice (1-4): " share_choice
        
        case "$share_choice" in
            1)
                # Open in Brave
                if [ "$(uname)" == "Darwin" ]; then
                    if [ -d "/Applications/Brave Browser.app" ]; then
                        echo "🚀 Opening Brave Browser..."
                        open -a "Brave Browser" "$TUNNEL_URL"
                    else
                        echo "⚠️ Brave Browser not found. Opening in default browser..."
                        open "$TUNNEL_URL"
                    fi
                else
                    if command -v brave-browser &> /dev/null; then
                        echo "🚀 Opening Brave Browser..."
                        brave-browser "$TUNNEL_URL" &
                    elif command -v brave &> /dev/null; then
                        echo "🚀 Opening Brave Browser..."
                        brave "$TUNNEL_URL" &
                    else
                        echo "⚠️ Brave Browser not found. Opening in default browser..."
                        xdg-open "$TUNNEL_URL" &
                    fi
                fi
                ;;
            2)
                # Open QR code
                QR_URL="https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=$TUNNEL_URL"
                if [ "$(uname)" == "Darwin" ]; then
                    if [ -d "/Applications/Brave Browser.app" ]; then
                        echo "🚀 Opening QR Code in Brave Browser..."
                        open -a "Brave Browser" "$QR_URL"
                    else
                        open "$QR_URL"
                    fi
                else
                    if command -v brave-browser &> /dev/null; then
                        brave-browser "$QR_URL" &
                    elif command -v brave &> /dev/null; then
                        brave "$QR_URL" &
                    else
                        xdg-open "$QR_URL" &
                    fi
                fi
                ;;
            3)
                # ADB
                if ! command -v adb &> /dev/null; then
                    echo "❌ ADB command not found in PATH."
                else
                    echo "🚀 Attempting to send URL to mobile via ADB..."
                    adb shell am start -a android.intent.action.VIEW -d "$TUNNEL_URL"
                fi
                ;;
            *)
                echo "⏭️ Skipping URL sharing."
                ;;
        esac
    fi

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
