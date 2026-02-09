-- Full Editor: PosterMyWall tarzı kategori ve şablon tabloları
-- Kategoriler: name, description, image_url_1, image_url_2
-- Şablonlar: name, canvas_json, preview_image, category_id, created_by, sales, uses

CREATE TABLE IF NOT EXISTS full_editor_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    image_url_1 TEXT,
    image_url_2 TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS full_editor_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    canvas_json JSONB NOT NULL DEFAULT '{}',
    preview_image TEXT,
    category_id UUID REFERENCES full_editor_categories(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sales INTEGER DEFAULT 0,
    uses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_full_editor_templates_category ON full_editor_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_full_editor_templates_created_by ON full_editor_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_full_editor_categories_order ON full_editor_categories(display_order);

CREATE OR REPLACE FUNCTION update_full_editor_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_full_editor_templates_updated_at ON full_editor_templates;
CREATE TRIGGER update_full_editor_templates_updated_at
    BEFORE UPDATE ON full_editor_templates
    FOR EACH ROW EXECUTE FUNCTION update_full_editor_templates_updated_at();
