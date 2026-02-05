# Dijital Menü (Katman Tabanlı) Sistemi

## Amaç

Admin panelinde **tek bir "Menü Sayfası"** ile TV’de gösterilecek dijital restoran menüsü, **katman tabanlı (layer-based)** bir canvas üzerinde düzenlenir. Menü görseli düz resim değil; arka plan + metin/görsel katmanları olan editlenebilir bir tasarımdır.

## Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin Panel (React + Konva.js)                                 │
│  /menu-page                                                     │
│  - Template seçimi (arka plan + boyut)                          │
│  - Katman listesi: text | image | shape                          │
│  - Her katman: tıklanabilir, taşınabilir, boyutlandırılabilir,  │
│    silinebilir, inline edit (metin: içerik, font, renk)         │
│  - Kaydet → Backend PATCH layers                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (NestJS)                                                │
│  - GET  /digital-menu/templates, /pages, /layers (auth)         │
│  - POST/PATCH/DELETE templates, pages, layers (auth)             │
│  - GET  /public/digital-menu (no auth) → TV viewer               │
│  - POST /digital-menu/bootstrap → varsayılan template + page     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                      │
│  - menu_page_templates (background_image_url, width, height)    │
│  - menu_pages (template_id, is_active → tek aktif sayfa)        │
│  - menu_page_layers (type, x, y, width, height, style, content) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TV / Viewer (React + Konva.js, read-only)                      │
│  /display/digital-menu                                          │
│  - GET /public/digital-menu → JSON                               │
│  - JSON → Canvas render (background + layers)                    │
│  - Fullscreen, responsive (scale to fit)                         │
│  - Periyodik yenileme (JSON değişince otomatik güncellenir)      │
└─────────────────────────────────────────────────────────────────┘
```

## Veritabanı Şeması

- **menu_page_templates**: `id`, `name`, `background_image_url`, `width`, `height`
- **menu_pages**: `id`, `template_id`, `name`, `is_active` (sadece bir satır `is_active = true`)
- **menu_page_layers**: `id`, `menu_page_id`, `layer_type` (text | image | shape), `x`, `y`, `width`, `height`, `rotation`, `display_order`, `content_text`, `font_size`, `font_family`, `font_style`, `color`, `align`, `image_url`, `style_json`

Yazılar DB’de **text** olarak saklanır (resim içine gömülmez). Görseller için `image_url` ve konum/boyut saklanır.

## Örnek Template JSON (TV’ye dönen format)

```json
{
  "id": "page-uuid",
  "name": "Dijital Menü",
  "templateId": "template-uuid",
  "backgroundImage": "https://...",
  "width": 1920,
  "height": 1080,
  "layers": [
    {
      "id": "layer-1",
      "type": "text",
      "x": 100,
      "y": 80,
      "width": 400,
      "height": 60,
      "rotation": 0,
      "contentText": "Restoran Menüsü",
      "fontSize": 48,
      "fontFamily": "Arial",
      "color": "#1a1a1a",
      "align": "left"
    },
    {
      "id": "layer-2",
      "type": "image",
      "x": 200,
      "y": 300,
      "width": 200,
      "height": 200,
      "imageUrl": "https://..."
    }
  ]
}
```

## Kurulum Adımları

### 1. Veritabanı migration

```bash
cd /Users/admin/Desktop/Tvproje
psql -U postgres -d your_database_name -f database/migration-digital-menu-layers.sql
```

(Veya mevcut migration script’inize bu dosyayı ekleyin.)

### 2. Backend

Backend zaten `DigitalMenuModule` ile yüklü. Sadece migration’ı çalıştırdıktan sonra backend’i yeniden başlatın:

```bash
cd backend && npm run start:dev
```

### 3. Frontend bağımlılıkları

Konva ve react-konva yüklü olmalı (React 18 uyumlu):

```bash
cd frontend && npm install konva react-konva@18 --legacy-peer-deps
```

### 4. Admin: Menü Sayfası

1. Giriş yapın, sidebar’dan **Menü Sayfası**’na gidin (`/menu-page`).
2. İlk kez ise **Varsayılan menü oluştur** butonuna tıklayın (POST `/digital-menu/bootstrap`).
3. Canvas’ta katmanları sürükleyin, seçin, sağ panelden metin/font/renk veya görsel URL düzenleyin.
4. **+ Yazı ekle** / **Görsel ekle** ile yeni katman ekleyin; listeden seçip **Sil** ile silebilirsiniz.
5. Değişiklikler katman bazında otomatik PATCH ile kaydedilir.

### 5. TV Viewer

- **URL**: `https://your-domain/display/digital-menu`
- Tam ekran, responsive (scale to fit).
- JSON her 5 saniyede bir yeniden çekilir; admin’de yapılan değişiklikler TV’de otomatik güncellenir.

## Dosya Konumları

| Ne | Nerede |
|----|--------|
| Migration | `database/migration-digital-menu-layers.sql` |
| Backend modül | `backend/src/digital-menu/` |
| Public endpoint | `backend/src/public/public.controller.ts` → GET `digital-menu` |
| Tipler / örnek JSON | `frontend/lib/digitalMenuTypes.ts` |
| Admin canvas editör | `frontend/components/digital-menu/MenuCanvasEditor.tsx` |
| Admin sayfa | `frontend/app/(admin)/menu-page/page.tsx` |
| Viewer bileşeni | `frontend/components/digital-menu/MenuViewer.tsx` |
| Viewer sayfa | `frontend/app/(public)/display/digital-menu/page.tsx` |

## Teknoloji Özeti

- **Admin**: React + Konva.js (Stage, Layer, Text, Image, Rect, Transformer).
- **Backend**: Node.js (NestJS), PostgreSQL (raw SQL, Prisma yok).
- **Auth**: Mevcut admin auth (AuthGuard); TV endpoint auth yok.
- **TV**: Sadece viewer; JSON → Canvas render, OCR/AI yok.
