# Legacy Scripts (Eski Video/HLS Akışı)

**Güncel sistem JSON slides + CDN (DigitalOcean Spaces) kullanıyor.** Bu klasördeki scriptler eski video akışı (loop.mp4, HLS) için kullanılıyordu.

| Script | Açıklama |
|--------|----------|
| vps-video-worker.js | Display sayfasını Puppeteer ile kaydedip loop.mp4 + HLS üretir |
| stream-mp4-once.sh | Manuel loop.mp4 oluşturma |
| stream-vod-once.sh | HLS VOD playlist üretir |
| stream-loop-hls.sh | Sürekli HLS döngüsü (live) |
| fix-playlist-absolute-urls.js | HLS playlist URL'lerini mutlak yapar |
| vps-screenshot-worker.js | Ekran slug'ı başına tek JPG (eski CDN yapısı: {slug}.jpg) |

**Güncel slide üretimi:** Admin Yayınla → generate-slides (Puppeteer/ScreenshotOne) → Spaces'e `slides/{screenId}/{templateId}.jpg` yüklenir.

Detay: `docs/LEGACY-SCRIPTS.md`
