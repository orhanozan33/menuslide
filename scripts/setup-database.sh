#!/bin/bash

# Database Setup Script for tvproje
# This script creates the PostgreSQL database and runs migrations

echo "🚀 Setting up tvproje database..."

# Database credentials
DB_NAME="tvproje"
DB_USER="postgres"
DB_PASSWORD="333333"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Set password for this session
export PGPASSWORD=$DB_PASSWORD

# Create database
echo "📦 Creating database: $DB_NAME..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || echo "Database already exists or error occurred"

# Run base schema
echo "📝 Running base schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema.sql

# Run advanced features migration
echo "📝 Running advanced features migration..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/migrations/add_advanced_features.sql

# Run TV UI customization migration
echo "📝 Running TV UI customization migration..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/migrations/add_tv_ui_customization.sql

echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Update Supabase connection string in backend/.env"
echo "2. Create super admin user (run scripts/setup-super-admin.sql in Supabase)"
echo "3. Start the system (run scripts/start-system.sh)"
