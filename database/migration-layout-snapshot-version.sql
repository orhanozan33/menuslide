-- Tek render authority: publish anında snapshot alınır, versionHash ile immutable path kullanılır.
-- screens.layout_snapshot_version = versionHash (sha256 kısa hali), layout değişmedikçe aynı kalır.

ALTER TABLE screens ADD COLUMN IF NOT EXISTS layout_snapshot_version VARCHAR(64);
COMMENT ON COLUMN screens.layout_snapshot_version IS 'Layout snapshot version hash; slides/{screenId}/{this}/slide_X.jpg path''inde kullanılır.';
