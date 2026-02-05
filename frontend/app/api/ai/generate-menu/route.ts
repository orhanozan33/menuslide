import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

export interface MenuItem {
  name: string;
  price: string;
  description?: string;
}

/** Ollama yoksa veya hata olursa basit örnek menü döndür */
function getFallbackItems(templateType: string): MenuItem[] {
  const types: Record<string, MenuItem[]> = {
    menu: [
      { name: 'Kahvaltı Tabağı', price: '₺85', description: 'Peynir, zeytin, yumurta, reçel' },
      { name: 'Menemen', price: '₺65', description: 'Biberli yumurta' },
      { name: 'Sade Kahve', price: '₺45', description: 'Filtre kahve' },
      { name: 'Tost', price: '₺55', description: 'Peynirli tost' },
      { name: 'Ayran', price: '₺25', description: 'Ev yapımı ayran' },
    ],
    restaurant: [
      { name: 'Izgara Köfte', price: '₺120', description: 'Yanında pilav ve salata' },
      { name: 'Tavuk Şiş', price: '₺95', description: 'Izgara tavuk, pilav' },
      { name: 'Mercimek Çorba', price: '₺45', description: 'Günün çorbası' },
      { name: 'Baklava', price: '₺75', description: 'Cevizli baklava' },
    ],
    cafe: [
      { name: 'Latte', price: '₺55', description: 'Sütlü espresso' },
      { name: 'Çay', price: '₺25', description: 'Demleme çay' },
      { name: 'Cheesecake', price: '₺65', description: 'Frambuazlı' },
      { name: 'Sandviç', price: '₺70', description: 'Tavuklu sandviç' },
    ],
    campaign: [
      { name: '%20 İndirim', price: '-', description: 'Tüm kahvaltılarda' },
      { name: '2 Al 1 Öde', price: '-', description: 'İçeceklerde' },
      { name: 'Öğle Menüsü', price: '₺99', description: 'Çorba + ana yemek + içecek' },
    ],
  };
  const key = (templateType || 'menu').toLowerCase().replace(/[^a-z]/g, '');
  return types[key] || types.menu;
}

/** Ollama yanıtından JSON array çıkarmaya çalış */
function parseItemsFromResponse(response: string): MenuItem[] | null {
  try {
    const trimmed = response.trim();
    const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const arr = Array.isArray(parsed) ? parsed : parsed.items || parsed.menu || [];
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((item: any) => ({
          name: String(item.name ?? item.title ?? item.ürün ?? '').trim() || 'Ürün',
          price: String(item.price ?? item.fiyat ?? '').trim() || '-',
          description: item.description ? String(item.description).trim() : undefined,
        }));
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const templateType = (body.templateType ?? body.template_type ?? 'menu') as string;
    const businessType = (body.businessType ?? body.business_type ?? '') as string;
    const language = (body.language ?? 'tr') as string;

    const systemPrompt = `Sen bir menü içerik asistanısın. İstediğim türe göre sadece JSON döndür. Yanıtında sadece tek bir JSON array kullan, başka metin yazma. Her eleman: { "name": "ürün adı", "price": "fiyat (örn ₺50)", "description": "kısa açıklama" }. 5-8 ürün üret. Fiyatları Türk Lirası (₺) ile yaz.`;
    const userPrompt = `Şablon türü: ${templateType}. ${businessType ? `İşletme türü: ${businessType}.` : ''} Dil: ${language}. Bu türe uygun menü/ürün listesi JSON array olarak (sadece array, başka metin yok):`;

    let items: MenuItem[] | null = null;

    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: false,
          system: systemPrompt,
          prompt: userPrompt,
          format: 'json',
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.response || '';
        items = parseItemsFromResponse(text);
      }
    } catch (err) {
      console.warn('[ai/generate-menu] Ollama error:', err);
    }

    if (!items || items.length === 0) {
      items = getFallbackItems(templateType);
    }

    return NextResponse.json({ items });
  } catch (err) {
    console.error('[ai/generate-menu] Error:', err);
    return NextResponse.json(
      { items: getFallbackItems('menu'), error: 'AI yanıtı alınamadı.' },
      { status: 200 }
    );
  }
}
