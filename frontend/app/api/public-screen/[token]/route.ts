import { NextRequest, NextResponse } from 'next/server';
import * as publicScreenHandlers from '@/lib/api-backend/handlers/public-screen';

/**
 * GET /api/public-screen/:token – TV yayını verisi (Supabase).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ screen: null, notFound: true, menus: [] }, { status: 200 });
  }
  return publicScreenHandlers.getScreenByToken(token, request);
}
