-- Migration: Add 'video' type to content_library CHECK constraint
-- The original table has: CHECK (type IN ('image', 'icon', 'background', 'drink', 'text'))
-- We need to add 'video'

ALTER TABLE content_library DROP CONSTRAINT IF EXISTS content_library_type_check;

ALTER TABLE content_library ADD CONSTRAINT content_library_type_check
  CHECK (type IN ('image', 'icon', 'background', 'drink', 'text', 'video'));
