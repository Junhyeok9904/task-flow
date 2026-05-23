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
    read -p "Enter port for Production [Default: 4000]: " prod_port
    prod_port=${prod_port:-4000}
    echo "🔨 Building Task-Flow..."
    npm run build
    echo "🚀 Starting Task-Flow Production Server on port $prod_port..."
    npx next start -p $prod_port
else
    echo "🚀 Starting Task-Flow Development Server..."
    npm run dev
fi
