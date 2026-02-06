#!/usr/bin/env bash
#
# Canlı (Supabase) veritabanından yerel PostgreSQL'e veri kopyalar.
# Yerelde kontrol yaparken canlıdaki veriyi kullanmak için; sürekli push etmeye gerek kalmaz.
#
# Kullanım:
#   export SUPABASE_DB_PASSWORD='canli_db_sifresi'
#   ./scripts/pull-from-supabase.sh
#
# Gereksinim: backend/.env (yerel DB), frontend/.env.local (Supabase URL), Node + pg

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "HATA: Supabase veritabanı şifresi gerekli."
  echo ""
  echo "Kullanım:"
  echo "  export SUPABASE_DB_PASSWORD='sifreniz'"
  echo "  ./scripts/pull-from-supabase.sh"
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
export SUPABASE_DB_HOST="db.${SUPABASE_URL}.supabase.co"

# Yerel DB (backend/.env)
export DB_HOST="${DB_HOST:-localhost}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME="${DB_NAME:-tvproje}"
export DB_USER="${DB_USER:-postgres}"
export DB_PASSWORD="${DB_PASSWORD:-}"
if [ -f "${PROJECT_ROOT}/backend/.env" ]; then
  set -a
  source "${PROJECT_ROOT}/backend/.env" 2>/dev/null || true
  set +a
  export DB_HOST="${DB_HOST:-localhost}"
  export DB_PORT="${DB_PORT:-5432}"
  export DB_NAME="${DB_NAME:-tvproje}"
  export DB_USER="${DB_USER:-postgres}"
  export DB_PASSWORD="${DB_PASSWORD:-}"
fi

echo "=============================================="
echo "  Supabase (canlı) → Yerel DB"
echo "=============================================="
echo "Canlı: $SUPABASE_DB_HOST"
echo "Yerel: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# pg modülü backend'de; script'i backend dizininden çalıştır
(cd "${PROJECT_ROOT}/backend" && node "${PROJECT_ROOT}/scripts/pull-from-supabase.cjs")
