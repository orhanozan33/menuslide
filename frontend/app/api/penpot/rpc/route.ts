import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PENPOT_API_URL = (process.env.PENPOT_API_URL || 'https://design.penpot.app').replace(/\/$/, '');
const PENPOT_ACCESS_TOKEN = process.env.PENPOT_ACCESS_TOKEN?.trim();

/**
 * Penpot RPC proxy: body = { method: string, params?: object }.
 * Token sadece sunucuda; istemci token görmez.
 */
export async function POST(req: NextRequest) {
  if (!PENPOT_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'PENPOT_ACCESS_TOKEN tanımlı değil.' },
      { status: 503 }
    );
  }

  let body: { method?: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON body.' }, { status: 400 });
  }

  const method = typeof body?.method === 'string' ? body.method.trim() : '';
  if (!method) {
    return NextResponse.json({ error: 'Body içinde "method" gerekli.' }, { status: 400 });
  }

  const params = body.params && typeof body.params === 'object' ? body.params : {};

  try {
    const res = await fetch(`${PENPOT_API_URL}/api/rpc/command/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${PENPOT_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(params),
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        { error: 'Penpot API geçersiz yanıt', raw: text.slice(0, 300) },
        { status: 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Penpot API hata', status: res.status, data },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Penpot RPC error:', err);
    return NextResponse.json(
      { error: 'Penpot API bağlantı hatası', detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
