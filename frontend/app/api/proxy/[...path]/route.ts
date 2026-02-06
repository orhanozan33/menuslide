import { NextRequest } from 'next/server';
import { handleLocal } from '@/lib/api-backend/dispatch';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handle(
  request: NextRequest,
  pathSegments: string[],
  method: string
): Promise<Response> {
  try {
    return await handleLocal(request, pathSegments, method);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isDbConnection = /LOCAL_DB_CONNECTION_FAILED|ECONNREFUSED|connect ENOENT/i.test(message);
    console.error('[api/proxy] handler error:', e);
    if (isDbConnection) {
      return Response.json(
        {
          message: 'Yerel veritabanına bağlanılamıyor. USE_LOCAL_DB kullanıyorsanız PostgreSQL çalışıyor olmalı; yoksa .env.local içinde USE_LOCAL_DB kaldırın.',
        },
        { status: 503 }
      );
    }
    return Response.json(
      { message: message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function toPathArray(path: string | string[] | undefined): string[] {
  if (path === undefined || path === null) return [];
  const parts = Array.isArray(path) ? path : [path];
  const segments = parts.flatMap((p) => {
    const s = String(p).trim();
    if (!s) return [];
    return s.includes('/') ? s.split('/').filter(Boolean) : [s];
  });
  return segments.filter(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string | string[] }> }
) {
  const p = await params;
  const path = toPathArray(p.path);
  return handle(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string | string[] }> }
) {
  const p = await params;
  return handle(request, toPathArray(p.path), 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string | string[] }> }
) {
  const p = await params;
  return handle(request, toPathArray(p.path), 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string | string[] }> }
) {
  const p = await params;
  return handle(request, toPathArray(p.path), 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string | string[] }> }
) {
  const p = await params;
  return handle(request, toPathArray(p.path), 'DELETE');
}
