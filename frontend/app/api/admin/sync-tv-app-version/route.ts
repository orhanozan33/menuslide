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
      .select('id, api_base_url, download_url')
      .limit(1)
      .maybeSingle();
    if (!row) {
      return NextResponse.json({ message: 'TV uygulaması ayarı bulunamadı.' }, { status: 404 });
    }

    const r = row as { download_url?: string; api_base_url?: string };
    let downloadUrl = (r.download_url ?? '').trim();
    if (!downloadUrl) {
      return NextResponse.json({ message: 'İndirme linki boş.' }, { status: 400 });
    }
    if (!downloadUrl.startsWith('http')) {
      const base = (r.api_base_url ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://menuslide.com').trim().replace(/\/$/, '');
      downloadUrl = downloadUrl.startsWith('/') ? `${base}${downloadUrl}` : `${base}/${downloadUrl}`;
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
      const result = (await parser.parse()) as Record<string, unknown> | null;
      const extractVersion = (obj: unknown, code: boolean): unknown => {
        const search = (r: Record<string, unknown>): unknown => {
          const keys = Object.keys(r || {});
          const list = code
            ? ['versionCode', 'version_code', 'android:versionCode', 'versionCodeMajor']
            : ['versionName', 'version_name', 'android:versionName'];
          for (const k of list) {
            if (r[k] != null) return r[k];
          }
          const re = code ? /version[_-]?code/i : /version[_-]?name/i;
          const found = keys.find((key) => re.test(key));
          return found != null ? r[found] : undefined;
        };
        let v = search((obj as Record<string, unknown>) || {});
        if (v != null) return v;
        const r = obj as Record<string, unknown>;
        for (const key of Object.keys(r || {})) {
          const child = r[key];
          if (child && typeof child === 'object' && !Array.isArray(child)) {
            v = search(child as Record<string, unknown>);
            if (v != null) return v;
          }
        }
        return undefined;
      };
      const rawVersionCode = extractVersion(result, true);
      const rawVersionName = extractVersion(result, false);
      const versionCode = rawVersionCode != null ? Number(rawVersionCode) : undefined;
      const versionName = rawVersionName != null ? String(rawVersionName) : undefined;
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
