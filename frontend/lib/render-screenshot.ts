/**
 * Capture a 1920x1080 JPEG screenshot of a display page.
 * Used by generate-slides and GET /api/render/[displayId].
 *
 * Priority:
 * 1. SCREENSHOTONE_ACCESS_KEY → ScreenshotOne API (Vercel uyumlu, ücretsiz 100/ay)
 * 2. Puppeteer (yerel / VPS)
 */
export async function captureDisplayScreenshot(displayPageUrl: string): Promise<Buffer | null> {
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
      url.searchParams.set('access_key', key);
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(30000) });
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
      waitUntil: 'load',
      timeout: 18000,
    });
    await new Promise((r) => setTimeout(r, 2000));
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
