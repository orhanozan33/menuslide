#!/usr/bin/env python3
"""Resize logo asset to Roku icon/splash sizes. Run from roku-tv/scripts/."""
import os
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(SCRIPT_DIR, "..", "images")
# Asset path (Cursor workspace assets)
ASSET = "/Users/admin/.cursor/projects/Users-admin-Desktop-Tvproje/assets/menuslide-b5f060fb-8442-4caa-9740-cf3c3f81adc6.png"

SIZES = [
    ("logo-menuslide-canada.png", None),   # keep original size, just copy
    ("icon-focus.png", (290, 218)),
    ("icon-focus-fhd.png", (540, 405)),
    ("icon-side.png", (214, 144)),
    ("splash.png", (1920, 1080)),
]

def main():
    if not os.path.isfile(ASSET):
        print("Asset not found:", ASSET)
        return 1
    img = Image.open(ASSET).convert("RGBA")
    os.makedirs(IMAGES_DIR, exist_ok=True)
    for name, size in SIZES:
        out = os.path.join(IMAGES_DIR, name)
        if size is None:
            img.save(out)
            print("Saved", name, "(original)")
            continue
        # Fit inside size, preserve aspect ratio, center on black
        w, h = size
        iw, ih = img.size
        scale = min(w / iw, h / ih)
        nw, nh = int(iw * scale), int(ih * scale)
        resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
        out_img = Image.new("RGBA", (w, h), (0, 0, 0, 255))
        x = (w - nw) // 2
        y = (h - nh) // 2
        if resized.mode == "RGBA":
            out_img.paste(resized, (x, y), resized)
        else:
            out_img.paste(resized, (x, y))
        out_img.save(out, "PNG")
        print("Saved", name, size)
    return 0

if __name__ == "__main__":
    exit(main())
