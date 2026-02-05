#!/bin/bash

# Start Backend in Current Terminal

echo "🚀 Starting Backend Server..."
echo ""

cd "$(dirname "$0")/../backend" || exit 1

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check environment file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Please create .env file"
    exit 1
fi

echo "✅ Starting NestJS backend..."
echo "📍 Backend will run on: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start in foreground (current terminal)
npm run start:dev
