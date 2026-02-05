#!/bin/bash

# Clean Start Script - Stops everything and starts fresh

echo "🧹 Cleaning and starting system..."

# Stop all processes
echo "🛑 Stopping all processes..."
./scripts/stop-all-node.sh
sleep 2

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Check environment files
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found!"
    echo "📝 Please create backend/.env with your Supabase credentials"
    echo "   See backend/.env.example for reference"
    exit 1
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "⚠️  frontend/.env.local not found!"
    echo "📝 Please create frontend/.env.local with your Supabase credentials"
    echo "   See frontend/.env.example for reference"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Start backend
echo "🚀 Starting backend..."
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "⚠️  Backend might not be ready yet. Check logs/backend.log"
fi

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
cd ..

echo ""
echo "✅ System started!"
echo ""
echo "📊 Services:"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 To stop: ./scripts/stop-all-node.sh"
echo ""
