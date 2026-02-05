-- 5, 3 ve 7 bloklu şablonlarda "special" yerleşimi uygular (getGridLayout special dizisi).
-- 5 blok: sağdaki blok (index 2) 2 satır kaplar.
-- 3 blok: alttaki blok (index 2) tam genişlik.
-- 7 blok: ortadaki sütun (index 6) 2 satır kaplar.

-- ========== 5 BLOK: cols=3, rows=2, special [2] = blok 2 sağ sütun full height ==========
UPDATE template_blocks tb
SET
  position_x = CASE tb.block_index
    WHEN 0 THEN 0
    WHEN 1 THEN 100.0/3
    WHEN 2 THEN 200.0/3
    WHEN 3 THEN 0
    WHEN 4 THEN 100.0/3
    ELSE tb.position_x
  END,
  position_y = CASE tb.block_index
    WHEN 0 THEN 0
    WHEN 1 THEN 0
    WHEN 2 THEN 0
    WHEN 3 THEN 50
    WHEN 4 THEN 50
    ELSE tb.position_y
  END,
  width = CASE WHEN tb.block_index BETWEEN 0 AND 4 THEN 100.0/3 ELSE tb.width END,
  height = CASE tb.block_index WHEN 2 THEN 100 ELSE (CASE WHEN tb.block_index BETWEEN 0 AND 4 THEN 50 ELSE tb.height END) END
FROM templates t
WHERE tb.template_id = t.id
  AND t.block_count = 5
  AND tb.block_index < 5;

-- ========== 3 BLOK: cols=2, rows=2, special [2] = blok 2 tam genişlik alt ==========
UPDATE template_blocks tb
SET
  position_x = CASE tb.block_index WHEN 0 THEN 0 WHEN 1 THEN 50 WHEN 2 THEN 0 ELSE tb.position_x END,
  position_y = CASE tb.block_index WHEN 0 THEN 0 WHEN 1 THEN 0 WHEN 2 THEN 50 ELSE tb.position_y END,
  width = CASE tb.block_index WHEN 0 THEN 50 WHEN 1 THEN 50 WHEN 2 THEN 100 ELSE tb.width END,
  height = CASE WHEN tb.block_index <= 2 THEN 50 ELSE tb.height END
FROM templates t
WHERE tb.template_id = t.id
  AND t.block_count = 3
  AND tb.block_index < 3;

-- ========== 7 BLOK: cols=4, rows=2, special [6] = blok 6 orta sağ sütun full height ==========
UPDATE template_blocks tb
SET
  position_x = CASE tb.block_index
    WHEN 0 THEN 0
    WHEN 1 THEN 25
    WHEN 2 THEN 75
    WHEN 3 THEN 0
    WHEN 4 THEN 25
    WHEN 5 THEN 75
    WHEN 6 THEN 50
    ELSE tb.position_x
  END,
  position_y = CASE tb.block_index
    WHEN 0 THEN 0
    WHEN 1 THEN 0
    WHEN 2 THEN 0
    WHEN 3 THEN 50
    WHEN 4 THEN 50
    WHEN 5 THEN 50
    WHEN 6 THEN 0
    ELSE tb.position_y
  END,
  width = CASE WHEN tb.block_index <= 6 THEN 25 ELSE tb.width END,
  height = CASE tb.block_index WHEN 6 THEN 100 ELSE (CASE WHEN tb.block_index <= 6 THEN 50 ELSE tb.height END) END
FROM templates t
WHERE tb.template_id = t.id
  AND t.block_count = 7
  AND tb.block_index < 7;
