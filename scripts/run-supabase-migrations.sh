#!/usr/bin/env bash
#
# Supabase'de eksik tabloları oluşturur (tüm şema + migration'lar).
# Tablolar zaten varsa "already exists" uyarıları normaldir.
#
# Kullanım:
#   export SUPABASE_DB_PASSWORD='veritabani_sifreniz'
#   ./scripts/run-supabase-migrations.sh
#

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "HATA: Supabase veritabanı şifresi gerekli."
  echo ""
  echo "Kullanım:"
  echo "  export SUPABASE_DB_PASSWORD='sifreniz'"
  echo "  ./scripts/run-supabase-migrations.sh"
  echo ""
  echo "Şifre: Supabase Dashboard → Settings → Database → Database password"
  exit 1
fi

ENV_LOCAL="${PROJECT_ROOT}/frontend/.env.local"
if [ ! -f "$ENV_LOCAL" ]; then
  echo "HATA: frontend/.env.local bulunamadı (NEXT_PUBLIC_SUPABASE_URL gerekli)."
  exit 1
fi

SUPABASE_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_LOCAL" | cut -d= -f2- | tr -d '"' | tr -d "'" | sed 's|https://||' | sed 's|\.supabase\.co.*||')
if [ -z "$SUPABASE_URL" ]; then
  echo "HATA: frontend/.env.local içinde NEXT_PUBLIC_SUPABASE_URL tanımlı değil."
  exit 1
fi

SUPABASE_DB_HOST="db.${SUPABASE_URL}.supabase.co"
export PGPASSWORD="$SUPABASE_DB_PASSWORD"

echo "=============================================="
echo "  Supabase Migration'ları Çalıştırılıyor"
echo "=============================================="
echo ""

echo "[1/4] Ana şema + tüm migration'lar (supabase-bootstrap-full.sql)..."
psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres \
  -f "${PROJECT_ROOT}/database/supabase-bootstrap-full.sql" -v ON_ERROR_STOP=0
echo "  Tamamlandı."
echo ""

echo "[2/4] QR menüler (qr_menus, qr_menu_views)..."
psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres \
  -f "${PROJECT_ROOT}/database/supabase-qr-menus-only.sql" -v ON_ERROR_STOP=0
echo "  Tamamlandı."
echo ""

echo "[3/5] allow_multi_device (super admin çoklu cihaz)..."
psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres \
  -f "${PROJECT_ROOT}/database/migration-add-allow-multi-device.sql" -v ON_ERROR_STOP=0
echo "  Tamamlandı."
echo ""

echo "[4/5] Import sütunları + registration_requests..."
psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres \
  -f "${PROJECT_ROOT}/database/migration-add-import-columns.sql" -v ON_ERROR_STOP=0
psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres \
  -f "${PROJECT_ROOT}/database/migration-registration-requests.sql" -v ON_ERROR_STOP=0
echo "  Tamamlandı."
echo ""

echo "[5/5] migrations/ klasörü..."
for f in "${PROJECT_ROOT}/database/migrations"/*.sql; do
  [ -f "$f" ] || continue
  echo "  - $(basename "$f")"
  psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres -f "$f" -v ON_ERROR_STOP=0 2>/dev/null || true
done
echo "  Tamamlandı."
echo ""

echo "=============================================="
echo "  Migration'lar tamamlandı."
echo "=============================================="
echo ""
echo "Tabloları kontrol etmek için Supabase SQL Editor'da:"
echo "  SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
echo ""

unset PGPASSWORD
