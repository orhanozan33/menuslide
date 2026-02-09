import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Use POST to generate menu' });
}

export async function POST(request: NextRequest) {
  try {
    await request.json();
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
