#!/bin/bash

# Migration Runner Script
# Automatically runs all migration files in the database directory

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load backend/.env if exists (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_ENV="$SCRIPT_DIR/../backend/.env"
if [ -f "$BACKEND_ENV" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV" 2>/dev/null || true
  set +a
fi

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tvproje}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-333333}"

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"


echo -e "${GREEN}🚀 Starting Migration Runner${NC}"
echo -e "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo ""

# Check if database exists
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${RED}❌ Database '$DB_NAME' does not exist!${NC}"
    exit 1
fi

# Run all migration files in order
MIGRATION_COUNT=0
SUCCESS_COUNT=0
FAILED_COUNT=0

for migration_file in "$SCRIPT_DIR"/migration-*.sql; do
    if [ -f "$migration_file" ]; then
        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
        filename=$(basename "$migration_file")
        echo -e "${YELLOW}📄 Running: $filename${NC}"
        
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Success: $filename${NC}"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            # Try again with output to see errors
            if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" 2>&1 | grep -q "already exists\|duplicate\|NOTICE"; then
                echo -e "${YELLOW}⚠️  Skipped (already applied): $filename${NC}"
                SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            else
                echo -e "${RED}❌ Failed: $filename${NC}"
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" 2>&1 | tail -5
                FAILED_COUNT=$((FAILED_COUNT + 1))
            fi
        fi
        echo ""
    fi
done

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Total migrations: $MIGRATION_COUNT"
echo -e "${GREEN}✅ Successful: $SUCCESS_COUNT${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}❌ Failed: $FAILED_COUNT${NC}"
else
    echo -e "${GREEN}✅ All migrations completed successfully!${NC}"
fi

# Unset password
unset PGPASSWORD
