# CDN & HLS Setup for Digital Signage

## Recommended CDN Providers

1. **Cloudflare Stream** — HLS hosting, pay per minute
2. **Bunny CDN** — Low cost, global
3. **AWS CloudFront + S3** — Self-hosted HLS
4. **Supabase Storage** — For static .m3u8 + .ts (public bucket)

## HLS Format

```
stream.m3u8 (master playlist)
├── 720p.m3u8
├── 480p.m3u8
└── segments/
    ├── 720p_000.ts
    ├── 720p_001.ts
    └── ...
```

## FFmpeg HLS Output

```bash
ffmpeg -i input.mp4 -c:v libx264 -preset fast -c:a aac \
  -hls_time 4 -hls_list_size 0 -hls_segment_filename "seg_%03d.ts" \
  -f hls stream.m3u8
```

## CORS Headers (CDN)

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Allow-Headers: *
```

## screens.stream_url Example

Admin panel: set `stream_url` for a screen:
- `https://cdn.menuslide.com/streams/abc123.m3u8`
- Or `https://storage.supabase.co/.../stream.m3u8` (public bucket)

When set, both Roku and Android use this URL directly (no WebView).
