#!/usr/bin/env bash
#
# Yerel DB'deki şablon, blok ve tasarım sistemi verisini Supabase'e gönderir.
# Canlıdaki kullanıcı/ekran verisine dokunmaz; sadece plans, languages,
# content_library_categories, content_library, templates, template_blocks,
# template_block_contents eklenir/güncellenir (upsert).
#
# Kullanım:
#   export SUPABASE_DB_PASSWORD='canli_db_sifresi'
#   ./scripts/push-templates-design-to-supabase.sh
#
# Gereksinim: backend/.env (yerel DB), frontend/.env.local (Supabase URL), psql

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "HATA: Supabase veritabanı şifresi gerekli."
  echo "  export SUPABASE_DB_PASSWORD='sifreniz'"
  echo "  ./scripts/push-templates-design-to-supabase.sh"
  exit 1
fi

ENV_LOCAL="${PROJECT_ROOT}/frontend/.env.local"
if [ ! -f "$ENV_LOCAL" ]; then
  echo "HATA: frontend/.env.local bulunamadı."
  exit 1
fi
SUPABASE_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_LOCAL" | cut -d= -f2- | tr -d '"' | tr -d "'" | sed 's|https://||' | sed 's|\.supabase\.co.*||')
[ -z "$SUPABASE_URL" ] && echo "HATA: NEXT_PUBLIC_SUPABASE_URL tanımlı değil." && exit 1
SUPABASE_DB_HOST="db.${SUPABASE_URL}.supabase.co"

echo "=============================================="
echo "  Şablon / Blok / Tasarım: Yerel → Supabase"
echo "=============================================="
echo ""

# 1) Yerelden export (sadece şablon/blok/tasarım tabloları)
echo "[1/3] Yerel DB'den şablon, blok ve tasarım tabloları export ediliyor..."
if [ -f "${PROJECT_ROOT}/backend/.env" ]; then
  set -a
  source "${PROJECT_ROOT}/backend/.env" 2>/dev/null || true
  set +a
fi
(cd "${PROJECT_ROOT}/backend" && node scripts/export-templates-design-from-local.cjs) || exit 1
echo ""

EXPORT_FILE="${PROJECT_ROOT}/database/export-templates-design-from-local.sql"
if [ ! -s "$EXPORT_FILE" ]; then
  echo "HATA: Export dosyası boş veya yok: $EXPORT_FILE"
  exit 1
fi

# 2) Supabase'de eksik sütunlar varsa ekle
echo "[2/3] Supabase import uyumluluğu (eksik sütunlar)..."
export PGPASSWORD="$SUPABASE_DB_PASSWORD"
psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres \
  -f "${PROJECT_ROOT}/database/migration-add-import-columns.sql" -v ON_ERROR_STOP=0
echo "  Tamamlandı."
echo ""

# 3) Export'u Supabase'e çalıştır (upsert)
echo "[3/3] Şablon/blok/tasarım verisi Supabase'e yükleniyor..."
psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres \
  -f "$EXPORT_FILE" -v ON_ERROR_STOP=0
echo "  Tamamlandı."
echo ""

echo "=============================================="
echo "  Bitti. Şablon ve tasarım verisi Supabase'de."
echo "=============================================="
