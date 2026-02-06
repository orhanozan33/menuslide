#!/usr/bin/env bash
# Yerel PostgreSQL'deki TÜM uygulama verisini export eder (Supabase'e yüklenecek SQL).
# Kullanım: ./scripts/export-local-to-supabase.sh
# Gereksinim: backend/.env içinde DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (veya varsayılanlar)

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
OUTPUT_FILE="${PROJECT_ROOT}/database/export-from-local-data.sql"
ENV_FILE="${PROJECT_ROOT}/backend/.env"

# Varsayılan değerler (backend .env yoksa)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tvproje}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [ -f "$ENV_FILE" ]; then
  echo "backend/.env yükleniyor..."
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${DB_NAME:-tvproje}"
  DB_USER="${DB_USER:-postgres}"
  [ -n "${DB_PASSWORD}" ] && export PGPASSWORD="$DB_PASSWORD"
fi

echo "Veritabanı: $DB_HOST:$DB_PORT/$DB_NAME (kullanıcı: $DB_USER)"
echo "Çıktı dosyası: $OUTPUT_FILE"
echo ""

# Önce bağlantı ve veritabanı kontrolü
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1" >/dev/null 2>&1; then
  echo "HATA: Veritabanına bağlanılamadı."
  echo ""
  echo "Kontrol edin:"
  echo "  1) PostgreSQL çalışıyor mu? (macOS: brew services start postgresql)"
  echo "  2) '$DB_NAME' veritabanı var mı? (psql -U $DB_USER -d postgres -c \"\\l\" ile listele)"
  echo "  3) backend/.env içinde DB_PASSWORD doğru mu?"
  echo ""
  echo "Veritabanı yoksa: createdb -U $DB_USER $DB_NAME"
  echo "Sonra şema: psql -U $DB_USER -d $DB_NAME -f database/schema-local.sql"
  exit 1
fi

# Tüm uygulama tabloları (yerelde yoksa pg_dump o tablo için hata verir; o satırı kaldırın)
TABLES=(
  businesses
  users
  menus
  menu_items
  screens
  screen_menu
  menu_schedules
  languages
  menu_item_translations
  plans
  subscriptions
  payments
  templates
  template_blocks
  screen_blocks
  template_block_contents
  screen_block_contents
  content_library
  content_library_categories
  contact_info
  home_channels
  screen_template_rotations
  display_viewers
  payment_failures
  admin_permissions
  admin_activity_log
  screen_edit_history
  registration_requests
)

# Tabloları sırayla export et (FK sırasına uygun; yoksa atla)
: > "$OUTPUT_FILE"
EXPORTED=0
SKIPPED=()

TMPERR=$(mktemp)
trap "rm -f $TMPERR" EXIT
FIRST_ERROR=""
for t in "${TABLES[@]}"; do
  if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --data-only --column-inserts --no-owner --no-privileges -t "public.$t" >> "$OUTPUT_FILE" 2>"$TMPERR"; then
    echo "  OK: $t"
    EXPORTED=$((EXPORTED + 1))
  else
    SKIPPED+=( "$t" )
    echo "  atlandı: $t"
    [ -z "$FIRST_ERROR" ] && FIRST_ERROR=$(cat "$TMPERR" 2>/dev/null)
  fi
done
[ -n "$FIRST_ERROR" ] && echo "" && echo "Örnek hata (ilk atlanan tablo): $FIRST_ERROR"

LINES=$(wc -l < "$OUTPUT_FILE")
SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo ""
echo "Tamamlandı: $OUTPUT_FILE ($LINES satır, $SIZE) — $EXPORTED tablo export edildi."
[ ${#SKIPPED[@]} -gt 0 ] && echo "Atlanan tablolar: ${SKIPPED[*]}"
if [ "$EXPORTED" -eq 0 ]; then
  echo ""
  if echo "$FIRST_ERROR" | grep -q "version mismatch"; then
    echo "pg_dump sürüm uyumsuz (sunucu 18, pg_dump 14). Node ile export deniyoruz..."
    echo ""
    if [ -f "$PROJECT_ROOT/backend/scripts/export-local-data.cjs" ]; then
      (cd "$PROJECT_ROOT/backend" && [ -f .env ] && set -a && source .env 2>/dev/null && set +a; node scripts/export-local-data.cjs) && echo "" && echo "Node export tamamlandı: $OUTPUT_FILE" && exit 0
    fi
  fi
  echo "Hiç tablo export edilmedi."
  echo "  • Sürüm uyumsuzluğu varsa: brew upgrade postgresql veya PostgreSQL 18 pg_dump kullanın."
  echo "  • Veya Node ile: cd backend && node scripts/export-local-data.cjs"
  echo "  • Veritabanında tablo yoksa: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema-local.sql"
  exit 1
fi
echo ""
echo "Sonraki adım:"
echo "  1. Supabase Dashboard → SQL Editor → New query"
echo "  2. Bu dosyanın içeriğini yapıştırıp Run ile çalıştırın."
echo "  Veya dosya çok büyükse: Supabase Connection string ile psql kullanın (docs/YERELDEN_SUPABASE_VERI_TASIMA.md)."
