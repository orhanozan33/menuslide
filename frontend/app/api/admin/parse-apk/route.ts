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
      const result = await parser.parse();
      const versionCode = result?.versionCode != null ? Number(result.versionCode) : undefined;
      const versionName = result?.versionName != null ? String(result.versionName) : undefined;
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
