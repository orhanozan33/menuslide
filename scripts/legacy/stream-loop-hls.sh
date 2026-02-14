#!/bin/bash
# Döngüsel (loop) HLS yayini - input.mp4 surekli tekrarlanir, Roku icin segment URL'leri tam.
# Kullanim: STREAM_BASE_URL="http://68.183.205.207/stream" SLUG=menuslide-tv10 INPUT=/path/to/input.mp4 ./stream-loop-hls.sh
# Durdurmak: Ctrl+C

set -e
OUTPUT_DIR="${STREAM_OUTPUT_DIR:-/var/www/menuslide/stream}"
SLUG="${SLUG:-menuslide-tv10}"
INPUT="${INPUT:-input.mp4}"
# Roku icin mutlaka tam segment URL; yoksa varsayilan kullan
BASE_URL="${STREAM_BASE_URL:-http://68.183.205.207/stream}"

DIR="$OUTPUT_DIR/$SLUG"
mkdir -p "$DIR"

if [[ ! -f "$INPUT" ]]; then
  echo "Hata: Input dosyasi yok: $INPUT"
  echo "Ornek: INPUT=/var/www/menuslide/app/input.mp4 SLUG=menuslide-tv10 $0"
  exit 1
fi

SEGMENT_PATTERN="$DIR/segment%03d.ts"
PLAYLIST="$DIR/playlist.m3u8"

FFMPEG_OPTS=(
  -re
  -stream_loop -1
  -i "$INPUT"
  -vf "scale=1280:720,fps=30,format=yuv420p"
  -c:v libx264
  -profile:v main
  -level 4.0
  -pix_fmt yuv420p
  -preset veryfast
  -g 60
  -keyint_min 60
  -sc_threshold 0
  -c:a aac
  -b:a 128k
  -ar 44100
  -f hls
  -hls_time 6
  -hls_list_size 5
  -hls_flags delete_segments+append_list
  -hls_segment_filename "$SEGMENT_PATTERN"
)

if [[ -n "$BASE_URL" ]]; then
  BASE_URL="${BASE_URL%/}/$SLUG/"
  FFMPEG_OPTS+=( -hls_base_url "$BASE_URL" )
  echo "Roku base URL: $BASE_URL"
fi

FFMPEG_OPTS+=( "$PLAYLIST" )

echo "Baslatiliyor: $DIR (Ctrl+C ile durdur)"
exec ffmpeg -y "${FFMPEG_OPTS[@]}"
