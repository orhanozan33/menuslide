import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    const res = await fetch(`${BACKEND_URL}/registration-requests/${id}`, {
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
