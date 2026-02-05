import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = 'public/uploads';
function safeName(original: string): string {
  const ext = path.extname(original) || '';
  const base = path.basename(original, ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80) || 'file';
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    if (!files?.length) {
      return NextResponse.json({ data: [], assets: [] });
    }

    const root = process.cwd();
    const dir = path.join(root, UPLOAD_DIR);
    await mkdir(dir, { recursive: true });

    const assets: { src: string }[] = [];

    for (const file of files) {
      if (!file?.size || !file?.name) continue;
      const type = (file.type || '').toLowerCase();
      if (!type.startsWith('image/')) continue;
      const filename = safeName(file.name);
      const filepath = path.join(dir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);
      assets.push({ src: `/uploads/${filename}` });
    }

    // GrapesJS assetManager expects { data: [...] }; we also keep assets for other clients
    return NextResponse.json({ data: assets, assets });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Yükleme başarısız', data: [], assets: [] }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json({ ok: true });
}
