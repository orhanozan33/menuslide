-- Aynı olan kayıtları temizle: aynı resim (url) veya aynı isim+kategori+tür tek kalsın.

-- 1) Resimler: Aynı url'ye sahip birden fazla kayıt varsa, id'si en küçük olanı bırak, diğerlerini sil
DELETE FROM content_library
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY url ORDER BY id) AS rn
    FROM content_library
    WHERE type = 'image' AND url IS NOT NULL AND url != ''
  ) t
  WHERE t.rn > 1
);

-- 2) Resim/icon vb: Aynı name+category+type birden fazla varsa 1 kalsın.
--    Video: url farklı olduğu sürece aynı isimle birden fazla olabilir; sadece name+category+type+url aynı olanları temizle
DELETE FROM content_library
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY 
               name, category, type,
               CASE WHEN type = 'video' THEN COALESCE(url, '') ELSE '' END
             ORDER BY id
           ) AS rn
    FROM content_library
  ) t
  WHERE t.rn > 1
);
