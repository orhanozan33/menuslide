-- Live Channels (Canlı Kanallar) boşsa ekranlardan doldur.
-- Push sonrası home_channels tablosu boş kalırsa ana sayfada "yayın yok tv yok" olur; bu script her ekran için bir kanal ekler.
INSERT INTO home_channels (id, slug, title, description, link, display_order, created_at, updated_at)
SELECT
  gen_random_uuid(),
  COALESCE(TRIM(s.public_slug), s.public_token::text) AS slug,
  COALESCE(NULLIF(TRIM(s.name), ''), 'Ekran ' || (ROW_NUMBER() OVER (ORDER BY s.created_at))::text) AS title,
  '' AS description,
  '/display/' || COALESCE(TRIM(s.public_slug), s.public_token::text) AS link,
  (ROW_NUMBER() OVER (ORDER BY s.created_at))::int - 1 AS display_order,
  NOW(),
  NOW()
FROM screens s
WHERE s.is_active = true
  AND COALESCE(TRIM(s.public_slug), s.public_token::text) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM home_channels h
    WHERE h.link = '/display/' || COALESCE(TRIM(s.public_slug), s.public_token::text)
  );
