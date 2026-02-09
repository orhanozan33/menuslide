#!/usr/bin/env bash
#
# Sadece TV uygulaması migration'ını Supabase'e push eder.
# Şifre: SUPABASE_DB_PASSWORD env veya frontend/.env.local içinde
#
#   export SUPABASE_DB_PASSWORD='sifreniz'
#   ./scripts/push-supabase-tv-app.sh
#
# veya .env.local'e ekleyin: SUPABASE_DB_PASSWORD=sifreniz
#

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

if [ -z "$SUPABASE_DB_PASSWORD" ] && [ -f "${PROJECT_ROOT}/frontend/.env.local" ]; then
  export SUPABASE_DB_PASSWORD=$(grep -E '^SUPABASE_DB_PASSWORD=' "${PROJECT_ROOT}/frontend/.env.local" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" | head -1)
fi

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "HATA: Supabase veritabanı şifresi gerekli."
  echo "  export SUPABASE_DB_PASSWORD='sifreniz'"
  echo "  ./scripts/push-supabase-tv-app.sh"
  echo "veya frontend/.env.local içine: SUPABASE_DB_PASSWORD=sifreniz"
  exit 1
fi

ENV_LOCAL="${PROJECT_ROOT}/frontend/.env.local"
if [ ! -f "$ENV_LOCAL" ]; then
  echo "HATA: frontend/.env.local bulunamadı."
  exit 1
fi

SUPABASE_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_LOCAL" | cut -d= -f2- | tr -d '"' | tr -d "'" | sed 's|https://||' | sed 's|\.supabase\.co.*||')
if [ -z "$SUPABASE_URL" ]; then
  echo "HATA: NEXT_PUBLIC_SUPABASE_URL tanımlı değil."
  exit 1
fi

SUPABASE_DB_HOST="db.${SUPABASE_URL}.supabase.co"
export PGPASSWORD="$SUPABASE_DB_PASSWORD"

echo "TV uygulaması migration'ı push ediliyor..."
psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres \
  -f "${PROJECT_ROOT}/database/migration-supabase-tv-app.sql" -v ON_ERROR_STOP=0
echo "Tamamlandı."
unset PGPASSWORD
