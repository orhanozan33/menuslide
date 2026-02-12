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

```
App start
    ↓
ActivationScene? (no token) → ApiRegister → save token + layout
    ↓
MainScene: load layout from cache or GET /device/layout
    ↓
JSON cache (Registry)
    ↓
SceneGraph render (Video node)
    ↓
Timer (every 5 min):
    POST /device/heartbeat
    GET /device/version
    → layoutVersion changed? → GET /device/layout → re-render
```

## TCL Canada

Tested on TCL Roku TV (Canadian models). Resolution 1920x1080.
