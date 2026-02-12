import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AppInfoParser = require('app-info-parser');

export const dynamic = 'force-dynamic';

/** Super admin: APK dosyasından versionCode ve versionName okur (uzaktan sürüm alanlarını otomatik doldurmak için). */
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

    const formData = await request.formData();
    const file = formData.get('apk') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ message: 'APK dosyası gönderin.' }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const tmpPath = path.join(os.tmpdir(), `apk-${Date.now()}-${Math.random().toString(36).slice(2)}.apk`);
    await writeFile(tmpPath, bytes);

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
      return NextResponse.json({
        versionCode: Number.isInteger(versionCode) ? versionCode : undefined,
        versionName: versionName || undefined,
      });
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  } catch (e) {
    console.error('[parse-apk]', e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'APK okunamadı.' },
      { status: 500 }
    );
  }
}
