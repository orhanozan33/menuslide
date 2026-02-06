/**
 * Supabase veritabanı bootstrap: Tüm tabloları ve migration'ları tek seferde oluşturur.
 * Sadece BOOTSTRAP_SECRET ile çağrılabilir (güvenlik).
 *
 * Vercel env: BOOTSTRAP_SECRET, SUPABASE_DB_PASSWORD, NEXT_PUBLIC_SUPABASE_URL
 * Çağrı: GET veya POST /api/setup/bootstrap-db?secret=BOOTSTRAP_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getSecret(req: NextRequest): string | null {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('secret');
  if (fromQuery) return fromQuery;
  return req.headers.get('x-bootstrap-secret');
}

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

export async function GET(req: NextRequest) {
  return runBootstrap(req);
}

export async function POST(req: NextRequest) {
  return runBootstrap(req);
}

async function runBootstrap(req: NextRequest) {
  const secret = getSecret(req);
  const expected = process.env.BOOTSTRAP_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Geçersiz veya eksik secret.' },
      { status: 401 }
    );
  }

  const config = getConnectionConfig();
  if (!config) {
    return NextResponse.json(
      {
        error: 'Config',
        message:
          'NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_DB_PASSWORD ortam değişkenleri gerekli.',
      },
      { status: 500 }
    );
  }

  let sql: string;
  try {
    const path = join(process.cwd(), 'lib', 'supabase-bootstrap.sql');
    sql = readFileSync(path, 'utf-8');
  } catch (e) {
    return NextResponse.json(
      { error: 'File', message: 'Bootstrap SQL dosyası okunamadı.' },
      { status: 500 }
    );
  }

  const client = new Client(config);
  try {
    await client.connect();
    await client.query(sql);
    return NextResponse.json({ ok: true, message: 'Tablolar oluşturuldu.' });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'Database',
        message: e?.message || 'Veritabanı hatası.',
        detail: process.env.NODE_ENV === 'development' ? e?.message : undefined,
      },
      { status: 500 }
    );
  } finally {
    await client.end().catch(() => {});
  }
}
