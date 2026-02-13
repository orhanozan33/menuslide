# Signage SaaS — Quick Reference

One-page reference. Full detail in **SIGNAGE-SAAS-ARCHITECTURE.md** and **SIGNAGE-ROKU-OFFLINE-CACHE.md**.

---

## Tech Stack

| Layer | Recommendation |
|-------|-----------------|
| API | Node (Express/Fastify) or Laravel — stateless |
| DB | PostgreSQL or MySQL |
| Cache | Redis (layout JSON, optional rate limit) |
| Storage | S3-compatible (DO Spaces, MinIO, B2) |
| CDN | Cloudflare / Bunny in front of storage |
| Roku | SceneGraph only; no Video node |

---

## API Surface

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/device/layout?deviceId=XYZ` | Layout JSON (version, slides, refreshIntervalSeconds) |
| GET | `/api/device/version?deviceId=XYZ` | Lightweight version check |
| POST | `/api/device/heartbeat` | Body: `{ deviceId, layoutVersion? }` — update last_heartbeat_at |

---

## Scalable Folder Structure (Repo / Storage)

**Backend (example):**
```
app/
  Http/Controllers/
    Api/
      Device/
        LayoutController.php   # GET layout, GET version
        HeartbeatController.php
  Models/
    Tenant.php
    Layout.php
    LayoutSlide.php
    Device.php
    DeviceLayoutAssignment.php
config/
  signage.php                   # refresh_interval, heartbeat_grace_seconds
database/migrations/
  xxx_create_tenants_table.php
  xxx_create_layouts_table.php
  xxx_create_layout_slides_table.php
  xxx_create_devices_table.php
  xxx_create_device_layout_assignments_table.php
```

**S3 / CDN (immutable assets):**
```
bucket/
  layouts/
    {layout_id}/
      v{layout_version}/
        slide_0.jpg
        slide_1.jpg
```

---

## DB Tables (Minimal Set)

- **tenants** — id, name, slug
- **layouts** — id, tenant_id, name, layout_version, published_at
- **layout_slides** — id, layout_id, display_order, type, image_url, title, description, duration_seconds
- **devices** — id, tenant_id, device_id, name, last_heartbeat_at, last_layout_version
- **device_layout_assignments** — device_id, layout_id (1:1 per device)

---

## Roku Offline Cache (Summary)

- **Registry:** layout JSON string, layout_version, refresh_interval.
- **roFileSystem (cache):** `slides/{layout_version}/{index}` for images.
- **Flow:** Prefer local file if present; else remote URL. On new version, pre-download images then switch. If API down, keep playing from cache.
- **Cleanup:** Delete `slides/{old_version}/` after new version is cached.

---

## Scaling Stages

| Stage | Devices | Components | Est. cost/mo |
|-------|---------|------------|--------------|
| 1 | 0–500 | 1 VPS (API+DB), S3, CDN | $10–20 |
| 2 | 500–5k | API 1–2, DB, Redis, LB, S3, CDN | $50–80 |
| 3 | 5k+ | API 3+, DB primary+replicas, Redis, LB, S3, CDN | $150–250 |

---

## Checklist (Production)

- [ ] Stateless API; no video/HLS/FFmpeg
- [ ] Layout version in every response; devices compare before reload
- [ ] Layout JSON cached in Redis by layout_id or version
- [ ] Single-query layout + slides (no N+1)
- [ ] Heartbeat updates one row; rate limit per device
- [ ] All slide images on CDN with versioned paths; long Cache-Control
- [ ] Roku: cache layout + images; fallback when API/image fails
- [ ] Admin: draft → atomic publish; dashboard reads from indexes
- [ ] Multi-tenant: all queries filtered by tenant_id
