import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth-server';
import { useLocalDb, queryLocal, insertLocal } from '@/lib/api-backend/db-local';

export const dynamic = 'force-dynamic';

/** POST /api/full-editor/templates/duplicate – Full Editor şablonunu kullanıcıya kopyala (Bunu kullan) */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await verifyToken(authHeader);
    if (!user) {
      return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id: sourceId, name: customName } = body as { id?: string; name?: string };
    if (!sourceId || typeof sourceId !== 'string') {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
    }

    if (useLocalDb()) {
      const orig = await queryLocal<{ id: string; name: string; canvas_json: object; preview_image: string | null; category_id: string | null }>(
        'SELECT id, name, canvas_json, preview_image, category_id FROM full_editor_templates WHERE id = $1',
        [sourceId]
      );
      if (!orig?.[0]) {
        return NextResponse.json({ message: 'Template not found' }, { status: 404 });
      }
      const o = orig[0];
      const insertRow: Record<string, unknown> = {
        name: typeof customName === 'string' && customName.trim() ? customName.trim() : `${o.name} (Kopya)`,
        canvas_json: o.canvas_json ?? {},
        category_id: o.category_id,
        preview_image: o.preview_image,
        created_by: user.userId,
      };
      const inserted = await insertLocal('full_editor_templates', insertRow);
      return NextResponse.json({
        id: inserted.id,
        name: inserted.name,
        canvas_json: inserted.canvas_json,
        created_at: inserted.created_at,
      });
    }

    const supabase = getServerSupabase();
    const { data: orig, error: fetchErr } = await supabase
      .from('full_editor_templates')
      .select('id, name, canvas_json, preview_image, category_id')
      .eq('id', sourceId)
      .single();
    if (fetchErr || !orig) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }
    const o = orig as { name: string; canvas_json: object; preview_image: string | null; category_id: string | null };
    const insertRow = {
      name: typeof customName === 'string' && customName.trim() ? customName.trim() : `${o.name} (Kopya)`,
      canvas_json: o.canvas_json ?? {},
      category_id: o.category_id,
      preview_image: o.preview_image,
      created_by: user.userId,
    };
    const { data: inserted, error: insertErr } = await supabase
      .from('full_editor_templates')
      .insert(insertRow)
      .select('id, name, canvas_json, created_at')
      .single();
    if (insertErr) {
      console.error('[full-editor/templates duplicate]', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
    return NextResponse.json(inserted);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[full-editor/templates duplicate]', err);
    return NextResponse.json({ error: 'Kopyalama başarısız', detail: msg }, { status: 500 });
  }
}
