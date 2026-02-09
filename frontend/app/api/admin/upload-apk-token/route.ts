import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const BUCKET = 'menuslide';
const APK_PATH = 'downloads/Menuslide.apk';

/** Super admin: Supabase Storage için imzalı yükleme token'ı alır. İstemci bu token ile doğrudan Supabase'e yükler (dosya sunucudan geçmez). */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await verifyToken(authHeader ?? null);
    if (user?.role !== 'super_admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(APK_PATH, { upsert: true });

    if (error) {
      console.error('[upload-apk-token]', error);
      return NextResponse.json(
        { message: error.message || 'Token alınamadı. Supabase Storage bucket "' + BUCKET + '" mevcut mu?' },
        { status: 500 }
      );
    }

    return NextResponse.json({ path: data.path, token: data.token });
  } catch (e) {
    console.error('[upload-apk-token]', e);
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Token hatası' }, { status: 500 });
  }
}
