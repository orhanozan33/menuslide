#!/usr/bin/env python3
"""MenuSlide giriş ekranı (splash) oluşturur - 1920x1080"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1920, 1080
BG = "#1a1a2e"      # Koyu lacivert
ACCENT = "#4F46E5"  # Indigo
WHITE = "#ffffff"
GRAY = "#94a3b8"

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# Logo alanı - ortada dikdörtgen
logo_w, logo_h = 420, 180
logo_x = (W - logo_w) // 2
logo_y = (H - logo_h) // 2 - 80
draw.rounded_rectangle(
    [logo_x, logo_y, logo_x + logo_w, logo_y + logo_h],
    radius=12,
    outline=ACCENT,
    width=2,
)

# MenuSlide metni (büyük font)
try:
    font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 56)
    font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
except Exception:
    font_title = ImageFont.load_default()
    font_sub = font_title

title = "MenuSlide"
bbox = draw.textbbox((0, 0), title, font=font_title)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
draw.text(((W - tw) // 2, logo_y + (logo_h - th) // 2 - 10), title, fill=WHITE, font=font_title)

sub = "Digital Signage"
bbox = draw.textbbox((0, 0), sub, font=font_sub)
sw, sh = bbox[2] - bbox[0], bbox[3] - bbox[1]
draw.text(((W - sw) // 2, logo_y + logo_h - sh - 20), sub, fill=GRAY, font=font_sub)

# Alt kısım: OK tusuna basin
inst = "Press OK"
bbox = draw.textbbox((0, 0), inst, font=font_sub)
iw, ih = bbox[2] - bbox[0], bbox[3] - bbox[1]
draw.text(((W - iw) // 2, H - 120), inst, fill=GRAY, font=font_sub)

out = os.path.join(os.path.dirname(__file__), "..", "images", "splash.png")
img.save(out, "PNG")
print(f"Olusturuldu: {out}")
