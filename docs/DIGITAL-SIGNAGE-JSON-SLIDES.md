# Roku Digital Signage — JSON Slides (No Video)

Bu mimaride **sunucu video üretmez**, **HLS/FFmpeg/stream yok**. Backend sadece JSON layout döner; Roku slide’ları SceneGraph ile kendi çizer.

## Backend

- **GET /api/device/layout?deviceToken=xxx**  
  Yanıt:
  ```json
  {
    "deviceToken": "...",
    "layout": {
      "version": "2026-02-13T...",
      "backgroundColor": "#000000",
      "slides": [
        { "type": "image", "url": "https://cdn.domain.com/slides/{screenId}/{templateId}.jpg", "duration": 10 },
        { "type": "text", "title": "Campaign", "description": "Discount 20%", "duration": 8 }
      ]
    },
    "layoutVersion": "2026-02-13T...",
    "refreshIntervalSeconds": 300
  }
  ```

- Görseller **sadece statik URL** (CDN / object storage). Sunucuda encode/segment yok.
- Slide listesi `screen_template_rotations` tablosundan üretilir.
- Görsel URL’leri için ortam değişkeni: **NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL** veya **NEXT_PUBLIC_CDN_BASE_URL**  
  Örnek: `https://cdn.example.com` → slide URL: `https://cdn.example.com/slides/{screenId}/{templateId}.jpg`
- Bu URL’lerin CDN’e (veya object storage’a) nasıl yükleneceği ayrı bir süreçtir (örn. tek seferlik screenshot job; backend sadece JSON döner).

## Roku

- Layout’u başlangıçta ve her **refreshIntervalSeconds** saniyede bir çeker.
- **layoutVersion** değişirse layout yeniden yüklenir ve slide listesi güncellenir; değişmemişse sadece cache güncellenir, slide index sıfırlanmaz.
- Her slide:
  - **type: "image"** → Tam ekran `Poster`, `url` ile.
  - **type: "text"** → `Label`(lar) ile `title` ve `description`.
- **Timer** node ile `slide.duration` saniye gösterim.
- Bir sonraki slide görsel ise **nextSlidePoster** ile önceden yüklenir (preload).
- Video node yok; HLS/MP4 oynatılmaz. 24/7 çalışmaya uygun, süre limiti yok.

## Geçiş efektleri

- Şu an slide değişimi anında (transition yok).
- İstenirse **Animation** node ile 300 ms opacity (fade in/out) eklenebilir.

## Altyapı

- Sunucu: Sadece JSON API + statik dosya sunumu (veya CDN). Encode/FFmpeg/HLS worker’ları bu modda kullanılmaz.
- Roku: Sadece JSON + görsel URL’leri; SceneGraph (Poster, Label, Timer) ile minimal CPU kullanımı.
