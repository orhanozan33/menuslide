#!/bin/bash
# Roku channel için placeholder görseller oluşturur (ImageMagick gerekir)
# brew install imagemagick

set -e
cd "$(dirname "$0")/.."
IMG_DIR="$(pwd)/images"

mkdir -p "$IMG_DIR"

# icon-focus: 290x218
convert -size 290x218 xc:'#4F46E5' -gravity center -pointsize 48 -fill white -annotate 0 'MenuSlide' "$IMG_DIR/icon-focus.png" 2>/dev/null || echo "ImageMagick yok, icon-focus.png manuel ekleyin (290x218)"

# icon-side: 214x144
convert -size 214x144 xc:'#4338CA' -gravity center -pointsize 36 -fill white -annotate 0 'MS' "$IMG_DIR/icon-side.png" 2>/dev/null || echo "ImageMagick yok, icon-side.png manuel ekleyin (214x144)"

# splash: 1920x1080
convert -size 1920x1080 xc:'#1E1B4B' -gravity center -pointsize 72 -fill white -annotate 0 'MenuSlide' "$IMG_DIR/splash.png" 2>/dev/null || echo "ImageMagick yok, splash.png manuel ekleyin (1920x1080)"

echo "Placeholder görseller oluşturuldu: $IMG_DIR"
