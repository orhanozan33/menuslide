import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export interface MenuItem {
  name: string;
  price: string;
  description?: string;
}

/** OCR metnini satırlara böl, fiyat regex ile name/price ayır, menü satırlarına çevir */
function ocrTextToItems(rawText: string): MenuItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (lines.length === 0) return [];

  const priceRegex = /([₺$€]?\s*\d+[.,]?\d*)\s*$/;
  const items: MenuItem[] = [];
  let pendingName = '';

  for (const line of lines) {
    const priceMatch = line.match(priceRegex);
    if (priceMatch) {
      const price = priceMatch[1].trim();
      const namePart = line.slice(0, priceMatch.index).trim();
      const name = namePart || pendingName || 'Ürün';
      items.push({ name, price, description: undefined });
      pendingName = '';
    } else {
      if (pendingName) {
        items.push({ name: pendingName, price: '-', description: undefined });
      }
      pendingName = line;
    }
  }
  if (pendingName) {
    items.push({ name: pendingName, price: '-', description: undefined });
  }

  return items.length > 0 ? items : lines.map((name) => ({ name, price: '-', description: undefined }));
}

export async function POST(request: NextRequest) {
  try {
    let buffer: Buffer;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('image') as File | null;
      if (!file || !file.size) {
        return NextResponse.json({ error: 'Resim dosyası gönderin (image).', items: [] }, { status: 400 });
      }
      const arr = await file.arrayBuffer();
      buffer = Buffer.from(arr);
    } else {
      const body = await request.json().catch(() => ({}));
      const base64 = body.imageBase64 || body.image;
      if (!base64 || typeof base64 !== 'string') {
        return NextResponse.json({ error: 'imageBase64 veya multipart image gerekli.', items: [] }, { status: 400 });
      }
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    }

    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, { logger: () => {} });
    try {
      const { data } = await worker.recognize(buffer);
      const text = (data?.text || '').trim();
      await worker.terminate();

      const items = ocrTextToItems(text);
      return NextResponse.json({ items, rawText: text || undefined });
    } catch (ocrErr) {
      try {
        await worker.terminate();
      } catch {
        /* ignore */
      }
      throw ocrErr;
    }
  } catch (err) {
    console.error('[ai/analyze-image] Error:', err);
    return NextResponse.json(
      { error: 'Resim analiz edilemedi.', items: [] },
      { status: 500 }
    );
  }
}
