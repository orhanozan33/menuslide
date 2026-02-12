-- screens.stream_url: Direct HLS/MP4 URL for native TV players (Roku, Android)
-- Admin panelde ekran ayarlarında "Stream URL" alanı eklenebilir.
-- Supabase: Dashboard → SQL Editor → Run

ALTER TABLE screens ADD COLUMN IF NOT EXISTS stream_url TEXT;

COMMENT ON COLUMN screens.stream_url IS 'Direct HLS (.m3u8) or MP4 URL for native TV apps; bypasses WebView display';
