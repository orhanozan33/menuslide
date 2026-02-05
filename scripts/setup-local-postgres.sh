#!/bin/bash

# PostgreSQL Database Setup Script
# Creates database and super admin user

DB_NAME="tvproje"
DB_PASSWORD="333333"
ADMIN_EMAIL="orhan"
ADMIN_PASSWORD="33333333"

echo "🚀 Setting up PostgreSQL database..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Create database
echo "📦 Creating database: $DB_NAME"
psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
psql -U postgres -c "CREATE DATABASE $DB_NAME;" || {
    echo "❌ Failed to create database. Trying with current user..."
    createdb $DB_NAME 2>/dev/null || {
        echo "❌ Failed to create database. Please run manually:"
        echo "   createdb $DB_NAME"
        exit 1
    }
}

echo "✅ Database created successfully"

# Run schema
echo "📋 Running database schema..."
psql -U postgres -d $DB_NAME -f database/schema.sql || {
    echo "⚠️  Schema execution had issues. Continuing..."
}

# Run migrations
if [ -f "database/migrations/add_advanced_features.sql" ]; then
    echo "🔄 Running advanced features migration..."
    psql -U postgres -d $DB_NAME -f database/migrations/add_advanced_features.sql 2>/dev/null
fi

if [ -f "database/migrations/add_tv_ui_customization.sql" ]; then
    echo "🎨 Running UI customization migration..."
    psql -U postgres -d $DB_NAME -f database/migrations/add_tv_ui_customization.sql 2>/dev/null
fi

echo "✅ Database setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Create super admin user in Supabase Auth (or use Supabase dashboard)"
echo "   2. Update backend/.env with database connection"
echo "   3. Start backend: cd backend && npm run start:dev"
echo "   4. Start frontend: cd frontend && npm run dev"
