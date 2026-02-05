import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PENPOT_API_URL = (process.env.PENPOT_API_URL || 'https://design.penpot.app').replace(/\/$/, '');
const PENPOT_ACCESS_TOKEN = process.env.PENPOT_ACCESS_TOKEN?.trim();

/**
 * Penpot API: get-profile (token ile kimlik doğrulama).
 * Token yalnızca sunucuda tutulur; istemciye gönderilmez.
 */
export async function GET() {
  if (!PENPOT_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'Penpot erişim tokenı tanımlı değil. PENPOT_ACCESS_TOKEN ile .env ayarlayın.' },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${PENPOT_API_URL}/api/rpc/command/get-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${PENPOT_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: 'Penpot API yanıt hatası', status: res.status, detail: text.slice(0, 200) },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Penpot get-profile error:', err);
    return NextResponse.json(
      { error: 'Penpot API bağlantı hatası', detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
