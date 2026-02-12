# MenuSlide Roku Channel — Digital Signage

## Requirements

1. **Images** (add to `images/`):
   - `icon-focus.png` (290x218)
   - `icon-side.png` (214x144)
   - `splash.png` (1920x1080)

2. **Roku Developer Account**

## Package

```bash
cd roku-tv
zip -r menuslide-roku.zip manifest source components images
```

## Sideload

1. Roku Developer Dashboard → My Channels → Add
2. Upload menuslide-roku.zip
3. Or use `roku deploy` CLI

## API

Same backend as Android: `https://menuslide.com/api`

- POST /device/register
- GET /device/layout?deviceToken=xxx
- POST /device/heartbeat

## Flow

1. RootScene loads
2. If no deviceToken → ActivationScene (keyboard for 5-digit code)
3. ApiRegister → save token + layout
4. MainScene → Video node plays layout.videoUrl (HLS/MP4)
5. Heartbeat every refreshIntervalSeconds

## TCL Canada

Tested on TCL Roku TV (Canadian models). Resolution 1920x1080.
