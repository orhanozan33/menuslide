-- Tüm sistem/admin tarafından oluşturulan şablonların blok pozisyon ve boyutlarını
-- getGridLayout mantığına göre düzeltir (2 Bölmeli Düzen düzeltmesinin tamamına uygulanır).
-- Sadece is_system = true olan şablonlar güncellenir (schema'dan gelen split_2 vb. zaten doğru).

WITH layout AS (
  SELECT
    t.id AS template_id,
    t.block_count,
    CASE
      WHEN t.block_count <= 1 THEN 1
      WHEN t.block_count = 2 THEN 2
      WHEN t.block_count <= 4 THEN 2
      WHEN t.block_count <= 6 THEN 3
      WHEN t.block_count <= 8 THEN 4
      WHEN t.block_count = 9 THEN 3
      WHEN t.block_count <= 12 THEN 4
      WHEN t.block_count <= 16 THEN 4
      ELSE CEIL(SQRT(t.block_count))::int
    END AS cols,
    CASE
      WHEN t.block_count <= 1 THEN 1
      WHEN t.block_count = 2 THEN 1
      WHEN t.block_count <= 4 THEN 2
      WHEN t.block_count <= 6 THEN 2
      WHEN t.block_count <= 8 THEN 2
      WHEN t.block_count = 9 THEN 3
      WHEN t.block_count <= 12 THEN 3
      WHEN t.block_count <= 16 THEN 4
      ELSE CEIL(t.block_count::float / CEIL(SQRT(t.block_count)))::int
    END AS rows
  FROM templates t
  WHERE t.is_system = true
)
-- Sadece şablonun block_count'una ait blokları güncelle (block_index < block_count);
-- fazla blok kalırsa dokunma (constraint ihlali olmasın)
UPDATE template_blocks tb
SET
  position_x = (tb.block_index % GREATEST(p.cols, 1)) * (100.0 / GREATEST(p.cols, 1)),
  position_y = (tb.block_index / GREATEST(p.cols, 1)) * (100.0 / GREATEST(p.rows, 1)),
  width = 100.0 / GREATEST(p.cols, 1),
  height = 100.0 / GREATEST(p.rows, 1)
FROM layout p
WHERE tb.template_id = p.template_id
  AND tb.block_index < p.block_count;
