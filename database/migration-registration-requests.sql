-- Kayıt talepleri (Bildirim Raporları) — Vercel/Supabase için
-- Supabase SQL Editor'da veya push script'ten sonra çalıştırılabilir.

CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  tv_count TEXT,
  address TEXT,
  province TEXT,
  city TEXT,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'registered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);

COMMENT ON TABLE registration_requests IS 'Kayıt talepleri / Bildirim raporları (admin sayfası)';
