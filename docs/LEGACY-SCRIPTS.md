# Legacy Scripts (Eski Video Akışı)

**Güncel sistem:** JSON slides + DigitalOcean Spaces (CDN). Roku layout API'den slide görselleri alır; video stream yok.

Bu dokümanda `scripts/legacy/` altındaki kullanılmayan scriptler listelenir. Video akışına (loop.mp4, HLS) geçmek isterseniz referans için saklanmıştır.

---

## scripts/legacy/ İçeriği

| Script | Eski kullanım | Not |
|--------|---------------|-----|
| vps-video-worker.js | Display sayfasını Puppeteer ile kaydedip loop.mp4 + HLS üretir | VPS cron ile her 5 dk |
| stream-mp4-once.sh | Manuel loop.mp4 oluşturma | VPS'te tek seferlik |
| stream-vod-once.sh | HLS VOD playlist üretir | FFmpeg ile |
| stream-loop-hls.sh | Sürekli HLS döngüsü (live) | FFmpeg stream_loop |
| fix-playlist-absolute-urls.js | HLS playlist segment URL'lerini mutlak yapar | Roku uyumluluğu |
| vps-screenshot-worker.js | Ekran başına tek JPG: `{slug}.jpg` | Eski CDN yapısı |

---

## Güncel Slide Akışı

1. Admin panelden template seçip **Yayınla**
2. `generate-slides` tetiklenir (Puppeteer veya ScreenshotOne)
3. Her template için display sayfası screenshot alınır
4. Spaces'e `slides/{screenId}/{templateId}.jpg` yüklenir
5. Roku layout API bu URL'leri döner; cihaz görselleri gösterir

Script: `frontend/scripts/export-slides-to-spaces.js` (manuel export için).

---

## Eski Video Akışını Kullanmak

Video akışına (stream_url, loop.mp4) geri dönmek isterseniz:

- `scripts/legacy/vps-video-worker.js` VPS'e kopyalanıp cron ile çalıştırılabilir
- Admin'de `stream_url` = `http://IP/stream/{slug}/loop.mp4` ayarlanır
- Roku/Android layout type "video" ile videoUrl alır (şu an layout sadece slides döner; video desteği device API'de kaldırılmış olabilir)

**Not:** Device API şu an yalnızca `slides[]` döner; videoUrl dönmüyor.
