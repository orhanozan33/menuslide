# Roku Digital Signage SaaS — Architecture & Scaling Guide

**Constraints:** No video rendering, no HLS, no FFmpeg. Backend serves JSON + static images. Roku renders slides natively. Scale 1 → 10,000+ devices. Low infrastructure cost.

---

## 1) Multi-Device Scaling Architecture

### Principles

- **Stateless API** — Any server can serve any request. No sticky sessions.
- **Horizontal scaling** — Add more API instances behind a load balancer.
- **No heavy CPU** — No image resize, no encoding. Read DB/cache → return JSON.
- **Version-based layout** — `layout_version` (hash or timestamp) so devices only reload when content changes.

### Recommended Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| API | Node.js (Express/Fastify) or Laravel | Stateless, fast JSON. Laravel if you need admin/ORM fast. |
| DB | PostgreSQL or MySQL | Tenants, devices, layouts, assignments. |
| Cache | Redis | Layout JSON cache, optional heartbeat dedup. |
| Storage | S3-compatible (MinIO, DO Spaces, AWS S3) | Immutable slide images. |
| CDN | Cloudflare, Bunny, or provider CDN | Cache images at edge. |
| LB | Nginx, Caddy, or cloud LB | When you have 2+ API nodes. |

### Database Schema (Multi-Tenant, No Video)

```sql
-- Tenants (SaaS isolation)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layouts (versioned; one published version per layout)
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  layout_version VARCHAR(64) NOT NULL,  -- hash or timestamp, bumped on publish
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_layouts_tenant ON layouts(tenant_id);
CREATE INDEX idx_layouts_tenant_version ON layouts(tenant_id, layout_version);

-- Slides (per layout; immutable URLs)
CREATE TABLE layout_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  type VARCHAR(20) NOT NULL DEFAULT 'image',  -- image | text
  image_url TEXT,                             -- full CDN URL, immutable
  title TEXT,
  description TEXT,
  duration_seconds INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_layout_slides_layout ON layout_slides(layout_id, display_order);

-- Devices (Roku devices)
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,             -- Roku device id
  name VARCHAR(255),
  last_heartbeat_at TIMESTAMPTZ,
  last_layout_version VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, device_id)
);
CREATE INDEX idx_devices_tenant ON devices(tenant_id);
CREATE INDEX idx_devices_heartbeat ON devices(last_heartbeat_at) WHERE last_heartbeat_at IS NOT NULL;

-- Which layout is assigned to which device (1:1 per device)
CREATE TABLE device_layout_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id)
);
CREATE INDEX idx_device_assignments_device ON device_layout_assignments(device_id);
CREATE INDEX idx_device_assignments_layout ON device_layout_assignments(layout_id);
```

### API Structure (Stateless)

```
GET  /api/device/layout?deviceId=XYZ     → layout JSON (version, slides, refreshIntervalSeconds)
POST /api/device/heartbeat               → body: { deviceId, layoutVersion? }; update last_heartbeat_at
GET  /api/device/version?deviceId=XYZ   → { version } only (lightweight poll)
```

- **Layout** — Resolve device by `deviceId` (or token) → tenant → `device_layout_assignments` → `layout_id` → load layout + slides in **one or two queries** (see below). Return JSON. Optionally cache by `(tenant_id, layout_id)` or by `layout_version` in Redis.
- **Heartbeat** — Upsert `devices.last_heartbeat_at` (and optionally `last_layout_version`). No heavy work. Optional: rate limit per device (e.g. 1 req/30s per device).

### Avoiding N+1 and Reducing DB Load

1. **Single layout query** — For `GET /api/device/layout`:
   - Resolve `device` by `device_id` (+ tenant). Join or second query `device_layout_assignments` → `layout_id`.
   - Load layout row (with `layout_version`).
   - Load all slides: `SELECT * FROM layout_slides WHERE layout_id = ? ORDER BY display_order`. One query.
   - No N+1: you never load “slides per slide” in a loop.
2. **Cache layout JSON in Redis** — Key: `layout:json:{layout_id}` or `layout:json:v:{layout_version}`. TTL e.g. 300s or no TTL; invalidate on publish. Value: full JSON string. API: try cache → on miss load from DB, write cache, return.
3. **Version in response** — Always return `version: layout.layout_version`. Devices compare with cached version; only re-parse and apply when changed.
4. **Heartbeat** — Single UPDATE by primary key or (tenant_id, device_id). Index on `(tenant_id, device_id)`. No N+1.

