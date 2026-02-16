#!/bin/bash
# Roku channel paketle - .gitkeep hariç, manifest root'ta
set -e
cd "$(dirname "$0")"
rm -f menuslide-roku.zip
zip -r menuslide-roku.zip manifest source components images -x "*.DS_Store" -x "images/.gitkeep" -x "images/splash.png" -x "images/logo-menuslide-canada.png" -x "images/icon-side.png"
echo "Created: menuslide-roku.zip"
ls -la menuslide-roku.zip
