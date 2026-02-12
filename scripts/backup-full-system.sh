#!/usr/bin/env bash
#
# Tam sistem yedeği: Kod + Veritabanı (Supabase) + Backend
# Her şeyi timestamp ile tek bir zip içinde toplar.
#
# Kullanım:
#   export SUPABASE_DB_PASSWORD='veritabanı_şifreniz'
#   ./scripts/backup-full-system.sh
#
# Şifre: Supabase Dashboard → Settings → Database → Database password

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

TIMESTAMP=$(date +%Y%m%d-%H%M)
BACKUP_NAME="Tvproje-TAM-YEDEK-${TIMESTAMP}"
BACKUP_DIR="${PROJECT_ROOT}/../yedek-menuslide"
OUTPUT_ZIP="${BACKUP_DIR}/${BACKUP_NAME}.zip"
TEMP_DIR=$(mktemp -d)

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "=============================================="
echo "  Tvproje TAM SİSTEM YEDEĞİ"
echo "=============================================="

mkdir -p "$BACKUP_DIR"

# 1) Proje kodunu kopyala (node_modules hariç)
echo "[1/3] Kod kopyalanıyor..."
if command -v rsync &>/dev/null; then
  rsync -a --exclude='node_modules' --exclude='.next' --exclude='dist' \
    --exclude='.git' --exclude='*.log' --exclude='build' --exclude='*.apk' \
    "$PROJECT_ROOT/" "$TEMP_DIR/Tvproje/"
else
  (cd "$PROJECT_ROOT" && tar cf - --exclude=node_modules --exclude=.next --exclude=dist --exclude=.git --exclude='*.log' --exclude=build --exclude='*.apk' .) | (mkdir -p "$TEMP_DIR/Tvproje" && cd "$TEMP_DIR/Tvproje" && tar xf -)
fi

# 2) Supabase veritabanı dump
echo "[2/3] Supabase veritabanı dump alınıyor..."

if [ -n "$SUPABASE_DB_PASSWORD" ]; then
  ENV_LOCAL="${PROJECT_ROOT}/frontend/.env.local"
  if [ -f "$ENV_LOCAL" ]; then
    SUPABASE_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_LOCAL" | cut -d= -f2- | tr -d '"' | tr -d "'" | sed 's|https://||' | sed 's|\.supabase\.co.*||')
    SUPABASE_HOST="db.${SUPABASE_URL}.supabase.co"
    DB_DUMP="${TEMP_DIR}/supabase-dump-${TIMESTAMP}.sql"

    if command -v pg_dump &>/dev/null; then
      PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
        -h "$SUPABASE_HOST" -p 5432 -U postgres -d postgres \
        --no-owner --no-acl \
        -f "$DB_DUMP" 2>/dev/null && echo "  → Veritabanı dump OK" || echo "  → pg_dump atlandı (bağlantı hatası veya pg_dump yok)"
    else
      echo "  → pg_dump bulunamadı, veritabanı atlandı. Yüklemek: brew install libpq"
    fi
  fi
else
  echo "  → SUPABASE_DB_PASSWORD tanımlı değil, veritabanı atlandı."
fi

# 3) Hepsinin zip'i
echo "[3/3] Zip oluşturuluyor..."
cd "$TEMP_DIR"
zip -rq "$OUTPUT_ZIP" .
cd - >/dev/null

echo ""
echo "✓ Yedek oluşturuldu: $OUTPUT_ZIP"
echo ""
echo "İçerik:"
echo "  - Tvproje/ (tüm kod: frontend, backend, android, database, scripts, .env)"
echo "  - supabase-dump-*.sql (veritabanı tam dump - full_editor_templates dahil)"
