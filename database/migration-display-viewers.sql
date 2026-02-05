-- Aynı ekran linkinin kaç cihazda açık olduğunu tespit için viewer heartbeat kayıtları
-- session_id: tarayıcı/cihaz başına benzersiz (frontend sessionStorage'dan gelir)

CREATE TABLE IF NOT EXISTS display_viewers (
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  session_id VARCHAR(64) NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (screen_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_display_viewers_last_seen ON display_viewers(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_display_viewers_screen_id ON display_viewers(screen_id);

COMMENT ON TABLE display_viewers IS 'Display sayfası heartbeat ile gelen oturumlar; aynı linkin birden fazla cihazda açık olup olmadığı tespit edilir';
