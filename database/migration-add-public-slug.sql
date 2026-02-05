-- Migration: Add public_slug column to screens table
-- This migration adds a slug column for readable URLs like /display/metro-pizzatv3

-- Add public_slug column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'screens' AND column_name = 'public_slug'
    ) THEN
        ALTER TABLE screens ADD COLUMN public_slug TEXT UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_screens_public_slug ON screens(public_slug);
    END IF;
END $$;

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name_text TEXT) RETURNS TEXT AS $$
DECLARE
    slug TEXT;
    turkish_map JSONB := '{"ç":"c","Ç":"c","ğ":"g","Ğ":"g","ı":"i","İ":"i","ö":"o","Ö":"o","ş":"s","Ş":"s","ü":"u","Ü":"u"}'::JSONB;
    char TEXT;
    result TEXT := '';
    i INT;
BEGIN
    -- Convert Turkish characters
    FOR i IN 1..length(name_text) LOOP
        char := substring(name_text FROM i FOR 1);
        IF turkish_map ? char THEN
            result := result || turkish_map->>char;
        ELSE
            result := result || char;
        END IF;
    END LOOP;
    
    -- Convert to lowercase, remove special chars, replace spaces with hyphens
    slug := lower(result);
    slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'g');
    slug := regexp_replace(slug, '\s+', ' ', 'g');
    slug := replace(slug, ' ', '-');
    slug := regexp_replace(slug, '-+', '-', 'g');
    slug := trim(both '-' from slug);
    
    -- If empty, generate default
    IF slug = '' OR slug IS NULL THEN
        slug := 'screen-' || to_hex(extract(epoch from now())::bigint);
    END IF;
    
    RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing screens that don't have one
DO $$
DECLARE
    screen_record RECORD;
    new_slug TEXT;
    counter INT;
    final_slug TEXT;
BEGIN
    FOR screen_record IN SELECT id, name FROM screens WHERE public_slug IS NULL OR public_slug = '' LOOP
        new_slug := generate_slug(screen_record.name);
        final_slug := new_slug;
        counter := 1;
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM screens WHERE public_slug = final_slug AND id != screen_record.id) LOOP
            final_slug := new_slug || '-' || counter;
            counter := counter + 1;
        END LOOP;
        
        UPDATE screens SET public_slug = final_slug WHERE id = screen_record.id;
    END LOOP;
END $$;