### Rate Limiting Strategy

- **Per device (by deviceId):** e.g. 1 layout request per 60s, 1 heartbeat per 30s (sliding window or fixed window in Redis). Prevents a misbehaving device from hammering the API.
- **Per tenant / API key:** Optional. For admin or server-to-server, use API key + per-key limits.
- **Global:** Optional cap per node (e.g. 10k req/min per instance) to protect DB.

### Device Online/Offline Detection

- **Definition:** “Online” = `last_heartbeat_at` within last e.g. 5 minutes (configurable).
- **Query:** `SELECT * FROM devices WHERE tenant_id = ? AND last_heartbeat_at >= NOW() - INTERVAL '5 minutes'` for “online” count or list. Index on `last_heartbeat_at` (partial index is enough).
- **Background:** No need for a separate “offline” job if you only derive status from `last_heartbeat_at` on read. Optionally a nightly job can set `status = 'offline'` for reporting.

### Sharding (When Needed)

- **When:** Very large tenant count or device count (e.g. 100k+ devices) and single DB is the bottleneck.
- **How:** Shard by `tenant_id` (e.g. tenant_id % N). All data for a tenant in one shard. Devices and layouts for that tenant on same shard. API resolves tenant first, then chooses DB shard.
- **Alternative:** Keep one DB; add read replicas; direct layout reads to replicas; heartbeats (writes) to primary. Simpler than sharding for most cases.

---

## 2) CDN Strategy

### Requirements

- All slide images served via CDN.
- Backend never resizes images (no CPU).
- Immutable URLs for long cache life.
- Optional signed URLs for private content.

### CDN Flow (Conceptual)

```
Roku → GET layout JSON → API (origin)
Roku → GET image URL from JSON → CDN (origin: S3/compatible)
       → CDN edge → cache HIT → return image
       → cache MISS → CDN fetches from S3 → caches → returns
```

- API only returns **JSON** with full image URLs (CDN URLs). API never streams image bytes.
- Roku (or browser) requests images directly from CDN. No image traffic through your API.

### Folder Structure (S3 / Object Storage)

Use a predictable, versioned path so that “new layout” = new path = cache bust:

```
bucket/
  layouts/
    {layout_id}/
      v{layout_version}/           # or layout_version hash
        slide_0.jpg
        slide_1.jpg
        ...
```

- **Immutable URL example:** `https://cdn.example.com/layouts/{layout_id}/v{layout_version}/slide_0.jpg`
- When you publish a new version, you upload to a **new** `v{new_version}/` folder. Old URLs still valid (old version). No purge needed for “update”; just point layout to new URLs.

### Versioned Asset Naming

- **Option A (folder):** `.../v3/slide_0.jpg` — version in path. Prefer this for cache clarity.
- **Option B (filename):** `slide_0_v3.jpg` — same idea.
- **Rule:** Same URL must always return same bytes. New content = new URL.

### Cache-Control Headers (Origin / S3)

- Set on upload (S3 metadata or CDN config):
  - `Cache-Control: public, max-age=31536000, immutable` for versioned URLs.
- CDN will honor and re-use at edge. Browsers/Roku cache as well.

### Cache Invalidation / When to Purge

- **Normal operation:** No purge. New layout = new paths. Old layout still cached for devices that haven’t refreshed yet.
- **Purge only when:** You must remove or replace the **same** URL (e.g. legal take-down, or you didn’t use versioned URLs). Then purge that URL or path from CDN.
- **Cost:** Prefer long TTL + versioned URLs; minimize purge.

### Cost Optimization (CDN + Storage)

- Use **one** S3-compatible bucket (e.g. DO Spaces, MinIO, Backblaze B2). Put CDN in front.
- Prefer CDN with low egress (e.g. Cloudflare, Bunny). Cache hit = no origin egress.
- Keep images reasonably sized (e.g. 1920×1080 JPEG, quality 80). No server-side resize; do this once at upload in admin.

---

## 3) Offline Cache System (Roku Side)

### Goals

- Keep last working layout (JSON + images).
- If API is unreachable, keep playing from cache.
- If an image fails to load, retry and/or fallback.
- Survive reboot; minimal storage; auto-clean old assets.

