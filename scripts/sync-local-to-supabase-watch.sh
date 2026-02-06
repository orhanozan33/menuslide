#!/usr/bin/env bash
#
# Yerel DB'deki değişiklikleri periyodik olarak Supabase'e gönderir.
# Geliştirme sırasında bu script'i arka planda çalıştırın: yerel = kaynak, Supabase aynı kalır.
#
# Kullanım:
#   export SUPABASE_DB_PASSWORD='sifre'
#   ./scripts/sync-local-to-supabase-watch.sh
#
# FULL_SYNC=1 ile tüm tablolar (businesses, users, ...) da gönderilir; yoksa sadece
# şablon/blok/tasarım (templates, template_blocks, content_library, plans, languages, vb.)
#
# Aralık (saniye): SYNC_INTERVAL=15 (varsayılan 15)

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

[ -z "$SUPABASE_DB_PASSWORD" ] && echo "HATA: SUPABASE_DB_PASSWORD gerekli." && exit 1

SYNC_INTERVAL="${SYNC_INTERVAL:-15}"
FULL_SYNC="${FULL_SYNC:-0}"

echo "=============================================="
echo "  Yerel → Supabase periyodik sync"
echo "  Aralık: ${SYNC_INTERVAL}s | Full sync: $FULL_SYNC"
echo "  Durdurmak: Ctrl+C"
echo "=============================================="
echo ""

while true; do
  echo "[$(date '+%H:%M:%S')] Sync çalışıyor..."
  if [ "$FULL_SYNC" = "1" ]; then
    "${PROJECT_ROOT}/scripts/push-to-supabase.sh" 2>&1 | tail -5 || true
  else
    "${PROJECT_ROOT}/scripts/push-templates-design-to-supabase.sh" 2>&1 | tail -8 || true
  fi
  echo "[$(date '+%H:%M:%S')] Sonraki sync ${SYNC_INTERVAL}s sonra."
  sleep "$SYNC_INTERVAL"
done
