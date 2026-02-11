-- ============================================================
-- İşletme / kullanıcı silindiğinde Supabase tam temizlik
-- 1) İşletme silindiğinde tüm bağımlı veriler cascade silinsin.
-- 2) RPC: delete_business_cascade — İşletme ve tüm ilişkili satırları siler.
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → Bu dosyayı yapıştır → Run
-- ============================================================

-- 1) İşletme silme: Tüm bağımlı tabloları sırayla temizleyen fonksiyon
CREATE OR REPLACE FUNCTION delete_business_cascade(p_business_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_business_id IS NULL THEN
    RETURN;
  END IF;

  -- Ekranlara bağlı veriler (screen_id ile)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'screen_edit_history') THEN
    DELETE FROM screen_edit_history WHERE screen_id IN (SELECT id FROM screens WHERE business_id = p_business_id);
  END IF;
  DELETE FROM screen_block_contents WHERE screen_block_id IN (SELECT id FROM screen_blocks WHERE screen_id IN (SELECT id FROM screens WHERE business_id = p_business_id));
  DELETE FROM screen_blocks WHERE screen_id IN (SELECT id FROM screens WHERE business_id = p_business_id);
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'screen_template_rotations') THEN
    -- full_editor_templates: bu işletmenin ekran rotasyonlarında kullanılan şablonları sil (önce şablonlar, sonra rotasyonlar)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'full_editor_templates') THEN
      DELETE FROM full_editor_templates WHERE id IN (
        SELECT full_editor_template_id FROM screen_template_rotations
        WHERE screen_id IN (SELECT id FROM screens WHERE business_id = p_business_id)
        AND full_editor_template_id IS NOT NULL
      );
    END IF;
    DELETE FROM screen_template_rotations WHERE screen_id IN (SELECT id FROM screens WHERE business_id = p_business_id);
  END IF;
  DELETE FROM screen_menu WHERE screen_id IN (SELECT id FROM screens WHERE business_id = p_business_id);
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'menu_schedules') THEN
    DELETE FROM menu_schedules WHERE screen_id IN (SELECT id FROM screens WHERE business_id = p_business_id);
  END IF;

  -- Ekranlar
  DELETE FROM screens WHERE business_id = p_business_id;

  -- Menü öğeleri (menüler silinmeden önce; menu_items -> menus FK)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'menu_item_translations') THEN
    DELETE FROM menu_item_translations WHERE menu_item_id IN (SELECT id FROM menu_items WHERE menu_id IN (SELECT id FROM menus WHERE business_id = p_business_id));
  END IF;
  DELETE FROM menu_items WHERE menu_id IN (SELECT id FROM menus WHERE business_id = p_business_id);

  -- Menüler
  DELETE FROM menus WHERE business_id = p_business_id;

  -- Abonelik / ödemeler (subscriptions -> payments)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    DELETE FROM payments WHERE subscription_id IN (SELECT id FROM subscriptions WHERE business_id = p_business_id);
  END IF;
  DELETE FROM subscriptions WHERE business_id = p_business_id;

  -- payment_failures (varsa)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_failures') THEN
    DELETE FROM payment_failures WHERE business_id = p_business_id;
  END IF;

  -- Şablonlar (business_id dolu olanlar — user scope)
  UPDATE templates SET business_id = NULL WHERE business_id = p_business_id;

  -- Full Editor şablonları: bu işletmenin kullanıcılarına ait olanları sil
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'full_editor_templates') THEN
    DELETE FROM full_editor_templates WHERE created_by IN (SELECT id FROM users WHERE business_id = p_business_id);
  END IF;

  -- Kullanıcıları işletmeden çıkar (silmiyoruz; business_id = NULL yapıyoruz)
  UPDATE users SET business_id = NULL, updated_at = NOW() WHERE business_id = p_business_id;

  -- İşletmeyi sil
  DELETE FROM businesses WHERE id = p_business_id;
END;
$$;

COMMENT ON FUNCTION delete_business_cascade(UUID) IS 'İşletmeyi ve tüm bağımlı verileri (ekranlar, menüler, abonelik vb.) siler. Uygulama işletme sildiğinde bu RPC çağrılabilir.';

-- 2) İsteğe bağlı: Doğrudan DELETE FROM businesses yapılsın istemiyorsanız,
--    sadece delete_business_cascade RPC kullanın. CASCADE zaten yukarıdaki fonksiyonda.
--    Mevcut FK’ler CASCADE ise doğrudan delete de çalışır; değilse bu fonksiyonu kullanın.
