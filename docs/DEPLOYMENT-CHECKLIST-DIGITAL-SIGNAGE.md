# Deployment Checklist — Cross-Platform Digital Signage

## 1. Backend API (menuslide.com/api)

- [ ] `POST /device/register` — activation
- [ ] `GET /device/layout` — layout fetch (header: X-Device-Token)
- [ ] `POST /device/heartbeat` — health ping
- [ ] Supabase: run `migration-add-stream-url.sql` for screens.stream_url

## 2. Admin Panel — Screen Configuration

- [ ] Add "Stream URL" field to screen edit form (HLS .m3u8 or MP4)
- [ ] When stream_url is set, register returns layout.type = "video" with videoUrl

## 3. CDN Setup (HLS)

- [ ] Use CDN for HLS streams (CloudFront, Cloudflare, Bunny CDN)
- [ ] CORS: allow origin from TV apps
- [ ] HLS URL format: `https://cdn.example.com/streams/{screenId}.m3u8`
- [ ] Segment duration: 2–6 seconds for low latency
- [ ] HTTPS only

## 4. Android Native Player

- [ ] Build APK: `cd android-tv && ./gradlew assembleRelease`
- [ ] Min SDK 24
- [ ] ExoPlayer only (no WebView)
- [ ] ActivationActivity → MainActivity flow
- [ ] HeartbeatService foreground
- [ ] BootReceiver for auto-start

## 5. Roku Channel

- [ ] Add icon-focus.png, icon-side.png, splash.png (1920x1080 or 1280x720)
- [ ] Package: `zip -r menuslide-roku.zip manifest source components images`
- [ ] Sideload: Roku Developer Dashboard → My Channels → Add
- [ ] Test on Roku device / TCL Roku TV (Canada)

## 6. Fire Stick Optimization

- [ ] Min SDK 24 (Fire Stick 2nd gen+)
- [ ] Disable battery optimization for app
- [ ] Keep screen on (FLAG_KEEP_SCREEN_ON)
- [ ] Foreground service for heartbeat
- [ ] Retry on network loss (3x with backoff)

## 7. Roku TCL Canada

- [ ] Test on TCL Roku TV Canadian models (Roku OS 11+)
- [ ] Resolution 1920x1080
- [ ] HLS streams: verify playback
- [ ] Keyboard: StandardKeyboardDialog for code entry

## 8. Freeze Prevention

- [ ] **Memory:** Single ExoPlayer/Video instance, release on destroy
- [ ] **Buffering:** Pre-buffer 10–15 seconds
- [ ] **Retry:** 3x with 2s, 5s, 10s backoff
- [ ] **API:** Max 1 concurrent request per endpoint
- [ ] **JSON:** Safe parsing, null checks
