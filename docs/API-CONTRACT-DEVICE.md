# Device API Contract — Roku & Android Shared

Base URL: `https://menuslide.com/api`

## Endpoints

### POST /device/register

**Request:**
```json
{
  "displayCode": "10012",
  "deviceId": "unique-device-uuid",
  "deviceModel": "Roku TV 4K",
  "osVersion": "12.0"
}
```

**Success (200):**
```json
{
  "deviceToken": "dt_abc123_xyz789_1234567890",
  "refreshIntervalSeconds": 300,
  "layout": {
    "type": "video",
    "videoUrl": "https://cdn.menuslide.com/stream.m3u8",
    "backgroundColor": "#000000"
  },
  "videoUrls": ["https://cdn.menuslide.com/stream.m3u8"]
}
```

**Or components layout:**
```json
{
  "deviceToken": "dt_abc123_xyz789_1234567890",
  "refreshIntervalSeconds": 300,
  "layout": {
    "version": 1,
    "type": "components",
    "backgroundColor": "#000000",
    "components": [
      {
        "id": "v1",
        "type": "video",
        "x": 0,
        "y": 0,
        "width": 1920,
        "height": 1080,
        "zIndex": 1,
        "videoUrl": "https://cdn.menuslide.com/stream.m3u8"
      },
      {
        "id": "t1",
        "type": "text",
        "x": 24,
        "y": 24,
        "width": 600,
        "height": 48,
        "zIndex": 2,
        "text": "MenuSlide",
        "textColor": "#FFFFFF",
        "textSize": 28
      }
    ]
  },
  "videoUrls": ["https://cdn.menuslide.com/stream.m3u8"]
}
```

**Errors:** 400 (displayCode required), 404 (CODE_NOT_FOUND), 503 (SERVER_NOT_CONFIGURED)

---

### GET /device/layout

**Headers:** `Authorization: Bearer {deviceToken}` or `X-Device-Token: {deviceToken}`

**Query:** `?deviceToken=xxx` (fallback)

**Success (200):** Same layout object as register.

**Errors:** 401 (token required), 404 (token invalid)

---

### POST /device/heartbeat

**Request:**
```json
{
  "deviceToken": "dt_abc123_xyz789_1234567890",
  "ramUsageMb": 128,
  "playbackStatus": "playing",
  "appVersion": "1.0.0",
  "lastError": null
}
```

**Success (200):**
```json
{ "ok": true }
```

---

## Layout Types

### type: "video"
Single full-screen video. HLS (.m3u8) or MP4.
```json
{
  "type": "video",
  "videoUrl": "https://cdn.example.com/stream.m3u8",
  "backgroundColor": "#000000"
}
```

### type: "components"
Array of components (text, image, video) with x, y, width, height, zIndex.
- `type: "text"` — text, textColor, textSize
- `type: "image"` — imageUrl
- `type: "video"` — videoUrl (ExoPlayer/Roku Video node)

---

## Retry Rules

- Network failure: retry 3x with backoff (2s, 5s, 10s)
- 5xx: retry 2x with 5s delay
- 4xx: no retry (except 429: retry after Retry-After)
- Max 1 concurrent API call per endpoint
