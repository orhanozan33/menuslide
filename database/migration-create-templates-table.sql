-- Supabase'de public.templates / public.template_blocks tabloları yoksa oluşturur.
-- Hata: "Could not find the table 'public.templates' in the schema cache"
--
-- Çözüm:
-- 1. Supabase Dashboard → SQL Editor → New query
-- 2. Bu dosyanın içeriğini yapıştırıp Run
-- 3. Hata devam ederse: Settings → API → "Reload schema cache" (veya birkaç dakika bekleyin)
--
-- Ön koşul: businesses, users, screens tabloları mevcut olmalı (schema.sql çalışmış olmalı).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- updated_at trigger fonksiyonu (yoksa)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  block_count INTEGER NOT NULL DEFAULT 1 CHECK (block_count >= 1 AND block_count <= 16),
  preview_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_generated BOOLEAN DEFAULT false,
  ai_generation_params JSONB,
  scope TEXT DEFAULT 'system' CHECK (scope IN ('system', 'user')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  animated_zone_config JSONB,
  canvas_design JSONB
);

CREATE INDEX IF NOT EXISTS idx_templates_name ON public.templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_scope ON public.templates(scope);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_business_id ON public.templates(business_id);
CREATE INDEX IF NOT EXISTS idx_templates_block_count ON public.templates(block_count);

DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TEMPLATE_BLOCKS
-- ============================================
CREATE TABLE IF NOT EXISTS public.template_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  block_index INTEGER NOT NULL CHECK (block_index >= 0),
  position_x DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (position_x >= 0 AND position_x <= 100),
  position_y DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (position_y >= 0 AND position_y <= 100),
  width DECIMAL(5, 2) NOT NULL DEFAULT 100 CHECK (width > 0 AND width <= 100),
  height DECIMAL(5, 2) NOT NULL DEFAULT 100 CHECK (height > 0 AND height <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  z_index INTEGER DEFAULT 0,
  animation_type TEXT DEFAULT 'fade',
  animation_duration INTEGER DEFAULT 500,
  animation_delay INTEGER DEFAULT 0,
  style_config JSONB DEFAULT '{}'::jsonb,
  UNIQUE(template_id, block_index)
);

CREATE INDEX IF NOT EXISTS idx_template_blocks_template_id ON public.template_blocks(template_id);
CREATE INDEX IF NOT EXISTS idx_template_blocks_block_index ON public.template_blocks(template_id, block_index);

DROP TRIGGER IF EXISTS update_template_blocks_updated_at ON public.template_blocks;
CREATE TRIGGER update_template_blocks_updated_at
  BEFORE UPDATE ON public.template_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- screens.template_id (screens tablosu varsa)
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_screens_template_id ON public.screens(template_id);

-- PostgREST schema cache'in güncellenmesi için (Supabase bazen otomatik yapar)
NOTIFY pgrst, 'reload schema';
