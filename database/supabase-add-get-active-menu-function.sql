-- Supabase'de eksikse: get_active_menu_for_screen ve check_screen_limit
-- SQL Editor'da bu dosyayı çalıştırın. PublicController getScreen hatası biter.

CREATE OR REPLACE FUNCTION get_active_menu_for_screen(p_screen_id UUID)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_screen_limit(p_business_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;
