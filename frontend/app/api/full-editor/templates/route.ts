import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth-server';
import { useLocalDb, queryLocal, insertLocal, updateLocal, deleteLocal } from '@/lib/api-backend/db-local';
import { generateSlidesForScreen } from '@/lib/generate-slides-internal';

export const dynamic = 'force-dynamic';

/** GET /api/full-editor/templates – Full Editor şablonları (?category_id=uuid, ?scope=system|user, ?user_id=xxx admin için, ?name=xxx aynı isim kontrolü) */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const scope = searchParams.get('scope');
    const idParam = searchParams.get('id');
    const userIdParam = searchParams.get('user_id');
    const nameParam = searchParams.get('name');

    let targetUserId: string | null = null;
    if (scope === 'user') {
      const authHeader = request.headers.get('authorization');
      const user = await verifyToken(authHeader);
      if (!user) return NextResponse.json([], { status: 200 });
      const isAdmin = user.role === 'super_admin' || user.role === 'admin';
      targetUserId = (isAdmin && userIdParam) ? userIdParam : user.userId;
    } else if (scope === 'system' && nameParam) {
      const authHeader = request.headers.get('authorization');
      const user = await verifyToken(authHeader);
      if (!user) return NextResponse.json([], { status: 200 });
    }

    if (useLocalDb()) {
      let sql = 'SELECT id, name, canvas_json, preview_image, category_id, sales, uses, created_at FROM full_editor_templates';
      const params: string[] = [];
      const conds: string[] = [];
      if (idParam) {
        params.push(idParam);
        conds.push(`id = $${params.length}`);
      }
      if (categoryId) {
        params.push(categoryId);
        conds.push(`category_id = $${params.length}`);
      }
      if (scope === 'system') conds.push('created_by IS NULL');
      if (scope === 'user' && targetUserId) {
        params.push(targetUserId);
        conds.push(`created_by = $${params.length}`);
      }
      if (nameParam && nameParam.trim()) {
        params.push(nameParam.trim());
        conds.push(`name = $${params.length}`);
      }
      if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
      sql += ' ORDER BY created_at DESC' + (idParam ? ' LIMIT 1' : nameParam ? ' LIMIT 1' : '');
      const rows = await queryLocal(sql, params);
      if (idParam && rows?.[0]) return NextResponse.json(rows[0]);
      if (nameParam && rows?.[0]) return NextResponse.json(rows[0]);
      return NextResponse.json(rows ?? []);
    }

    const supabase = getServerSupabase();
    let query = supabase
      .from('full_editor_templates')
      .select('id, name, canvas_json, preview_image, category_id, sales, uses, created_at')
      .order('created_at', { ascending: false });

    if (idParam) query = query.eq('id', idParam).limit(1);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (scope === 'system') query = query.is('created_by', null);
    if (scope === 'user' && targetUserId) query = query.eq('created_by', targetUserId);
    if (nameParam && nameParam.trim()) query = query.eq('name', nameParam.trim()).limit(1);

    const { data, error } = await query;
    if (error) return NextResponse.json([], { status: 200 });
    const arr = Array.isArray(data) ? data : (data ? [data] : []);
    if (idParam && arr[0]) return NextResponse.json(arr[0]);
    if (nameParam && arr[0]) return NextResponse.json(arr[0]);
    return NextResponse.json(arr ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

/** POST /api/full-editor/templates – Yeni şablon kaydet. Admin için scope: system | user, target_user_id opsiyonel. */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await verifyToken(authHeader);
    if (!user) {
      return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { name, canvas_json, category_id, scope, target_user_id, preview_image } = body as {
      name?: string;
      canvas_json?: object;
      category_id?: string | null;
      scope?: 'system' | 'user';
      target_user_id?: string | null;
      preview_image?: string | null;
    };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name gerekli' }, { status: 400 });
    }

    const isAdmin = user.role === 'super_admin' || user.role === 'admin';
    const effectiveScope = scope && (scope === 'system' || scope === 'user') ? scope : 'user';
    let createdBy: string | null = user.userId;

    if (effectiveScope === 'system') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Sadece admin sistem şablonu oluşturabilir' }, { status: 403 });
      }
      createdBy = null;
    } else if (effectiveScope === 'user' && isAdmin && target_user_id) {
      createdBy = target_user_id;
    }

    const insertRow: Record<string, unknown> = {
      name: name.trim(),
      canvas_json: canvas_json ?? {},
      category_id: category_id || null,
      created_by: createdBy,
    };
    if (typeof preview_image === 'string' && preview_image.length > 0) {
      insertRow.preview_image = preview_image;
    }

    if (useLocalDb()) {
      const inserted = await insertLocal('full_editor_templates', insertRow);
      return NextResponse.json({ id: inserted.id, name: inserted.name, created_at: inserted.created_at });
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('full_editor_templates')
      .insert(insertRow)
      .select('id, name, created_at')
      .single();
    if (error) {
      console.error('[full-editor/templates POST]', error);
      return NextResponse.json({ error: error.message, detail: error.details || error.hint }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[full-editor/templates POST]', err);
    return NextResponse.json({ error: 'Kaydetme başarısız', detail: msg }, { status: 500 });
  }
}

/** PATCH /api/full-editor/templates – Şablon güncelle (name, canvas_json, preview_image, category_id). En az id gerekli. */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await verifyToken(authHeader);
    if (!user) {
      return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { id, name, canvas_json, preview_image, category_id } = body as {
      id?: string;
      name?: string;
      canvas_json?: object;
      preview_image?: string | null;
      category_id?: string | null;
    };
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
    }
    const templateId = id.trim();
    const updates: Record<string, unknown> = {};
    if (name !== undefined && typeof name === 'string' && name.trim().length > 0) updates.name = name.trim();
    if (canvas_json !== undefined) updates.canvas_json = canvas_json ?? {};
    if (preview_image !== undefined) updates.preview_image = preview_image || null;
    if (category_id !== undefined) updates.category_id = category_id || null;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan gerekli (name, canvas_json, preview_image, category_id)' }, { status: 400 });
    }

    if (useLocalDb()) {
      const existing = await queryLocal<{ created_by: string | null }>(
        'SELECT created_by FROM full_editor_templates WHERE id = $1',
        [templateId]
      );
      if (!existing?.[0]) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 });
      }
      const isAdmin = user.role === 'super_admin' || user.role === 'admin';
      const createdBy = existing[0].created_by;
      if (!createdBy) {
        if (!isAdmin) return NextResponse.json({ error: 'Sistem şablonunu sadece admin değiştirebilir' }, { status: 403 });
      } else if (createdBy !== user.userId && !isAdmin) {
        return NextResponse.json({ error: 'Bu şablonu değiştiremezsiniz' }, { status: 403 });
      }
      const updated = await updateLocal('full_editor_templates', templateId, updates);
      if ((canvas_json !== undefined || preview_image !== undefined) && getServerSupabase()) {
        const sb = getServerSupabase();
        after(async () => {
          try {
            const { data: rotations } = await sb.from('screen_template_rotations').select('screen_id').eq('full_editor_template_id', templateId).eq('is_active', true);
            const screenIds = [...new Set((rotations ?? []).map((r: { screen_id: string }) => r.screen_id))];
            for (const screenId of screenIds) {
              const r = await generateSlidesForScreen(screenId);
              if (r.generated > 0) console.log('[full-editor PATCH local] regenerated slides screen=', screenId);
            }
          } catch (e) {
            console.error('[full-editor PATCH local] generate-slides failed', e);
          }
        });
      }
      return NextResponse.json(updated ?? { id: templateId, ...updates });
    }

    const supabase = getServerSupabase();
    const { data: row, error: fetchErr } = await supabase
      .from('full_editor_templates')
      .select('created_by')
      .eq('id', templateId)
      .single();
    if (fetchErr || !row) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const isAdmin = user.role === 'super_admin' || user.role === 'admin';
    const createdBy = (row as { created_by: string | null }).created_by;
    if (!createdBy) {
      if (!isAdmin) return NextResponse.json({ error: 'Sistem şablonunu sadece admin değiştirebilir' }, { status: 403 });
    } else if (createdBy !== user.userId && !isAdmin) {
      return NextResponse.json({ error: 'Bu şablonu değiştiremezsiniz' }, { status: 403 });
    }
    const { data, error } = await supabase
      .from('full_editor_templates')
      .update(updates)
      .eq('id', templateId)
      .select('id, name, created_at')
      .single();
    if (error) {
      console.error('[full-editor/templates PATCH]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (canvas_json !== undefined || preview_image !== undefined) {
      after(async () => {
        try {
          const { data: rotations } = await supabase
            .from('screen_template_rotations')
            .select('screen_id')
            .eq('full_editor_template_id', templateId)
            .eq('is_active', true);
          const screenIds = [...new Set((rotations ?? []).map((r: { screen_id: string }) => r.screen_id))];
          for (const screenId of screenIds) {
            const r = await generateSlidesForScreen(screenId);
            if (r.generated > 0) console.log('[full-editor PATCH] regenerated slides screen=', screenId, 'count=', r.generated);
          }
        } catch (e) {
          console.error('[full-editor PATCH] generate-slides failed', e);
        }
      });
    }
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[full-editor/templates PATCH]', err);
    return NextResponse.json({ error: 'Güncelleme başarısız', detail: msg }, { status: 500 });
  }
}

