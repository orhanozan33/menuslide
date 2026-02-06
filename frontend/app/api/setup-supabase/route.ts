/**
 * Supabase tablolarını sayfa yüklenince otomatik oluşturur.
 * İlk çağrıda public.templates yoksa full bootstrap çalıştırır; varsa atlar.
 * Gerekli env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_DB_PASSWORD
 */

import { NextResponse } from 'next/server';
import { bootstrapSql } from '@/lib/supabase-bootstrap-embed';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

function getConnectionConfig(): { connectionString: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password || !url) return null;
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  const ref = match ? match[1] : '';
  if (!ref) return null;
  const host = `db.${ref}.supabase.co`;
  const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
  return { connectionString };
}

export async function GET() {
  const config = getConnectionConfig();
  if (!config) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: 'SUPABASE_DB_PASSWORD .env.local içinde tanımlı değil; tablolar otomatik oluşturulmaz.',
    });
  }

  const registrationRequestsSql = `
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  tv_count TEXT,
  address TEXT,
  province TEXT,
  city TEXT,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'registered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
`;

  const { Client } = await import('pg');
  const client = new Client(config);
  try {
    await client.connect();
    const check = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'templates' LIMIT 1`
    );
    if (check.rows.length === 0) {
      await client.query(bootstrapSql);
    }
    await client.query(registrationRequestsSql);
    return NextResponse.json({ ok: true, message: 'Supabase tabloları hazır.' });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || 'Veritabanı hatası.',
        detail: process.env.NODE_ENV === 'development' ? e?.message : undefined,
      },
      { status: 500 }
    );
  } finally {
    await client.end().catch(() => {});
  }
}
