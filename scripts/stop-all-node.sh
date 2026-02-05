#!/bin/bash

# Stop all Node.js processes related to this project

echo "🛑 Stopping all Node.js processes..."

# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Kill any node processes in backend or frontend directories
pkill -f "nest start" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "next start" 2>/dev/null

# Kill node processes in project directories
find /Users/admin/Desktop/Tvproje/backend -name "node" -type f -exec pkill -f {} \; 2>/dev/null
find /Users/admin/Desktop/Tvproje/frontend -name "node" -type f -exec pkill -f {} \; 2>/dev/null

echo "✅ All Node.js processes stopped"
