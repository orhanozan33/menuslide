#!/bin/bash
# Tek seferlik HLS VOD uretir - silinen segment yok, Roku sorunsuz oynatir.
# Kullanim: INPUT=/path/to/input.mp4 SLUG=menuslide-tv10 ./stream-vod-once.sh
# Istedigin zaman tekrar calistir (icerik guncellenir).

set -e
OUTPUT_DIR="${STREAM_OUTPUT_DIR:-/var/www/menuslide/stream}"
SLUG="${SLUG:-menuslide-tv10}"
INPUT="${INPUT:-input.mp4}"
BASE_URL="${STREAM_BASE_URL:-http://68.183.205.207/stream}"

DIR="$OUTPUT_DIR/$SLUG"
mkdir -p "$DIR"

if [[ ! -f "$INPUT" ]]; then
  echo "Hata: Input yok: $INPUT"
  exit 1
fi

BASE_URL="${BASE_URL%/}/$SLUG/"
PLAYLIST="$DIR/playlist.m3u8"

# Roku "no playable tracks" icin: Baseline + level 3.0 (en genis uyumluluk)
ffmpeg -y -i "$INPUT" \
  -vf "scale=1280:720,fps=30,format=yuv420p" \
  -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p \
  -preset veryfast -g 60 -keyint_min 60 -sc_threshold 0 \
  -c:a aac -b:a 128k -ar 44100 \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename "$DIR/segment%03d.ts" \
  -hls_base_url "$BASE_URL" \
  "$PLAYLIST"

echo "VOD hazir: $PLAYLIST"
echo "Roku URL: ${BASE_URL}playlist.m3u8"
