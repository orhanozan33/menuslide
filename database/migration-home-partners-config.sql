-- Ana sayfa hero: İş Ortaklarımız & Partnerler (kayan yazı/logolar)
-- Tek satır: business_partners ve partners JSONB dizileri.
CREATE TABLE IF NOT EXISTS home_partners_config (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000002'::uuid,
  business_partners JSONB NOT NULL DEFAULT '[]',
  partners JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO home_partners_config (id, business_partners, partners)
VALUES ('00000000-0000-0000-0000-000000000002'::uuid, '[]', '[]')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE home_partners_config IS 'Home hero: İş Ortaklarımız & Partnerler (text veya logo URL).';
