import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyToken } from '@/lib/auth-server';
import { getServerSupabase } from '@/lib/supabase-server';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AppInfoParser = require('app-info-parser');

export const dynamic = 'force-dynamic';

/** Super admin: Depodaki APK'nın URL'inden sürüm bilgisini okuyup tv_app_settings'e yazar (elle yükleme sonrası). */
export async function POST() {
  try {
    const authHeader = (await headers()).get('authorization');
    const user = await verifyToken(authHeader ?? null);
    if (!user) {
      return NextResponse.json({ message: 'Oturum gerekli.' }, { status: 401 });
    }
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return NextResponse.json({ message: 'Sadece admin veya süper admin.' }, { status: 403 });
    }

    const supabase = getServerSupabase();
    const { data: row } = await supabase
      .from('tv_app_settings')
      .select('id, download_url')
      .limit(1)
      .maybeSingle();
    if (!row) {
      return NextResponse.json({ message: 'TV uygulaması ayarı bulunamadı.' }, { status: 404 });
    }

    const downloadUrl = (row as { download_url?: string }).download_url;
    if (!downloadUrl || !downloadUrl.startsWith('http')) {
      return NextResponse.json({ message: 'İndirme linki geçerli bir URL değil.' }, { status: 400 });
    }

    const res = await fetch(downloadUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ message: `APK indirilemedi: ${res.status}` }, { status: 400 });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const tmpPath = path.join(os.tmpdir(), `apk-sync-${Date.now()}-${Math.random().toString(36).slice(2)}.apk`);
    await writeFile(tmpPath, buf);

    try {
      const parser = new AppInfoParser(tmpPath);
      const result = await parser.parse();
      const versionCode = result?.versionCode != null ? Number(result.versionCode) : undefined;
      const versionName = result?.versionName != null ? String(result.versionName) : undefined;
      if (versionCode == null || !Number.isInteger(versionCode)) {
        return NextResponse.json({ message: 'APK içinden sürüm kodu okunamadı.' }, { status: 400 });
      }

      await supabase
        .from('tv_app_settings')
        .update({
          min_version_code: versionCode,
          latest_version_code: versionCode,
          latest_version_name: versionName?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (row as { id: string }).id);

      return NextResponse.json({
        ok: true,
        versionCode,
        versionName: versionName || null,
      });
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  } catch (e) {
    console.error('[sync-tv-app-version]', e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Sürüm okunamadı.' },
      { status: 500 }
    );
  }
}
