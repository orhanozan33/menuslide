#!/usr/bin/env bash
# database/export-from-local-data.sql dosyasını Supabase'e psql ile yükler.
# SQL Editor boyut sınırına takılmaz; dosya ne kadar büyük olursa olsun çalışır.
#
# Kullanım (proje kökünden, backend/ DEĞİL):
#   1. Supabase → Project Settings → Database → Connection string (URI, port 5432) kopyala.
#   2. backend/.env içine ekle: SUPABASE_IMPORT_URL="postgresql://postgres:SIFRE@db.xxxx.supabase.co:5432/postgres"
#   3. Proje köküne geçip çalıştır:
#        cd /path/to/Tvproje
#        ./scripts/import-to-supabase.sh

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
SQL_FILE="${PROJECT_ROOT}/database/export-from-local-data.sql"
ENV_FILE="${PROJECT_ROOT}/backend/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

URL="${SUPABASE_IMPORT_URL:-$DATABASE_URL}"
if [ -z "$URL" ]; then
  echo "HATA: Supabase bağlantı URL'si tanımlı değil."
  echo ""
  echo "Şunlardan birini yapın:"
  echo "  1) Supabase Dashboard → Project Settings → Database → Connection string (URI, port 5432) kopyalayın."
  echo "     Şifreyi URL'de [YOUR-PASSWORD] yerine yazın."
  echo "  2) Terminalde:"
  echo "     export SUPABASE_IMPORT_URL=\"postgresql://postgres:SIFRENIZ@db.xxxx.supabase.co:5432/postgres\""
  echo "     ./scripts/import-to-supabase.sh"
  echo "  3) veya backend/.env dosyasına ekleyin:"
  echo "     SUPABASE_IMPORT_URL=postgresql://postgres:SIFRENIZ@db.xxxx.supabase.co:5432/postgres"
  exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
  echo "HATA: $SQL_FILE bulunamadı."
  echo "Önce yerel export alın: cd backend && node scripts/export-local-data.cjs"
  exit 1
fi

PREIMPORT="${PROJECT_ROOT}/database/supabase-ensure-columns-before-import.sql"
if [ -f "$PREIMPORT" ]; then
  echo "Eksik sütunlar ekleniyor..."
  psql "$URL" -v ON_ERROR_STOP=0 -f "$PREIMPORT" 2>/dev/null || true
  echo ""
fi

echo "Dosya: $SQL_FILE"
echo "Supabase'e yükleniyor (psql ile; boyut sınırı yok)..."
echo ""

if psql "$URL" -v ON_ERROR_STOP=0 -f "$SQL_FILE"; then
  echo ""
  echo "Import tamamlandı. (Bazı satırlar zaten varsa duplicate key uyarısı normaldir.)"
else
  echo ""
  echo "Import bitti. Yukarıdaki hata/uyarıları kontrol edin."
fi

echo ""
echo "Supabase satır sayıları (kontrol):"
psql "$URL" -t -v ON_ERROR_STOP=0 -c "
SELECT 'businesses' AS tablo, COUNT(*) FROM businesses
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'menus', COUNT(*) FROM menus
UNION ALL SELECT 'menu_items', COUNT(*) FROM menu_items
UNION ALL SELECT 'templates', COUNT(*) FROM templates
UNION ALL SELECT 'template_blocks', COUNT(*) FROM template_blocks
UNION ALL SELECT 'screens', COUNT(*) FROM screens
UNION ALL SELECT 'screen_blocks', COUNT(*) FROM screen_blocks
UNION ALL SELECT 'content_library', COUNT(*) FROM content_library
UNION ALL SELECT 'content_library_categories', COUNT(*) FROM content_library_categories
UNION ALL SELECT 'screen_template_rotations', COUNT(*) FROM screen_template_rotations
UNION ALL SELECT 'admin_permissions', COUNT(*) FROM admin_permissions;
" 2>/dev/null || true
echo ""
echo "Backend canlıda Supabase kullanıyorsa (DATABASE_URL=Supabase), sayfada bu veriler görünür."