/** DELETE /api/full-editor/templates?id=xxx – Full Editor şablonu sil */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await verifyToken(authHeader);
    if (!user) {
      return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    if (!idParam || idParam.trim().length === 0) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
    }
    const id = idParam.trim();

    if (useLocalDb()) {
      const existing = await queryLocal<{ created_by: string | null }>(
        'SELECT created_by FROM full_editor_templates WHERE id = $1',
        [id]
      );
      if (!existing?.[0]) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 });
      }
      const isAdmin = user.role === 'super_admin' || user.role === 'admin';
      const createdBy = existing[0].created_by;
      if (!createdBy) {
        if (!isAdmin) {
          return NextResponse.json({ error: 'Sistem şablonunu sadece admin silebilir' }, { status: 403 });
        }
      } else if (createdBy !== user.userId && !isAdmin) {
        return NextResponse.json({ error: 'Bu şablonu silemezsiniz' }, { status: 403 });
      }
      await deleteLocal('full_editor_templates', id);
      return NextResponse.json({ message: 'Template deleted successfully' });
    }

    const supabase = getServerSupabase();
    const { data: row, error: fetchErr } = await supabase
      .from('full_editor_templates')
      .select('created_by')
      .eq('id', id)
      .single();
    if (fetchErr || !row) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const isAdmin = user.role === 'super_admin' || user.role === 'admin';
    const createdBy = (row as { created_by: string | null }).created_by;
    if (!createdBy) {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Sistem şablonunu sadece admin silebilir' }, { status: 403 });
      }
    } else if (createdBy !== user.userId && !isAdmin) {
      return NextResponse.json({ error: 'Bu şablonu silemezsiniz' }, { status: 403 });
    }
    const { error: delErr } = await supabase.from('full_editor_templates').delete().eq('id', id);
    if (delErr) {
      console.error('[full-editor/templates DELETE]', delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[full-editor/templates DELETE]', err);
    return NextResponse.json({ error: 'Silme başarısız', detail: msg }, { status: 500 });
  }
}
