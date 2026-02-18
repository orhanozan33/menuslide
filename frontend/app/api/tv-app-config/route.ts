import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const defaultConfig = {
  apiBaseUrl: (process.env.NEXT_PUBLIC_APP_URL || 'https://menuslide.com').trim(),
  // Yalnızca Vercel (API) + Supabase (DB + Storage). downloadUrl Supabase Storage veya /downloads/... olabilir.
  downloadUrl: '/downloads/Menuslide.apk',
  watchdogIntervalMinutes: 5,
  minVersionCode: null as number | null,
  latestVersionCode: null as number | null,
  latestVersionName: null as string | null,
};

type TvAppRow = {
  api_base_url?: string;
  download_url?: string;
  watchdog_interval_minutes?: number;
  min_version_code?: number | null;
  latest_version_code?: number | null;
  latest_version_name?: string | null;
};

/** Public: TV uygulaması bu endpoint ile API adresini ve uzaktan sürüm bilgisini alır */
export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase
      .from('tv_app_settings')
      .select('api_base_url, download_url, watchdog_interval_minutes, min_version_code, latest_version_code, latest_version_name')
      .limit(1)
      .maybeSingle();
    if (data) {
      const row = data as TvAppRow;
      const apiBaseUrl = (row.api_base_url ?? '').toString().trim() || defaultConfig.apiBaseUrl;
      const downloadUrl = (row.download_url ?? '').toString().trim() || defaultConfig.downloadUrl;
      const toInt = (v: unknown): number | null => {
        if (v == null) return null;
        if (typeof v === 'number' && Number.isInteger(v)) return v;
        const n = Number.parseInt(String(v), 10);
        return Number.isInteger(n) ? n : null;
      };
      const minVersionCode = toInt(row.min_version_code) ?? defaultConfig.minVersionCode;
      const latestVersionCode = toInt(row.latest_version_code) ?? defaultConfig.latestVersionCode;
      return NextResponse.json({
        apiBaseUrl,
        downloadUrl,
        watchdogIntervalMinutes: Number(row.watchdog_interval_minutes) || 5,
        minVersionCode,
        latestVersionCode,
        latestVersionName: row.latest_version_name ?? defaultConfig.latestVersionName,
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
    const user = await verifyToken(authHeader ?? null);
    if (user?.role !== 'super_admin' && user?.role !== 'admin') {
      return NextResponse.json({ message: 'Sadece admin veya süper admin düzenleyebilir.' }, { status: 403 });
    }
    const body = await request.json();
    const supabase = getServerSupabase();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.apiBaseUrl === 'string') updates.api_base_url = body.apiBaseUrl.trim();
    if (typeof body.downloadUrl === 'string') updates.download_url = body.downloadUrl.trim();
    if (typeof body.watchdogIntervalMinutes === 'number') updates.watchdog_interval_minutes = body.watchdogIntervalMinutes;
    if (typeof body.minVersionCode === 'number') updates.min_version_code = body.minVersionCode;
    if (body.minVersionCode === null || body.minVersionCode === '') updates.min_version_code = null;
    if (typeof body.latestVersionCode === 'number') updates.latest_version_code = body.latestVersionCode;
    if (body.latestVersionCode === null || body.latestVersionCode === '') updates.latest_version_code = null;
    if (typeof body.latestVersionName === 'string') updates.latest_version_name = body.latestVersionName.trim() || null;
    if (body.latestVersionName === null || body.latestVersionName === '') updates.latest_version_name = null;
    const { data: existing } = await supabase.from('tv_app_settings').select('id').limit(1).maybeSingle();
    const insertRow = {
      id: '00000000-0000-0000-0000-000000000001',
      api_base_url: (updates.api_base_url as string) ?? defaultConfig.apiBaseUrl,
      download_url: (updates.download_url as string) ?? defaultConfig.downloadUrl,
      watchdog_interval_minutes: updates.watchdog_interval_minutes ?? 5,
      min_version_code: updates.min_version_code ?? null,
      latest_version_code: updates.latest_version_code ?? null,
      latest_version_name: updates.latest_version_name ?? null,
    };
    if (existing) {
      const { error } = await supabase.from('tv_app_settings').update(updates).eq('id', (existing as { id: string }).id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('tv_app_settings').insert(insertRow);
      if (error) throw new Error(error.message);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
