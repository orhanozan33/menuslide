#!/usr/bin/env bash
# Tek dosyada Supabase bootstrap SQL üretir (şema + tüm migration'lar).
# Çıktı: database/supabase-bootstrap-full.sql ve frontend/lib/supabase-bootstrap.sql (API için)

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
DB="$PROJECT_ROOT/database"
OUT_FULL="$DB/supabase-bootstrap-full.sql"
OUT_FRONTEND="$PROJECT_ROOT/frontend/lib/supabase-bootstrap.sql"

echo "Building Supabase bootstrap SQL..."

# Sıra: SUPABASE_MIGRATION_SIRASI.md ile uyumlu (sadece mevcut dosyalar)
SCHEMA_FILES=(
  "$DB/schema-local.sql"
  "$DB/templates-schema.sql"
  "$DB/template-block-contents-schema.sql"
  "$DB/template-editor-schema.sql"
  "$DB/text-content-schema.sql"
  "$DB/template-library-schema.sql"
  "$DB/migration-create-content-library.sql"
)

MIGRATION_FILES=(
  "$DB/migration-content-library-categories.sql"
  "$DB/migration-add-7-8-templates.sql"
  "$DB/migration-add-admin-activity-log.sql"
  "$DB/migration-add-admin-role-and-permissions.sql"
  "$DB/migration-add-admin-permission-actions.sql"
  "$DB/migration-add-reference-number.sql"
  "$DB/migration-add-admin-reference-number.sql"
  "$DB/migration-add-alcoholic-drinks-glasses.sql"
  "$DB/migration-add-canvas-design-to-templates.sql"
  "$DB/migration-add-desserts-category.sql"
  "$DB/migration-add-display-frame-ticker.sql"
  "$DB/migration-add-template-rotation.sql"
  "$DB/migration-add-display-scale-indexes.sql"
  "$DB/migration-add-drink-content-type.sql"
  "$DB/migration-add-invoice-number.sql"
  "$DB/migration-add-preferred-locale.sql"
  "$DB/migration-add-public-slug.sql"
  "$DB/migration-add-qr-background-to-businesses.sql"
  "$DB/migration-add-regional-category.sql"
  "$DB/migration-add-regional-menu-content-type.sql"
  "$DB/migration-add-rotation-transition-effect.sql"
  "$DB/migration-add-template-transition-effect.sql"
  "$DB/migration-add-ticker-style.sql"
  "$DB/migration-add-uploaded-by-to-content-library.sql"
  "$DB/migration-full-editor-categories-templates.sql"
  "$DB/migration-add-video-content-type.sql"
  "$DB/migration-add-video-to-screen-block-contents.sql"
  "$DB/migration-add-video-type-to-content-library.sql"
  "$DB/migration-clean-content-library-duplicates.sql"
  "$DB/migration-clean-content-library-duplicates-v2.sql"
  "$DB/migration-content-library-english-canadian-drinks.sql"
  "$DB/migration-display-viewers.sql"
  "$DB/migration-display-viewers-first-seen.sql"
  "$DB/migration-enrich-content-library-images.sql"
  "$DB/migration-enrich-food-soups-fish-doner-breakfast.sql"
  "$DB/migration-fix-2-block-template-height.sql"
  "$DB/migration-fix-5-3-7-block-special-layout.sql"
  "$DB/migration-fix-all-system-template-blocks-layout.sql"
  "$DB/migration-fix-orhan-template-name.sql"
  "$DB/migration-import-all-categories.sql"
  "$DB/migration-import-content-library.sql"
  "$DB/migration-increase-block-count-limit.sql"
  "$DB/migration-invoice-auto-number-trigger.sql"
  "$DB/migration-menu-pages.sql"
  "$DB/migration-move-pasta-to-pasta-category.sql"
  "$DB/migration-plan-names.sql"
  "$DB/migration-plans-1-3-1-5-1-7-1-10-unlimited.sql"
  "$DB/migration-prices-end-99.sql"
  "$DB/migration-pricing-11-99.sql"
  "$DB/migration-pricing-11-99-per-tv.sql"
  "$DB/migration-pricing-12-99-per-tv.sql"
  "$DB/migration-pricing-13-99-per-tv.sql"
  "$DB/migration-pricing-14-99.sql"
  "$DB/migration-pricing-packages.sql"
  "$DB/migration-remove-regional-tek-menu-category.sql"
  "$DB/migration-stripe-price-1screen.sql"
)

MIGRATIONS_SUB=(
  "$DB/migrations/add_advanced_features.sql"
  "$DB/migrations/add_billing_interval.sql"
  "$DB/migrations/add_display_scale_indexes.sql"
  "$DB/migrations/add_payment_failures.sql"
  "$DB/migrations/add_tv_ui_customization.sql"
)

FINAL_FILES=(
  "$DB/migration-contact-info-home-channels.sql"
  "$DB/migration-ensure-password-hash.sql"
  "$DB/migration-add-import-columns.sql"
  "$DB/supabase-run-migrations.sql"
)

{
  echo "-- Supabase bootstrap: tüm şema + migration'lar (tek seferde çalıştırılabilir)"
  echo "-- Üretim: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  echo ""

  for f in "${SCHEMA_FILES[@]}" "${MIGRATION_FILES[@]}" "${MIGRATIONS_SUB[@]}" "${FINAL_FILES[@]}"; do
    if [ -f "$f" ]; then
      echo "-- === $(basename "$f") ==="
      cat "$f"
      echo ""
    fi
  done
} > "$OUT_FULL"

# Frontend'e kopyala
mkdir -p "$(dirname "$OUT_FRONTEND")"
cp "$OUT_FULL" "$OUT_FRONTEND"

# Vercel serverless için SQL'i TS modülüne göm (runtime'da dosya okuma yok)
OUT_EMBED="$PROJECT_ROOT/frontend/lib/supabase-bootstrap-embed.ts"
node "$PROJECT_ROOT/scripts/embed-bootstrap-sql.js" "$OUT_FRONTEND" "$OUT_EMBED"
echo "OK: $OUT_EMBED"

echo "OK: $OUT_FULL"
echo "OK: $OUT_FRONTEND ($(wc -l < "$OUT_FULL") satır)"
