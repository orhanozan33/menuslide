#!/bin/bash

# Start Frontend in Current Terminal

echo "🎨 Starting Frontend Server..."
echo ""

cd "$(dirname "$0")/../frontend" || exit 1

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check environment file
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local file not found!"
    echo "📝 Creating .env.local from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ Created .env.local - Please update with your API URL"
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
fi

echo "✅ Starting Next.js frontend..."
echo "📍 Frontend will run on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start in foreground (current terminal)
npm run dev
