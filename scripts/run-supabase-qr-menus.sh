#!/usr/bin/env bash
# Supabase'e qr_menus ve payment_failures tablolarını ekler.
# Kullanım: export SUPABASE_DB_PASSWORD='sifreniz'; ./scripts/run-supabase-qr-menus.sh

set -e
cd "$(dirname "$0")/.."

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "HATA: SUPABASE_DB_PASSWORD gerekli."
  echo "  export SUPABASE_DB_PASSWORD='sifreniz'"
  echo "  ./scripts/run-supabase-qr-menus.sh"
  exit 1
fi

ENV_LOCAL="frontend/.env.local"
[ ! -f "$ENV_LOCAL" ] && { echo "HATA: $ENV_LOCAL bulunamadı"; exit 1; }
SUPABASE_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_LOCAL" | cut -d= -f2- | tr -d '"' | tr -d "'" | sed 's|https://||' | sed 's|\.supabase\.co.*||')
[ -z "$SUPABASE_URL" ] && { echo "HATA: NEXT_PUBLIC_SUPABASE_URL bulunamadı"; exit 1; }

export PGPASSWORD="$SUPABASE_DB_PASSWORD"
HOST="db.${SUPABASE_URL}.supabase.co"

echo "qr_menus tablosu oluşturuluyor..."
psql -h "$HOST" -p 5432 -U postgres -d postgres \
  -f database/supabase-qr-menus-only.sql -v ON_ERROR_STOP=1

echo "payment_failures (subscriptions varsa)..."
psql -h "$HOST" -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=0 <<'EOF'
CREATE TABLE IF NOT EXISTS payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'cad',
  failure_reason TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_failures_subscription_id ON payment_failures(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_business_id ON payment_failures(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_failures_attempted_at ON payment_failures(attempted_at DESC);
EOF

echo "Tamamlandı."
unset PGPASSWORD
