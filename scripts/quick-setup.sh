#!/bin/bash

# Quick Setup Script - Complete System Setup

echo "🚀 Digital Signage System - Quick Setup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Stop all processes
echo -e "${YELLOW}Step 1: Stopping all Node processes...${NC}"
./scripts/stop-all-node.sh
sleep 2

# Step 2: Check PostgreSQL
echo -e "${YELLOW}Step 2: Checking PostgreSQL...${NC}"
if ! pg_isready -q; then
    echo -e "${RED}❌ PostgreSQL is not running. Please start PostgreSQL first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Step 3: Create database
echo -e "${YELLOW}Step 3: Creating database 'tvproje'...${NC}"
psql -U postgres -c "DROP DATABASE IF EXISTS tvproje;" 2>/dev/null
psql -U postgres -c "CREATE DATABASE tvproje;" 2>&1 | grep -v "already exists" || echo -e "${GREEN}✅ Database ready${NC}"

# Step 4: Run schema
echo -e "${YELLOW}Step 4: Running database schema...${NC}"
psql -U postgres -d tvproje -f database/schema.sql > /dev/null 2>&1
echo -e "${GREEN}✅ Schema applied${NC}"

# Step 5: Run migrations
if [ -f "database/migrations/add_advanced_features.sql" ]; then
    echo -e "${YELLOW}Step 5: Running advanced features migration...${NC}"
    psql -U postgres -d tvproje -f database/migrations/add_advanced_features.sql > /dev/null 2>&1
    echo -e "${GREEN}✅ Advanced features migration applied${NC}"
fi

if [ -f "database/migrations/add_tv_ui_customization.sql" ]; then
    echo -e "${YELLOW}Step 6: Running UI customization migration...${NC}"
    psql -U postgres -d tvproje -f database/migrations/add_tv_ui_customization.sql > /dev/null 2>&1
    echo -e "${GREEN}✅ UI customization migration applied${NC}"
fi

# Step 7: Check environment files
echo -e "${YELLOW}Step 7: Checking environment files...${NC}"
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Creating backend/.env from example...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}📝 Please update backend/.env with your Supabase credentials${NC}"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}⚠️  Creating frontend/.env.local from example...${NC}"
    cp frontend/.env.example frontend/.env.local
    echo -e "${YELLOW}📝 Please update frontend/.env.local with your Supabase credentials${NC}"
fi

# Step 8: Install dependencies
echo -e "${YELLOW}Step 8: Installing dependencies...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo "   Installing backend dependencies..."
    npm install > /dev/null 2>&1
fi
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm install > /dev/null 2>&1
fi
cd ..

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo "   1. Update backend/.env with your Supabase URL and keys"
echo "   2. Update frontend/.env.local with your Supabase URL and keys"
echo "   3. Create super admin user in Supabase Dashboard:"
echo "      - Go to Authentication > Users"
echo "      - Create user: email='orhan@example.com', password='33333333'"
echo "      - Copy the user UUID"
echo "      - Run in Supabase SQL Editor:"
echo "        INSERT INTO users (id, email, role) VALUES ('USER_UUID', 'orhan@example.com', 'super_admin');"
echo ""
echo "   4. Start the system:"
echo "      ./scripts/start-system.sh"
echo ""
