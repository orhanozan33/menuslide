-- ============================================================
-- TEK SEFERLIK: Aktif olmayan işletmeleri ve ekranlarını temizle
-- 
-- Önce migration-delete-business-user-cleanup.sql çalıştırılmış olmalı
-- (delete_business_cascade fonksiyonu tanımlı olmalı).
--
-- 1) is_active = false olan her işletme için delete_business_cascade çağrılır.
-- 2) İsteğe bağlı: Belirli işletme adına göre de silebilirsiniz (aşağıdaki yorumu açın).
--
-- Supabase Dashboard → SQL Editor → Bu dosyayı yapıştır → Run
-- ============================================================

-- 1) Aktif olmayan tüm işletmeleri ve ekranlarını sil
DO $$
DECLARE
  r RECORD;
  cnt int := 0;
BEGIN
  FOR r IN SELECT id, name FROM businesses WHERE is_active = false
  LOOP
    PERFORM delete_business_cascade(r.id);
    cnt := cnt + 1;
    RAISE NOTICE 'Silindi: % (id: %)', r.name, r.id;
  END LOOP;
  RAISE NOTICE 'Toplam % aktif olmayan işletme ve tüm verileri silindi.', cnt;
END $$;

-- 2) Birleştirilmiş / artık kullanılmayan MenuSlide işletmesini de sil (is_active ne olursa olsun)
DO $$
DECLARE
  bid UUID;
  bname TEXT;
BEGIN
  -- Adında "MenuSlide" ve "birleştirildi" geçen işletme
  SELECT id, name INTO bid, bname FROM businesses WHERE name ILIKE '%MenuSlide%' AND name ILIKE '%birleştirildi%' LIMIT 1;
  IF bid IS NOT NULL THEN
    PERFORM delete_business_cascade(bid);
    RAISE NOTICE 'Birleştirilmiş işletme silindi: %', bname;
  ELSE
    -- Alternatif: Sadece "MenuSlide" adlı ve aktif olmayan işletme
    SELECT id, name INTO bid, bname FROM businesses WHERE name ILIKE '%MenuSlide%' AND is_active = false LIMIT 1;
    IF bid IS NOT NULL THEN
      PERFORM delete_business_cascade(bid);
      RAISE NOTICE 'MenuSlide işletmesi silindi: %', bname;
    END IF;
  END IF;
END $$;

-- 3) Önceki silmelerden kalan "yetim" full_editor_templates (hiçbir ekran rotasyonunda kullanılmayan)
--    Tablo ve full_editor_template_id sütunu varsa çalıştır
DO $$
DECLARE
  cnt int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'full_editor_templates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'screen_template_rotations' AND column_name = 'full_editor_template_id') THEN
    DELETE FROM full_editor_templates
    WHERE id NOT IN (SELECT full_editor_template_id FROM screen_template_rotations WHERE full_editor_template_id IS NOT NULL);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    RAISE NOTICE 'Yetim full_editor_templates silindi: %', cnt;
  END IF;
END $$;
