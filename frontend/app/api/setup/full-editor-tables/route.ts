/**
 * Full Editor tablolarını oluşturur (full_editor_categories, full_editor_templates).
 * "Could not find the table 'public.full_editor_templates'" hatası için çözüm.
 *
 * USE_LOCAL_DB: Yerel PostgreSQL'e yazar.
 * Supabase: SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL ile bağlanır.
 *
 * Çağrı: POST /api/setup/full-editor-tables
 * Yetki: x-bootstrap-secret (BOOTSTRAP_SECRET) VEYA Bearer token ile admin/super_admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLocalPg } from '@/lib/api-backend/db-local';
import { verifyToken } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const FULL_EDITOR_SQL = `-- Full Editor tabloları
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
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
`;

/** EXECUTE FUNCTION Postgres 11+; Eski sürümler için EXECUTE PROCEDURE */
async function runSql(client: { query: (sql: string) => Promise<unknown> }, sql: string) {
  const sqlCompat = sql.replace(/EXECUTE FUNCTION/g, 'EXECUTE PROCEDURE');
  await client.query(sqlCompat);
}

function getSupabaseConfig(): { connectionString: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password || !url) return null;
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  const ref = match ? match[1] : '';
  if (!ref) return null;
  const host = `db.${ref}.supabase.co`;
  return {
    connectionString: `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`,
  };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-bootstrap-secret') || new URL(req.url).searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  const user = await verifyToken(authHeader);
  const isAdmin = user && (user.role === 'super_admin' || user.role === 'admin');
  const expected = process.env.BOOTSTRAP_SECRET;
  const secretOk = expected && secret === expected;
  if (!secretOk && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized. Admin veya secret gerekli.' }, { status: 401 });
  }

  try {
    if (process.env.USE_LOCAL_DB === 'true' || process.env.USE_LOCAL_DB === '1') {
      const client = await getLocalPg();
      await runSql(client as any, FULL_EDITOR_SQL);
      return NextResponse.json({ ok: true, message: 'Full Editor tabloları oluşturuldu (yerel DB).' });
    }

    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_DB_PASSWORD gerekli.' },
        { status: 500 }
      );
    }

    const { Client } = await import('pg');
    const client = new Client(config);
    await client.connect();
    try {
      await runSql(client as any, FULL_EDITOR_SQL);
      return NextResponse.json({ ok: true, message: 'Full Editor tabloları oluşturuldu (Supabase).' });
    } finally {
      await client.end().catch(() => {});
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[setup/full-editor-tables]', e);
    return NextResponse.json({ error: 'Database', message: msg }, { status: 500 });
  }
}
