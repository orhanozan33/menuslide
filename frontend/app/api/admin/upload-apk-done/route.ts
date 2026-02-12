import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const BUCKET = 'menuslide';
const APK_PATH = 'downloads/Menuslide.apk';

/** Super admin: APK yüklemesi tamamlandıktan sonra indirme URL'ini ve (verilmişse) sürüm bilgisini tv_app_settings'e yazar. */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await verifyToken(authHeader ?? null);
    if (!user) {
      return NextResponse.json({ message: 'Oturum gerekli.' }, { status: 401 });
    }
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return NextResponse.json({ message: 'Sadece admin veya süper admin.' }, { status: 403 });
    }

    let body: { versionCode?: number; versionName?: string } = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      /* body opsiyonel */
    }

    const supabase = getServerSupabase();
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(APK_PATH);
    const publicUrl = urlData?.publicUrl ?? '';

    const apiBase = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://menuslide.com';
    const updates: Record<string, unknown> = {
      download_url: publicUrl,
      updated_at: new Date().toISOString(),
    };
    if (typeof body.versionCode === 'number' && Number.isInteger(body.versionCode)) {
      updates.min_version_code = body.versionCode;
      updates.latest_version_code = body.versionCode;
    }
    if (typeof body.versionName === 'string' && body.versionName.trim()) {
      updates.latest_version_name = body.versionName.trim();
    }

    const { data: row } = await supabase.from('tv_app_settings').select('id, api_base_url').limit(1).maybeSingle();
    if (row) {
      const existing = row as { id: string; api_base_url?: string | null };
      if (!existing.api_base_url?.trim()) updates.api_base_url = apiBase;
      await supabase.from('tv_app_settings').update(updates).eq('id', existing.id);
    } else {
      const insertRow: Record<string, unknown> = {
        id: '00000000-0000-0000-0000-000000000001',
        api_base_url: apiBase,
        download_url: publicUrl,
        watchdog_interval_minutes: 5,
      };
      if (typeof updates.min_version_code === 'number') insertRow.min_version_code = updates.min_version_code;
      if (typeof updates.latest_version_code === 'number') insertRow.latest_version_code = updates.latest_version_code;
      if (typeof updates.latest_version_name === 'string') insertRow.latest_version_name = updates.latest_version_name;
      await supabase.from('tv_app_settings').insert(insertRow);
    }

    return NextResponse.json({
      url: publicUrl,
      versionCode: updates.latest_version_code,
      versionName: updates.latest_version_name,
    });
  } catch (e) {
    console.error('[upload-apk-done]', e);
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Güncelleme hatası' }, { status: 500 });
  }
}
