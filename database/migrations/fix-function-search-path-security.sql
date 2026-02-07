-- Migration: Fix "Function has role mutable search_path" security issues
-- Supabase Dashboard'da görünen güvenlik uyarılarını giderir.
-- Her fonksiyona SET search_path = public eklenir; çağıran search path'i değiştiremez.

-- 1. update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2. get_active_menu_for_screen
CREATE OR REPLACE FUNCTION get_active_menu_for_screen(p_screen_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_menu_id UUID;
    v_current_time TIME;
    v_current_day INTEGER;
BEGIN
    v_current_time := CURRENT_TIME;
    v_current_day := EXTRACT(DOW FROM CURRENT_TIMESTAMP)::INTEGER;

    SELECT menu_id INTO v_menu_id
    FROM menu_schedules
    WHERE screen_id = p_screen_id
      AND is_active = true
      AND (day_of_week IS NULL OR day_of_week = v_current_day)
      AND start_time <= v_current_time
      AND end_time > v_current_time
    ORDER BY start_time DESC
    LIMIT 1;

    IF v_menu_id IS NULL THEN
        SELECT menu_id INTO v_menu_id
        FROM screen_menu
        WHERE screen_id = p_screen_id
        ORDER BY display_order ASC
        LIMIT 1;
    END IF;

    RETURN v_menu_id;
END;
$$;

-- 3. check_screen_limit
CREATE OR REPLACE FUNCTION check_screen_limit(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_max_screens INTEGER;
    v_current_screens INTEGER;
    v_subscription_status TEXT;
BEGIN
    SELECT s.status, p.max_screens INTO v_subscription_status, v_max_screens
    FROM subscriptions s
    INNER JOIN plans p ON s.plan_id = p.id
    WHERE s.business_id = p_business_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF v_subscription_status IS NULL OR v_subscription_status != 'active' THEN
        RETURN false;
    END IF;

    IF v_max_screens = -1 THEN
        RETURN true;
    END IF;

    SELECT COUNT(*) INTO v_current_screens
    FROM screens
    WHERE business_id = p_business_id;

    RETURN v_current_screens < v_max_screens;
END;
$$;

-- 4. generate_qr_token
CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS TEXT
LANGUAGE sql
SET search_path = public
AS $$
  SELECT encode(gen_random_bytes(16), 'hex');
$$;

-- 5. content_library_null_uploaded_by_if_missing
CREATE OR REPLACE FUNCTION content_library_null_uploaded_by_if_missing()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.uploaded_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.uploaded_by) THEN
    NEW.uploaded_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. duplicate_template (template-library-schema'dan)
CREATE OR REPLACE FUNCTION duplicate_template(
  source_template_id UUID,
  new_name TEXT,
  new_display_name TEXT,
  new_created_by UUID,
  new_business_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_template_id UUID;
BEGIN
  INSERT INTO templates (
    name,
    display_name,
    description,
    block_count,
    preview_image_url,
    is_active,
    is_system,
    scope,
    created_by,
    business_id
  )
  SELECT
    new_name,
    new_display_name,
    description,
    block_count,
    preview_image_url,
    is_active,
    false,
    'user',
    new_created_by,
    new_business_id
  FROM templates
  WHERE id = source_template_id
  RETURNING id INTO new_template_id;

  INSERT INTO template_blocks (
    template_id,
    block_index,
    position_x,
    position_y,
    width,
    height,
    z_index,
    animation_type,
    animation_duration,
    animation_delay,
    style_config
  )
  SELECT
    new_template_id,
    block_index,
    position_x,
    position_y,
    width,
    height,
    COALESCE(z_index, 0),
    COALESCE(animation_type, 'fade'),
    COALESCE(animation_duration, 500),
    COALESCE(animation_delay, 0),
    COALESCE(style_config, '{}'::jsonb)
  FROM template_blocks
  WHERE template_id = source_template_id;

  RETURN new_template_id;
END;
$$;

-- 7. set_invoice_number_if_null (payments tablosu + invoice_number sütunu varsa)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq;
CREATE OR REPLACE FUNCTION set_invoice_number_if_null()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 8. generate_slug (varsa)
CREATE OR REPLACE FUNCTION generate_slug(name_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    slug TEXT;
    turkish_map JSONB := '{"ç":"c","Ç":"c","ğ":"g","Ğ":"g","ı":"i","İ":"i","ö":"o","Ö":"o","ş":"s","Ş":"s","ü":"u","Ü":"u"}'::JSONB;
    char TEXT;
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..length(name_text) LOOP
        char := substring(name_text FROM i FOR 1);
        IF turkish_map ? char THEN
            result := result || turkish_map->>char;
        ELSE
            result := result || char;
        END IF;
    END LOOP;
    slug := lower(result);
    slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'g');
    slug := regexp_replace(slug, '\s+', ' ', 'g');
    slug := replace(slug, ' ', '-');
    slug := regexp_replace(slug, '-+', '-', 'g');
    slug := trim(both '-' from slug);
    IF slug = '' OR slug IS NULL THEN
        slug := 'screen-' || to_hex(extract(epoch from now())::bigint);
    END IF;
    RETURN slug;
END;
$$;

-- NOT: business_owns_template, branch_can_override, get_hq_business gibi
-- enterprise schema fonksiyonları varsa Supabase SQL Editor'da ayrıca
-- SET search_path = public ekleyerek güncelleyebilirsiniz.