### Roku Local Storage Strategy

- **roRegistrySection** — Small key/value (layout version, refresh interval, last JSON string). Survives reboot. Use for “last known good” layout JSON and version.
- **roFileSystem** — Cache directory for image files. Use `cachefs` or `tmp`; prefer a dedicated app cache directory so it’s managed by the system and can be cleared by OS under storage pressure.

### Cache Directory Structure (roFileSystem)

```
cache/
  layout.json           -- last successful layout JSON
  version.txt           -- last layout_version
  slides/
    {layout_version}/
      {slide_index}.jpg  -- e.g. 0.jpg, 1.jpg (by URL hash or index)
```

- Use `layout_version` in path so that when version changes you can delete entire `slides/{old_version}/` folder and write new one. Avoids mixing old and new assets.

### Image Pre-Download Logic

1. After receiving new layout JSON (version changed):
   - Save `layout.json` and `version.txt`.
   - For each slide with `type === "image"` and `url`:
     - Check if already in `slides/{version}/{index}.jpg`. If yes, skip.
     - Else download to temp file, then move to `slides/{version}/{index}.jpg`.
   - Optionally preload next N images in background (e.g. next 1–2 slides).
2. When displaying a slide, use **local path** if file exists, else use **remote URL** (with retry). Prefer local to avoid network glitches during playback.

### Version Comparison Logic

- On app start: read `version.txt`. Call `GET /api/device/version?deviceId=XYZ` (or full layout with If-None-Match if you add ETag). If response version !== cached version → fetch full layout and refresh cache.
- On refresh timer: same. If version changed → re-download layout JSON and slide images for new version.

### Fallback Strategy

- **API unreachable:** Keep using cached `layout.json` and cached images. Continue slide rotation. Retry API on next interval.
- **Single image load failure:** Retry 1–2 times with backoff. If still fail, show placeholder (e.g. black frame or “Image unavailable”) and continue to next slide after duration. Optionally re-try that image URL on next cycle.
- **No cache at all (first run):** Show “Loading…” until first layout succeeds. Then save to cache.

### Memory and Long-Running Safety (24/7)

- Don’t hold hundreds of images in memory. Load only current + next (e.g. two Poster nodes; swap URIs or file paths).
- After writing a new image file, don’t keep the previous file handle open. Let Roku/OS manage file descriptors.
- Use a bounded number of simultaneous downloads (e.g. 1–2). Avoid unbounded queues.
- Periodically (e.g. every 24h) or when version changes: delete `slides/{old_version}/` for versions no longer current. Prefer doing this right after a successful layout update so you only keep “current” and “previous” version at most.

---

## 4) Admin Panel Optimization

### Multi-Tenant SaaS

- All tables scoped by `tenant_id`. Every query filtered by tenant (from auth/session). No cross-tenant data leak.

### Layout Builder and Publish

- **Draft vs Published:** Keep one “published” snapshot per layout (e.g. `layouts.published_at` + `layout_version`). Draft = working copy; can be in same table with `published_at IS NULL` or a separate `layout_drafts` table that copies to `layouts` + `layout_slides` on publish.
- **Atomic publish:** In one transaction: (1) create new `layout_version`, (2) copy draft slides to `layout_slides` for that layout/version, (3) set `layouts.published_at = NOW()`, `layouts.layout_version = new_version`. Devices see new version on next poll. No partial updates.
- **No re-rendering assets:** Admin uploads images once. You store CDN URL in `layout_slides.image_url`. Publish only updates metadata and ordering. No server-side image processing.

### Device Status Dashboard

- **Online/offline:** Derived from `devices.last_heartbeat_at` (e.g. last 5 min = online). No WebSocket required; polling every 30–60s is enough.
- **List devices:** `SELECT id, name, device_id, last_heartbeat_at, last_layout_version FROM devices WHERE tenant_id = ? ORDER BY last_heartbeat_at DESC NULLS LAST`. Paginate (e.g. 50 per page). Index: `(tenant_id, last_heartbeat_at)`.
- **Bulk assignment:** Single update: `UPDATE device_layout_assignments SET layout_id = ? WHERE device_id IN (?)` (and create assignments for devices that don’t have one). One query per batch.

### Indexing Strategy

