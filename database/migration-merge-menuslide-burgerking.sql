-- ============================================================
-- MenuSlide + Burger King birleştirme (aynı kullanıcı)
-- sistemtv@gmail.com şu an Burger King işletmesine bağlı.
-- MenuSlide işletmesindeki tüm ekranlar, menüler, abonelikler Burger King'e taşınır;
-- MenuSlide işletmesi pasif yapılır (silinmez).
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → New query
--            Bu dosyanın içeriğini yapıştır → Run
-- ============================================================

DO $$
DECLARE
  v_target_business_id UUID;  -- Burger King (sistemtv'nin işletmesi)
  v_source_business_id UUID; -- MenuSlide
  v_screens_count INT;
  v_menus_count INT;
BEGIN
  -- 1) sistemtv@gmail.com kullanıcısının işletmesi = Burger King (hedef)
  SELECT business_id INTO v_target_business_id
  FROM users
  WHERE email = 'sistemtv@gmail.com'
  LIMIT 1;

  IF v_target_business_id IS NULL THEN
    RAISE EXCEPTION 'sistemtv@gmail.com kullanıcısı veya business_id bulunamadı.';
  END IF;

  -- 2) MenuSlide işletmesini bul (Burger King değil, isim menuslide içeren)
  SELECT id INTO v_source_business_id
  FROM businesses
  WHERE LOWER(name) LIKE '%menuslide%'
    AND id != v_target_business_id
  LIMIT 1;

  IF v_source_business_id IS NULL THEN
    RAISE NOTICE 'MenuSlide adında ayrı bir işletme bulunamadı. Birleştirme atlanıyor.';
    RETURN;
  END IF;

  -- 3) Ekranları taşı (screens)
  UPDATE screens SET business_id = v_target_business_id WHERE business_id = v_source_business_id;
  GET DIAGNOSTICS v_screens_count = ROW_COUNT;

  -- 4) Menüleri taşı (menus)
  UPDATE menus SET business_id = v_target_business_id WHERE business_id = v_source_business_id;
  GET DIAGNOSTICS v_menus_count = ROW_COUNT;

  -- 5) Şablonları taşı (templates - business_id dolu olanlar)
  UPDATE templates SET business_id = v_target_business_id WHERE business_id = v_source_business_id;

  -- 6) MenuSlide işletmesine bağlı diğer kullanıcıları da Burger King'e taşı
  UPDATE users SET business_id = v_target_business_id WHERE business_id = v_source_business_id;

  -- 7) Abonelikleri taşı (subscriptions) - tek işletme altında toplanır
  UPDATE subscriptions SET business_id = v_target_business_id WHERE business_id = v_source_business_id;

  -- 8) payment_failures varsa taşı
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_failures') THEN
    UPDATE payment_failures SET business_id = v_target_business_id WHERE business_id = v_source_business_id;
  END IF;

  -- 9) MenuSlide işletmesini pasif yap ve ismini güncelle (silmiyoruz, referans kalabilir)
  UPDATE businesses
  SET is_active = false,
      name = name || ' (birleştirildi)',
      updated_at = NOW()
  WHERE id = v_source_business_id;

  RAISE NOTICE 'Birleştirme tamamlandı. % ekran, % menü Burger King işletmesine taşındı. MenuSlide işletmesi pasif yapıldı.',
    v_screens_count, v_menus_count;
END $$;
