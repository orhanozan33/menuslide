-- Her TV/ekran için isteğe bağlı yayın linki (VLC, ExoPlayer vb. stream URL).
-- Doluysa player/resolve bu URL'i döndürür; uygulama ve VLC bu linki kullanabilir.

ALTER TABLE screens ADD COLUMN IF NOT EXISTS stream_url TEXT;

COMMENT ON COLUMN screens.stream_url IS 'İsteğe bağlı HLS/MP4 stream URL (VLC ve TV uygulamasında kullanılır). Boşsa web display URL kullanılır.';
