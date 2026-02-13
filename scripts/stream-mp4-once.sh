#!/bin/bash
# Roku icin tek MP4 dosyasi uretir (HLS -5 hatasi varsa bunu kullan).
# Kullanim: INPUT=/path/to/input.mp4 SLUG=menuslide-tv10 ./stream-mp4-once.sh
# Admin'de stream_url = http://68.183.205.207/stream/menuslide-tv10/loop.mp4 yap.

set -e
OUTPUT_DIR="${STREAM_OUTPUT_DIR:-/var/www/menuslide/stream}"
SLUG="${SLUG:-menuslide-tv10}"
INPUT="${INPUT:-input.mp4}"

DIR="$OUTPUT_DIR/$SLUG"
mkdir -p "$DIR"
OUT="$DIR/loop.mp4"

if [[ ! -f "$INPUT" ]]; then
  echo "Hata: Input yok: $INPUT"
  exit 1
fi

# Roku uyumlu: Baseline, yuv420p, AAC
ffmpeg -y -i "$INPUT" \
  -vf "scale=1280:720,fps=30,format=yuv420p" \
  -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p \
  -preset veryfast -g 60 \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  "$OUT"

echo "MP4 hazir: $OUT"
echo "Roku stream_url (Admin'de ayarla): http://68.183.205.207/stream/menuslide-tv10/loop.mp4"
