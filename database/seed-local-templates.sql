-- Yerel PostgreSQL'e sistem şablonlarını ekler (frontend'de "Şablonlar" listesinde görünür).
-- Çalıştırma: psql -U postgres -d tvproje -f database/seed-local-templates.sql
-- Ön koşul: templates ve template_blocks tabloları mevcut (migration-create-templates-table.sql).

-- Şablonlar (yoksa ekle)
INSERT INTO templates (name, display_name, description, block_count, is_system, is_active, scope)
SELECT 'single', 'Single Layout', 'Full screen single block layout', 1, true, true, 'system'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'single');

INSERT INTO templates (name, display_name, description, block_count, is_system, is_active, scope)
SELECT 'split_2', '2 Split Layout', 'İki eşit blok yan yana', 2, true, true, 'system'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'split_2');

INSERT INTO templates (name, display_name, description, block_count, is_system, is_active, scope)
SELECT 'split_3', '3 Split Layout', 'Üç blok düzen', 3, true, true, 'system'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'split_3');

INSERT INTO templates (name, display_name, description, block_count, is_system, is_active, scope)
SELECT 'grid_4', '4 Grid Layout', '2x2 grid, dört blok', 4, true, true, 'system'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'grid_4');

INSERT INTO templates (name, display_name, description, block_count, is_system, is_active, scope)
SELECT 'split_5', '5 Split Layout', 'Beş blok düzen', 5, true, true, 'system'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'split_5');

INSERT INTO templates (name, display_name, description, block_count, is_system, is_active, scope)
SELECT 'grid_6', '6 Grid Layout', 'Altı blok grid', 6, true, true, 'system'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'grid_6');

INSERT INTO templates (name, display_name, description, block_count, is_system, is_active, scope)
SELECT 'grid_7', '7 Grid Layout', 'Yedi blok 4x2 grid', 7, true, true, 'system'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'grid_7');

INSERT INTO templates (name, display_name, description, block_count, is_system, is_active, scope)
SELECT 'grid_8', '8 Grid Layout', 'Sekiz blok 4x2 grid', 8, true, true, 'system'
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'grid_8');

-- Single: 1 blok
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM templates WHERE name = 'single';
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM template_blocks WHERE template_id = v_id) THEN
    INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height)
    VALUES (v_id, 0, 0, 0, 100, 100);
  END IF;
END $$;

-- split_2: 2 blok 50/50
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM templates WHERE name = 'split_2';
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM template_blocks WHERE template_id = v_id) THEN
    INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height)
    VALUES (v_id, 0, 0, 0, 50, 100), (v_id, 1, 50, 0, 50, 100);
  END IF;
END $$;

-- split_3: 3 blok
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM templates WHERE name = 'split_3';
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM template_blocks WHERE template_id = v_id) THEN
    INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height)
    VALUES (v_id, 0, 0, 0, 33.33, 100), (v_id, 1, 33.33, 0, 33.33, 100), (v_id, 2, 66.66, 0, 33.34, 100);
  END IF;
END $$;

-- grid_4: 2x2
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM templates WHERE name = 'grid_4';
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM template_blocks WHERE template_id = v_id) THEN
    INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height)
    VALUES (v_id, 0, 0, 0, 50, 50), (v_id, 1, 50, 0, 50, 50), (v_id, 2, 0, 50, 50, 50), (v_id, 3, 50, 50, 50, 50);
  END IF;
END $$;

-- split_5
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM templates WHERE name = 'split_5';
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM template_blocks WHERE template_id = v_id) THEN
    INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height)
    VALUES (v_id, 0, 0, 0, 40, 50), (v_id, 1, 40, 0, 30, 50), (v_id, 2, 70, 0, 30, 50), (v_id, 3, 0, 50, 50, 50), (v_id, 4, 50, 50, 50, 50);
  END IF;
END $$;

-- grid_6: 3x2
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM templates WHERE name = 'grid_6';
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM template_blocks WHERE template_id = v_id) THEN
    INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height)
    VALUES (v_id, 0, 0, 0, 33.33, 50), (v_id, 1, 33.33, 0, 33.33, 50), (v_id, 2, 66.66, 0, 33.34, 50),
           (v_id, 3, 0, 50, 33.33, 50), (v_id, 4, 33.33, 50, 33.33, 50), (v_id, 5, 66.66, 50, 33.34, 50);
  END IF;
END $$;

-- grid_7
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM templates WHERE name = 'grid_7';
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM template_blocks WHERE template_id = v_id) THEN
    INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height)
    VALUES (v_id, 0, 0, 0, 25, 50), (v_id, 1, 25, 0, 25, 50), (v_id, 2, 50, 0, 25, 50), (v_id, 3, 75, 0, 25, 50),
           (v_id, 4, 0, 50, 25, 50), (v_id, 5, 25, 50, 25, 50), (v_id, 6, 50, 50, 50, 50);
  END IF;
END $$;

-- grid_8
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM templates WHERE name = 'grid_8';
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM template_blocks WHERE template_id = v_id) THEN
    INSERT INTO template_blocks (template_id, block_index, position_x, position_y, width, height)
    VALUES (v_id, 0, 0, 0, 25, 50), (v_id, 1, 25, 0, 25, 50), (v_id, 2, 50, 0, 25, 50), (v_id, 3, 75, 0, 25, 50),
           (v_id, 4, 0, 50, 25, 50), (v_id, 5, 25, 50, 25, 50), (v_id, 6, 50, 50, 25, 50), (v_id, 7, 75, 50, 25, 50);
  END IF;
END $$;
