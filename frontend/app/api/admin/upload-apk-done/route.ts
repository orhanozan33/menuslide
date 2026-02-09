import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const BUCKET = 'menuslide';
const APK_PATH = 'downloads/Menuslide.apk';

/** Super admin: APK yüklemesi tamamlandıktan sonra indirme URL'ini tv_app_settings'e yazar. */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await verifyToken(authHeader ?? null);
    if (user?.role !== 'super_admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const supabase = getServerSupabase();
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(APK_PATH);
    const publicUrl = urlData?.publicUrl ?? '';

    const { data: row } = await supabase.from('tv_app_settings').select('id').limit(1).maybeSingle();
    if (row) {
      await supabase.from('tv_app_settings').update({
        download_url: publicUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', (row as { id: string }).id);
    } else {
      await supabase.from('tv_app_settings').insert({
        id: '00000000-0000-0000-0000-000000000001',
        api_base_url: '',
        download_url: publicUrl,
        watchdog_interval_minutes: 5,
      });
    }

    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    console.error('[upload-apk-done]', e);
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Güncelleme hatası' }, { status: 500 });
  }
}
