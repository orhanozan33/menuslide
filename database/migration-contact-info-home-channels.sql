-- contact_info: tek satır (singleton) - ana sayfa iletişim bilgileri
CREATE TABLE IF NOT EXISTS contact_info (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO contact_info (id, email, phone, address, whatsapp)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- home_channels: ana sayfa kanal listesi (sıra önemli)
CREATE TABLE IF NOT EXISTS home_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL DEFAULT 'channel',
  title TEXT NOT NULL DEFAULT 'Channel',
  description TEXT,
  link TEXT,
  thumbnail TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_channels_order ON home_channels(display_order);