- **Layout by tenant:** `idx_layouts_tenant`, `idx_layouts_tenant_version`.
- **Slides by layout:** `idx_layout_slides_layout` (layout_id, display_order).
- **Devices by tenant:** `idx_devices_tenant`. For “online” list: `idx_devices_heartbeat` (partial on last_heartbeat_at).
- **Assignments by device:** `idx_device_assignments_device`. By layout: `idx_device_assignments_layout` (for “devices using this layout”).
- No full-text on slide content needed unless you add search; then add GIN index on title/description.

### Dashboard Query Scaling

- Keep dashboard reads on read replicas if you have them.
- Cache “online count” per tenant in Redis (e.g. TTL 60s); update on heartbeat or recalc in background.
- Real-time preview: browser-only; load same layout JSON that devices get, render in JS (no WebSocket required).

---

## 5) Cost-Efficient Infrastructure Design

### Stage 1: 0–500 devices (~ $5–20 VPS)

- **One VPS:** API + same machine for DB (e.g. PostgreSQL in Docker or native). No Redis required; optional file-based or in-memory cache for layout JSON.
- **Storage:** S3-compatible bucket (e.g. DO Spaces, Backblaze B2) + CDN in front (Cloudflare free or Bunny).
- **API:** Single Node or Laravel instance. Stateless. Nginx or Caddy as reverse proxy; static assets only at CDN.
- **Estimate:** VPS $5–10, storage $5–10, CDN minimal. **Total ~ $10–20/month.**

### Stage 2: 500–5,000 devices

- **Separate DB:** Move DB to managed instance (e.g. DO Managed DB, small) or second VPS. API still 1–2 nodes.
- **Redis:** One small Redis (e.g. 256MB) for layout JSON cache and optional rate limit. Reduces DB load.
- **Load balancer:** If 2 API nodes, add LB (e.g. DO LB, or Nginx on a small node). Heartbeat and layout traffic spread across nodes.
- **Estimate:** API 1–2 × $10, DB $15–25, Redis $5–10, LB $5–10, storage + CDN $10–20. **Total ~ $50–80/month.**

### Stage 3: 5,000+ devices

- **API:** Scale out to 3+ nodes behind LB. Stateless; no code change.
- **DB:** Primary + 1+ read replicas. Layout/device reads from replicas; heartbeats (writes) to primary.
- **Redis:** Keep; use for layout cache and rate limiting. Optional Redis Cluster only if single Redis becomes bottleneck.
- **CDN:** Ensure all images are CDN-backed; no image traffic through API.
- **Queue workers:** Not needed for core path (no video, no heavy jobs). Optional: “publish” could enqueue a job to invalidate Redis key; worker is trivial.
- **Estimate:** API 3 × $20, DB primary + replica $50–100, Redis $15–20, LB $10–15, storage + CDN $30–50. **Total ~ $150–250/month.**

### When to Introduce Each Piece

| Component | When |
|----------|------|
| Load balancer | When you run 2+ API instances. |
| Redis | When DB CPU or connection count grows (e.g. 500+ devices polling). |
| Read replicas | When read load is high (e.g. 2k+ devices) and primary is busy. |
| Queue workers | Only if you add non-instant jobs (e.g. bulk export, reports). Not for layout/heartbeat. |

### Cost Breakdown (Rough)

- **API:** $5–20 per node per month (small VPS).
- **DB:** $15–50 (managed) or included on same VPS at low scale.
- **Redis:** $5–15 (small managed or same VPS).
- **Storage (S3-compatible):** $5–20 (storage + egress; CDN reduces egress from origin).
- **CDN:** $0–20 (Cloudflare free tier; paid for higher volume).
- **No video encoding:** $0 encoding cost; no extra workers.

---

## Scaling Roadmap Summary

1. **Launch:** Single VPS, API + DB, S3 + CDN. No Redis. Devices poll layout; heartbeat updates DB.
2. **Growth:** Add Redis for layout cache; move DB to managed if needed; add second API node + LB.
3. **Scale:** Add read replicas; 3+ API nodes; keep Redis; keep CDN for all images.
4. **Optional:** Shard by tenant if one DB is no longer enough; keep API stateless and tenant-aware.

All of this assumes **zero video processing**, **JSON + static images only**, and **Roku-native slide rendering** with a robust **offline cache** and **version-based updates** for minimal bandwidth and maximum resilience.
