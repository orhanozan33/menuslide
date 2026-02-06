#!/usr/bin/env bash
#
# Yerel PostgreSQL'deki tüm veriyi tek komutla Supabase'e gönderir.
# 1) Yerelden export alır
# 2) Supabase'de ilgili tabloları temizler (truncate)
# 3) Export'u Supabase'e import eder
# 4) /uploads/ path'lerini Storage URL'lerine günceller (migration)
#
# Kullanım:
#   export SUPABASE_DB_PASSWORD='veritabani_sifreniz'
#   ./scripts/push-to-supabase.sh
#
# Gereksinim: backend/.env (yerel DB), frontend/.env.local (Supabase URL), psql yüklü

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

# --- Supabase bağlantı bilgisi ---
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "HATA: Supabase veritabanı şifresi gerekli."
  echo ""
  echo "Kullanım:"
  echo "  export SUPABASE_DB_PASSWORD='sifreniz'"
  echo "  ./scripts/push-to-supabase.sh"
  echo ""
  echo "Şifre: Supabase Dashboard → Settings → Database → Database password"
  exit 1
fi

# Proje ref (frontend/.env.local içinden)
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
SUPABASE_DB="postgresql://postgres@${SUPABASE_DB_HOST}:5432/postgres"

echo "=============================================="
echo "  Yerel veri → Supabase (tek adım)"
echo "=============================================="
echo ""

# --- 1) Yerelden export ---
echo "[1/4] Yerel PostgreSQL'den export alınıyor..."
if [ -f "${PROJECT_ROOT}/backend/.env" ]; then
  set -a
  source "${PROJECT_ROOT}/backend/.env" 2>/dev/null || true
  set +a
  [ -n "${DB_PASSWORD}" ] && export PGPASSWORD="${DB_PASSWORD}"
fi
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tvproje}"
DB_USER="${DB_USER:-postgres}"

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1" >/dev/null 2>&1; then
  echo "  Uyarı: Yerel veritabanına bağlanılamadı. Mevcut export dosyası kullanılacak."
  if [ ! -s "${PROJECT_ROOT}/database/export-from-local-data.sql" ]; then
    echo "  HATA: database/export-from-local-data.sql yok veya boş. Önce yerel DB'yi çalıştırıp export alın."
    exit 1
  fi
else
  "${PROJECT_ROOT}/scripts/export-local-to-supabase.sh" || exit 1
fi
echo ""

# --- 2) Supabase'de tabloları temizle ---
echo "[2/4] Supabase'de şablon/kütüphane tabloları temizleniyor..."
export PGPASSWORD="$SUPABASE_DB_PASSWORD"
psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres -f "${PROJECT_ROOT}/database/truncate-media-tables-for-import.sql" -v ON_ERROR_STOP=1
echo "  Tamamlandı."
echo ""

# --- 3) Export'u Supabase'e import et ---
echo "[3/4] Export Supabase'e import ediliyor (birkaç dakika sürebilir)..."
psql -h "$SUPABASE_DB_HOST" -p 5432 -U postgres -d postgres -f "${PROJECT_ROOT}/database/export-from-local-data.sql" -v ON_ERROR_STOP=0
echo "  Tamamlandı."
echo ""

# --- 4) /uploads/ path'lerini Storage URL'ine güncelle ---
echo "[4/4] Resim/video path'leri Storage URL'lerine güncelleniyor..."
(cd "${PROJECT_ROOT}/frontend" && node -r ./scripts/load-env.js scripts/migrate-uploads-to-supabase.js)
echo ""

echo "=============================================="
echo "  Bitti. Veriler Supabase'de."
echo "  Vercel canlı sitede verileri görmek için Redeploy yapın (veya zaten otomatik)."
echo "=============================================="
