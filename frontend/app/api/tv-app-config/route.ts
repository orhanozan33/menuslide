import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const defaultConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL || '',
  downloadUrl: '/downloads/Menuslide.apk',
  watchdogIntervalMinutes: 5,
};

/** Public: TV uygulaması bu endpoint ile API adresini alabilir */
export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase
      .from('tv_app_settings')
      .select('api_base_url, download_url, watchdog_interval_minutes')
      .limit(1)
      .maybeSingle();
    if (data) {
      return NextResponse.json({
        apiBaseUrl: (data as { api_base_url?: string }).api_base_url ?? defaultConfig.apiBaseUrl,
        downloadUrl: (data as { download_url?: string }).download_url ?? defaultConfig.downloadUrl,
        watchdogIntervalMinutes: (data as { watchdog_interval_minutes?: number }).watchdog_interval_minutes ?? 5,
      });
    }
  } catch {
    /* fallback */
  }
  return NextResponse.json(defaultConfig);
}

/** Super admin: TV uygulaması ayarlarını güncelle */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '') ?? null;
    const user = token ? await verifyToken(token) : null;
    if (user?.role !== 'super_admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const supabase = getServerSupabase();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.apiBaseUrl === 'string') updates.api_base_url = body.apiBaseUrl.trim();
    if (typeof body.downloadUrl === 'string') updates.download_url = body.downloadUrl.trim();
    if (typeof body.watchdogIntervalMinutes === 'number') updates.watchdog_interval_minutes = body.watchdogIntervalMinutes;
    const { data: existing } = await supabase.from('tv_app_settings').select('id').limit(1).maybeSingle();
    if (existing) {
      await supabase.from('tv_app_settings').update(updates).eq('id', (existing as { id: string }).id);
    } else {
      await supabase.from('tv_app_settings').insert({
        api_base_url: updates.api_base_url ?? '',
        download_url: updates.download_url ?? defaultConfig.downloadUrl,
        watchdog_interval_minutes: updates.watchdog_interval_minutes ?? 5,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
