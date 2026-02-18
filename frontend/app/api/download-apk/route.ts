import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_DOWNLOAD_URL = '/downloads/Menuslide.apk';

/** İndirme linkini her zaman "attachment" ile sunar (tarayıcı açmak yerine indirir). */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase
      .from('tv_app_settings')
      .select('download_url')
      .limit(1)
      .maybeSingle();
    const downloadUrl = ((data as { download_url?: string } | null)?.download_url ?? '')
      .toString()
      .trim() || DEFAULT_DOWNLOAD_URL;

    if (downloadUrl.startsWith('/')) {
      const origin = request.nextUrl.origin;
      return NextResponse.redirect(origin + downloadUrl, 302);
    }

    if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid download URL' }, { status: 400 });
    }

    const res = await fetch(downloadUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'APK could not be fetched' },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const blob = await res.blob();
    const headers = new Headers();
    headers.set(
      'Content-Disposition',
      'attachment; filename="Menuslide.apk"'
    );
    headers.set('Content-Type', 'application/vnd.android.package-archive');
    headers.set('Cache-Control', 'no-store');

    return new NextResponse(blob, { status: 200, headers });
  } catch (e) {
    console.error('[download-apk]', e);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}
