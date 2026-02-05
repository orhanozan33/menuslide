-- Aynı isim + aynı resim (url) olan kayıtlardan fazlalıkları sil, her birinden 1 adet kalsın.

DELETE FROM content_library
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY 
               COALESCE(TRIM(name), ''),
               COALESCE(NULLIF(TRIM(url), ''), '(empty)')
             ORDER BY id
           ) AS rn
    FROM content_library
  ) t
  WHERE t.rn > 1
);
