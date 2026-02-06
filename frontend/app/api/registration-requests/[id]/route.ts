import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.trim();
const USE_SELF = !API_BASE;
const TARGET_BASE = API_BASE || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'));
const REG_BASE_PATH = USE_SELF ? '/api/proxy/registration-requests' : '/registration-requests';

export const dynamic = 'force-dynamic';

/** Admin: Başvuruyu siler */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });
    const auth = request.headers.get('authorization') || '';
    const res = await fetch(`${TARGET_BASE}${REG_BASE_PATH}/${id}`, {
      method: 'DELETE',
      cache: 'no-store',
      headers: { ...(auth && { Authorization: auth }) },
    });
    const text = await res.text();
    if (!res.ok) {
      let errMsg = 'Delete failed';
      try {
        if (text) {
          const parsed = JSON.parse(text);
          errMsg = parsed.message || parsed.error || text;
        }
      } catch {
        if (text) errMsg = text;
      }
      return NextResponse.json({ message: errMsg }, { status: res.status });
    }
    return NextResponse.json({ deleted: true });
  } catch (e) {
    console.error('[api/registration-requests] DELETE error:', e);
    return NextResponse.json(
      { message: 'Backend bağlantı hatası.' },
      { status: 502 }
    );
  }
}
