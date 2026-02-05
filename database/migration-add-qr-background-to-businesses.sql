-- Migration: Add QR page background fields to businesses table
-- Lets users set a background image and color for the public QR menu page.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'qr_background_image_url'
    ) THEN
        ALTER TABLE businesses ADD COLUMN qr_background_image_url TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'qr_background_color'
    ) THEN
        ALTER TABLE businesses ADD COLUMN qr_background_color VARCHAR(32);
    END IF;
END $$;
