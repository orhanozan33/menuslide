# Fire Stick & Roku TCL Canada Notes

## Fire Stick Optimization

### Battery & Performance
- Settings → Applications → Manage Installed Applications → [App] → Battery → Unrestricted
- Disable "Put unused apps to sleep" for the signage app

### Memory
- Single ExoPlayer instance only
- Release player in onDestroy
- Pre-buffer 10–15 seconds for HLS

### Network
- Retry 3x on failure (2s, 5s, 10s backoff)
- Heartbeat every 5 minutes (configurable)

### Boot
- BootReceiver launches ActivationActivity
- User selects recent code or enters new code
- App runs 24/7 after activation

---

## Roku TCL Canada Compatibility

### Models
- TCL Roku TV (Canadian models: 4-Series, 5-Series, 6-Series)
- Roku OS 11+
- Resolution: 1920x1080

### HLS
- Roku Video node supports HLS (.m3u8) natively
- streamFormat = "hls" for .m3u8 URLs
- MP4 also supported

### Activation
- StandardKeyboardDialog for 5-digit code entry
- Registry section "menuslide" stores deviceToken, layout

### Retry Logic
- ApiRegister: 3 attempts, 2s/5s/8s backoff
- ApiLayout: 3 attempts
- ApiHeartbeat: fire-and-forget (no retry)

---

## Freeze Prevention

1. **Memory:** Single video/player instance
2. **Stream:** Pre-buffer, avoid tiny segments
3. **Network:** Retry with backoff, max 1 concurrent API call
4. **JSON:** Safe ParseJson, null checks
5. **Roku:** Clear unused nodes, avoid large arrays
6. **Android:** Never block main thread, release in onDestroy
