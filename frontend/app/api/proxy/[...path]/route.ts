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
    console.error('[api/proxy] handler error:', e);
    return Response.json(
      { message: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handle(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handle(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handle(request, path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handle(request, path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handle(request, path, 'DELETE');
}
