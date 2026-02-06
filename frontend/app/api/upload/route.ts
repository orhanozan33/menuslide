import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

const BUCKET = 'menuslide';

function safeFileName(original: string): string {
  const ext = original.includes('.') ? original.slice(original.lastIndexOf('.')) : '';
  const base = (original.replace(/\.[^.]+$/, '') || 'file')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 80);
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
}

/**
 * POST /api/upload
 * Uploads files to Supabase Storage (bucket: menuslide).
 * Returns public URLs so the app stays fast and works on Vercel (no local disk).
 * Bucket "menuslide" must exist and be public in Supabase Dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const file = formData.get('file') as File | null;
    const list: File[] = [];
    if (files?.length) list.push(...files);
    if (file?.size && file?.name) list.push(file);

    if (!list.length) {
      return NextResponse.json({ data: [], assets: [] });
    }

    const assets: { src: string }[] = [];
    const prefix = `uploads/${new Date().toISOString().slice(0, 10)}`;

    for (const f of list) {
      if (!f?.size || !f?.name) continue;
      const type = (f.type || '').toLowerCase();
      const isImage = type.startsWith('image/');
      const isVideo = type.startsWith('video/');
      if (!isImage && !isVideo) continue;

      const fileName = safeFileName(f.name);
      const path = `${prefix}/${fileName}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, f, {
        contentType: f.type || (isImage ? 'image/jpeg' : 'video/mp4'),
        cacheControl: '31536000',
        upsert: false,
      });

      if (error) {
        console.error('[upload] Supabase storage error:', error);
        continue;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = urlData?.publicUrl ?? '';
      if (publicUrl) assets.push({ src: publicUrl });
    }

    return NextResponse.json({ data: assets, assets });
  } catch (err) {
    console.error('[upload] Error:', err);
    return NextResponse.json(
      { error: 'Yükleme başarısız', data: [], assets: [] },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}
