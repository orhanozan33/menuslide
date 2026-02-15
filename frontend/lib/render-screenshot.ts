export type RotationForCapture = {
  template_id?: string | null;
  full_editor_template_id?: string | null;
  display_duration?: number;
};

/** Her şablon göründükten 10 sn sonra ekran görüntüsü; tek canlı sayfa, her zaman güncel resim. */
const LIVE_CAPTURE_SETTLE_MS = 10000;

/**
 * Canlı sayfa: tek URL açılır, her template göründükten 10 sn sonra 1 resim alınır (Puppeteer).
 * Kullanıcı URL açmasa bile arka planda güncel slaytlar üretilir.
 */
export async function captureDisplaySlidesFromLivePage(options: {
  baseUrl: string;
  slug: string;
  screenId: string;
  versionHash: string;
  rotations: RotationForCapture[];
  runTs: number;
}): Promise<(Buffer | null)[]> {
  const { baseUrl, slug, screenId, versionHash, rotations, runTs } = options;
  const puppeteer = await import('puppeteer').catch(() => null);
  if (!puppeteer?.default) return rotations.map(() => null);

  const liveUrl = `${baseUrl.replace(/\/$/, '')}/display/${encodeURIComponent(String(slug))}?lite=1&_live=${runTs}`;
  const durationsSec = rotations.map((r) => Math.max(1, r.display_duration ?? 8));
  const results: (Buffer | null)[] = [];

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(liveUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('[data-display-ready="true"]', { timeout: 25000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    for (let i = 0; i < rotations.length; i++) {
      await new Promise((r) => setTimeout(r, LIVE_CAPTURE_SETTLE_MS));
      const screenshotResult = await page.screenshot({
        type: 'jpeg',
        quality: 90,
        fullPage: false,
      });
      const buffer: Buffer | null =
        screenshotResult == null
          ? null
          : Buffer.isBuffer(screenshotResult)
            ? Buffer.from(screenshotResult)
            : Buffer.from(screenshotResult as unknown as Uint8Array);
      results.push(buffer);
      const templateId = rotations[i]?.full_editor_template_id || rotations[i]?.template_id || '';
      console.log('[render-screenshot] live capture slide %s templateId=%s buffer.length=%s', i, templateId, buffer?.length ?? 0);
      if (i < rotations.length - 1) {
        const waitMs = durationsSec[i] * 1000;
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  return results;
}

/**
 * Screenshot servisi batch: birden fazla URL tek istekte; servis loop içinde goto → screenshot döner.
 * Response: { images: string[] } base64. Servis yoksa null döner.
 */
export async function captureDisplaySlidesBatch(urls: string[]): Promise<(Buffer | null)[] | null> {
  const serviceUrl = process.env.SCREENSHOT_SERVICE_URL?.trim();
  if (!serviceUrl || urls.length === 0) return null;
  try {
    const base = serviceUrl.replace(/\/$/, '');
    const authToken = process.env.SCREENSHOT_SERVICE_AUTH_TOKEN?.trim();
    const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['X-Auth-Token'] = authToken;
    const body: Record<string, unknown> = { urls };
    if (protectionBypass) body.protectionBypass = protectionBypass;
    const res = await fetch(`${base}/screenshot-batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { images?: string[] };
    const images = data?.images ?? [];
    return images.map((b64: string) => {
      try {
        return Buffer.from(b64, 'base64');
      } catch {
        return null;
      }
    });
  } catch {
    return null;
  }
}

/**
 * Snapshot slide'ları için navigation loop: tek browser, her rotation için goto → wait → screenshot.
 * Cache kapalı; her iterasyonda yeni buffer; location.reload kullanılmaz, sadece page.goto.
 * Her rotation için yeni page açılıp kapatılır (farklı içerik garantisi).
 */
export async function captureDisplaySlidesInLoop(options: {
  baseUrl: string;
  slug: string;
  screenId: string;
  versionHash: string;
  rotations: RotationForCapture[];
  runTs: number;
}): Promise<(Buffer | null)[]> {
  const { baseUrl, slug, screenId, versionHash, rotations, runTs } = options;
  const puppeteer = await import('puppeteer').catch(() => null);
  if (!puppeteer?.default) return rotations.map(() => null);

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results: (Buffer | null)[] = [];

  try {
    for (let orderIndex = 0; orderIndex < rotations.length; orderIndex++) {
      const r = rotations[orderIndex];
      const templateId = r.full_editor_template_id || r.template_id || '';
      const fullUrl = `${baseUrl.replace(/\/$/, '')}/display/${encodeURIComponent(String(slug))}/snapshot/${orderIndex}?lite=1&_=${runTs}-${orderIndex}`;
      const outputPath = `slides/${screenId}/${versionHash}/slide_${orderIndex}.jpg`;

      const page = await browser.newPage();
      try {
        await page.setCacheEnabled(false);
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        await page.goto(fullUrl, { waitUntil: 'networkidle0', timeout: 25000 });
        await page.waitForFunction('window.__SNAPSHOT_READY__ === true', { timeout: 20000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 500));
        const screenshotResult = await page.screenshot({
          type: 'jpeg',
          quality: 90,
          fullPage: false,
        });
        const buffer: Buffer | null =
          screenshotResult == null
            ? null
            : Buffer.isBuffer(screenshotResult)
              ? screenshotResult
              : Buffer.from(screenshotResult as unknown as Uint8Array);
        results.push(buffer);
        const len = buffer?.length ?? 0;
        console.log('[render-screenshot] rotationIndex=%s templateId=%s fullUrl=%s buffer.length=%s outputPath=%s', orderIndex, templateId, fullUrl, len, outputPath);
      } finally {
        await page.close().catch(() => {});
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const lengths = results.map((b) => b?.length ?? 0).filter((l) => l > 0);
    if (lengths.length >= 2 && new Set(lengths).size === 1) {
      console.warn('[render-screenshot] WARNING: buffer.length aynı tüm slide\'lar için:', lengths[0], '- içerik aynı olabilir');
    }
  } finally {
    await browser.close();
  }

  return results;
}

/**
 * Capture a 1920x1080 JPEG screenshot of a display page.
 * Used by generate-slides and GET /api/render/[displayId].
 *
 * Snapshot mode (URL contains mode=snapshot):
 * - Deterministic render: phase 0, no timers, no rotation
 * - Puppeteer waits for window.__SNAPSHOT_READY__ = true before capture
 *
 * Priority:
 * 1. SCREENSHOT_SERVICE_URL → Kendi Puppeteer servisimiz (ücretsiz)
 * 2. SCREENSHOTONE_ACCESS_KEY → ScreenshotOne API (ücretli)
 * 3. Puppeteer (yerel / VPS - sadece Chrome yüklü sunucularda)
 */
export async function captureDisplayScreenshot(displayPageUrl: string): Promise<Buffer | null> {
  const isSnapshotMode = displayPageUrl.includes('mode=snapshot') || /\/snapshot\/\d+/.test(displayPageUrl);
  const serviceUrl = process.env.SCREENSHOT_SERVICE_URL?.trim();
  if (process.env.VERCEL) {
    console.log('[render-screenshot] Vercel env: SCREENSHOT_SERVICE_URL=', serviceUrl ? 'set' : 'NOT SET');
  }
  if (serviceUrl) {
    try {
      const base = serviceUrl.replace(/\/$/, '');
      const authToken = process.env.SCREENSHOT_SERVICE_AUTH_TOKEN?.trim();
      const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['X-Auth-Token'] = authToken;
      const body: Record<string, unknown> = {
        url: displayPageUrl,
        width: 1920,
        height: 1080,
        quality: 90,
        waitMs: isSnapshotMode ? 25000 : 22000,
        waitForSelector: isSnapshotMode ? undefined : '[data-display-ready="true"]',
        waitForSnapshotReady: isSnapshotMode,
      };
      if (protectionBypass) body.protectionBypass = protectionBypass;
      const res = await fetch(`${base}/screenshot`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[render-screenshot] Screenshot service error:', res.status, text);
        return null;
      }
      const arr = new Uint8Array(await res.arrayBuffer());
      return Buffer.from(arr);
    } catch (e) {
      console.error('[render-screenshot] Screenshot service fetch failed:', e);
      return null;
    }
  }

  const key = process.env.SCREENSHOTONE_ACCESS_KEY?.trim();
  if (key) {
    try {
      const url = new URL('https://api.screenshotone.com/take');
      url.searchParams.set('url', displayPageUrl);
      url.searchParams.set('viewport_width', '1920');
      url.searchParams.set('viewport_height', '1080');
      url.searchParams.set('format', 'jpeg');
      url.searchParams.set('image_quality', '90');
      url.searchParams.set('block_ads', 'true');
      url.searchParams.set('cache', 'false');
      url.searchParams.set('delay', isSnapshotMode ? '35' : '28');
      url.searchParams.set('access_key', key);
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(60000) });
      if (!res.ok) {
        console.error('[render-screenshot] ScreenshotOne error:', res.status, await res.text());
        return null;
      }
      const arr = new Uint8Array(await res.arrayBuffer());
      return Buffer.from(arr);
    } catch (e) {
      console.error('[render-screenshot] ScreenshotOne fetch failed:', e);
      return null;
    }
  }

  // Vercel'de Chrome yok; kendi servis veya ScreenshotOne zorunlu
  if (process.env.VERCEL) {
    console.error('[render-screenshot] Vercel ortaminda SCREENSHOT_SERVICE_URL veya SCREENSHOTONE_ACCESS_KEY gerekli. Puppeteer atlanıyor.');
    return null;
  }

  const puppeteer = await import('puppeteer').catch(() => null);
  if (!puppeteer?.default) return null;

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(displayPageUrl, {
      waitUntil: isSnapshotMode ? 'networkidle0' : 'networkidle2',
      timeout: 25000,
    });
    if (isSnapshotMode) {
      await page.waitForFunction('window.__SNAPSHOT_READY__ === true', { timeout: 20000 }).catch(() => {});
    } else {
      await page.waitForSelector('[data-display-ready="true"]', { timeout: 15000 }).catch(() => {});
    }
    // Font rendering için ek bekleme — Roku screenshot'ta yazı stili tutarlı olsun
    await new Promise((r) => setTimeout(r, 1000));
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: 90,
      fullPage: false,
    });
    if (!buffer) return null;
    if (buffer instanceof Buffer) return buffer;
    const arr = new Uint8Array(buffer as unknown as ArrayBuffer);
    return Buffer.from(arr);
  } finally {
    await browser.close();
  }
}
