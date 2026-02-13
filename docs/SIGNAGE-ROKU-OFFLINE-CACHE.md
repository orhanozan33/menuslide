# Roku Offline Cache — Implementation Guide

Companion to **SIGNAGE-SAAS-ARCHITECTURE.md**. Focus: local storage strategy, roFileSystem, version comparison, fallback, and 24/7 stability.

---

## Storage Strategy Overview

| Storage | Use | Survives reboot |
|--------|-----|------------------|
| **roRegistrySection** | Layout version, refresh interval, last layout JSON (string) | Yes |
| **roFileSystem (cachefs)** | Downloaded slide images by layout version | Yes (until app/storage clear) |

- Prefer **cachefs** for image files (Roku-managed cache; can be evicted under storage pressure, which is acceptable for “cache”).
- Keep **layout JSON** in registry so after reboot we know last version and can show cached layout even before network is up.

---

## Cache Directory Structure (roFileSystem)

```
cache/
  layout.json          -- full layout JSON string
  version.txt          -- single line: layout_version
  slides/
    {layout_version}/  -- e.g. "20260213120000" or hash
      0                -- binary image (no extension required)
      1
      2
```

- Use **layout_version** in path so new version = new folder. Old folder can be deleted when new version is fully cached.
- Slide index = position in `slides` array (0, 1, 2…). Filename = index to avoid URL hashing; same layout always same indices.

---

## roFileSystem Usage (BrightScript)

- **Cache directory:** Use `CreateObject("roFileSystem", "cache")` or the app’s cache directory. Roku docs recommend using `cachefs` or the path returned by `CreateObject("roAppInfo").getID()` for app-specific storage.
- **Write image:** Download via roUrlTransfer to a temp file in cache, then copy/move to `slides/{version}/{index}`. Use `CopyFile` or write to final path directly.
- **Read:** Build path `slides/{version}/{index}`. If file exists, set Poster’s `uri` to `file:///path` or use the appropriate scheme Roku supports for local files (e.g. `tmp:/` or cache path). Check Roku docs for exact URI for cachefs.
- **List/delete:** Use roFileSystem to list `slides/` subdirs; delete folders whose version <> current version.

Example (conceptual):

```brightscript
' Get cache base (pseudo; use actual Roku API for cache path)
function getCacheDir() as object
  fs = CreateObject("roFileSystem")
  ' Use cache directory; actual API may vary by Roku OS
  return "cache"
end function

sub saveLayoutToCache(layoutJson as string, version as string)
  sec = CreateObject("roRegistrySection", "signage")
  sec.write("layout", layoutJson)
  sec.write("layoutVersion", version)
  sec.flush()
  ' Optionally write to cachefs for redundancy
  ' writeFile(getCacheDir() + "/layout.json", layoutJson)
  ' writeFile(getCacheDir() + "/version.txt", version)
end sub

function getCachedLayoutVersion() as string
  sec = CreateObject("roRegistrySection", "signage")
  return sec.read("layoutVersion")
end function

function getCachedLayout() as dynamic
  sec = CreateObject("roRegistrySection", "signage")
  s = sec.read("layout")
  if s <> "" and s <> invalid then return ParseJson(s)
  return invalid
end function
```

---

## Image Pre-Download Logic

1. **On new layout (version changed):**
   - Parse `slides` array.
   - For each index `i` where `slides[i].type = "image"` and `slides[i].url` is set:
     - Local path = `slides/{version}/{i}`.
     - If file already exists at that path, skip.
     - Else: roUrlTransfer GET `url` → write to temp file → move/copy to `slides/{version}/{i}`. Limit concurrency (e.g. 1 download at a time).
   - After all images for this version are done, optionally delete folder `slides/{old_version}` for previous version.

2. **When displaying slide:**
   - Prefer local file path if exists (e.g. `file:///...` or cache URI).
   - If not cached, use remote `url` for Poster. After successful load you can optionally trigger a background download to cache for next time (or rely on pre-download step).

3. **Preload next:** While showing slide N, ensure slide N+1 image is either already cached or downloading. Use one “next” Poster node and set its URI when entering slide N.

---

## Version Comparison Logic

- **Cached version:** From registry `layoutVersion` (or `version.txt` in cache).
- **Server version:** From `GET /api/device/layout` or `GET /api/device/version` response `version` or `layoutVersion`.
- **Rule:** If server version <> cached version (or cached is empty) → treat as “new layout”: fetch full layout, save to cache, start pre-download of images, then switch engine to new layout.
- **If server unreachable:** Keep using cached layout and cached images; do not clear cache. Retry on next interval.

---

## Fallback Strategy

| Situation | Behavior |
|-----------|----------|
| API unreachable | Use cached layout + cached images; continue slide rotation; retry API every refresh interval. |
| New device, no cache | Show “Loading…” until first successful layout fetch; then save and run. |
| Image load failure (remote) | Retry 1–2 times with short delay; if still fail, show placeholder (e.g. black or “Unavailable”) and advance after duration. |
| Image load failure (local file) | Fall back to remote URL for that slide; optionally re-download to cache. |
| Corrupt cache file | If a local image fails to load, fall back to remote URL. If layout JSON is corrupt, clear registry layout/key and show “Loading…” until next successful fetch. |

---

## Memory Safety (24/7)

- **Bounded images in memory:** Only 2 Poster nodes (current + next). Swap content when advancing. Do not hold more than 2 full-size images in scene graph.
- **Download queue:** Max 1–2 concurrent downloads. Process queue sequentially or with a small fixed pool so memory and file handles stay bounded.
- **Clean old versions:** After successfully caching a new layout version, delete the previous version’s folder under `slides/` to avoid unbounded disk use. Keep only current (and optionally previous) version.

---

## Long-Running Stability (24/7 Signage)

- **No global arrays of nodes:** Don’t create a new Poster per slide and leave them in the scene; reuse 1–2 nodes.
- **Timer cleanup:** When restarting slide timer or switching layout, stop and unobserve previous Timer to avoid leaks.
- **Task cleanup:** After LayoutTask completes, result is read; task can be removed or left for GC. Avoid creating unbounded number of tasks (e.g. one layout fetch at a time).
- **Registry:** Write in batches; don’t flush on every tiny update. Flush after saving layout and version.
- **Retry backoff:** If API fails, retry with increasing delay (e.g. 30s, 60s, 120s) up to a max, then keep using cache and retry at refresh interval. Prevents tight loop on persistent network failure.

Implementing the above in your existing Roku SlideEngine + MainScene will give you an offline-capable, cache-first, 24/7-safe signage client that aligns with the SaaS architecture doc.
