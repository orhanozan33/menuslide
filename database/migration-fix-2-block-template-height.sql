-- Mevcut "2 bloklu şablon" sistem şablonlarında blok yüksekliğini %100 yap (2 Bölmeli Düzen ile aynı görünsün)
UPDATE template_blocks tb
SET position_y = 0,
    height = 100
FROM templates t
WHERE tb.template_id = t.id
  AND t.block_count = 2
  AND t.is_system = true
  AND tb.height = 50;
