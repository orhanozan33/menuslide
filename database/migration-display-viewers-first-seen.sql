-- İlk açan oturum yayına izinli; diğerleri blok için first_seen_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'display_viewers' AND column_name = 'first_seen_at') THEN
    ALTER TABLE display_viewers ADD COLUMN first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE display_viewers SET first_seen_at = last_seen_at;
  END IF;
END $$;

COMMENT ON COLUMN display_viewers.first_seen_at IS 'İlk heartbeat zamanı; en eski oturum yayına izinli sayılır';
