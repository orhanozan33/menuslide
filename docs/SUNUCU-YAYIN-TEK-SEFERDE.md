# Sunucuda yayını tek seferde açma

Roku’da `http://68.183.205.207/stream/menuslide-tv10/playlist.m3u8` oynasın diye sunucuda yapılacaklar.

## 1. Sunucuya bağlan

```bash
ssh root@68.183.205.207
```

## 2. Nginx stream’i kontrol et

```bash
grep -A5 "location /stream" /etc/nginx/sites-enabled/* 2>/dev/null || grep -A5 "location /stream" /etc/nginx/nginx.conf
```

Çıktıda `alias /var/www/menuslide/stream/` olmalı. Yoksa:

```bash
# Örnek config: /etc/nginx/sites-available/stream veya default içinde
# location /stream/ { alias /var/www/menuslide/stream/; add_header Access-Control-Allow-Origin *; }
sudo nginx -t && sudo systemctl reload nginx
```

## 3. Input video yoksa oluştur

```bash
ffmpeg -y -f lavfi -i "color=c=blue:s=1280x720:d=30" -f lavfi -i anullsrc=r=44100:cl=stereo -c:v libx264 -c:a aac -shortest /var/www/menuslide/app/input.mp4
```

## 4. Loop script’i güncelle (varsayılan base URL ile)

Projeden sunucuya script’i at (Mac’te):

```bash
scp scripts/scripts/legacy/stream-loop-hls.sh root@68.183.205.207:/var/www/menuslide/app/
```

Sunucuda çalıştırılabilir yap:

```bash
chmod +x /var/www/menuslide/app/scripts/legacy/stream-loop-hls.sh
```

## 5. Yayını başlat

Sunucuda (önce varsa eski FFmpeg’i durdur: Ctrl+C veya `pkill -f stream-loop-hls`):

```bash
cd /var/www/menuslide/app
INPUT=/var/www/menuslide/app/input.mp4 SLUG=menuslide-tv10 ./scripts/legacy/stream-loop-hls.sh
```

`STREAM_BASE_URL` vermesen de script artık varsayılan olarak `http://68.183.205.207/stream` kullanır; segment URL’leri tam olur, Roku oynatır.

Arka planda çalışsın istersen:

```bash
nohup env INPUT=/var/www/menuslide/app/input.mp4 SLUG=menuslide-tv10 /var/www/menuslide/app/scripts/legacy/stream-loop-hls.sh >> /var/www/menuslide/app/stream.log 2>&1 &
```

## 6. Kontrol

```bash
curl -sI "http://68.183.205.207/stream/menuslide-tv10/playlist.m3u8"
curl -s "http://68.183.205.207/stream/menuslide-tv10/playlist.m3u8" | head -20
```

Playlist’te segment satırları `http://68.183.205.207/stream/menuslide-tv10/segmentXXX.ts` şeklinde tam URL olmalı.

Roku’da bu adresi kullan: `http://68.183.205.207/stream/menuslide-tv10/playlist.m3u8`
