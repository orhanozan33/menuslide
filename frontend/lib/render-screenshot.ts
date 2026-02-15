/**
 * Capture a 1920x1080 JPEG screenshot of a display page.
 * Used by generate-slides and GET /api/render/[displayId].
 *
 * Priority:
 * 1. SCREENSHOT_SERVICE_URL → Kendi Puppeteer servisimiz (ücretsiz)
 * 2. SCREENSHOTONE_ACCESS_KEY → ScreenshotOne API (ücretli)
 * 3. Puppeteer (yerel / VPS - sadece Chrome yüklü sunucularda)
 */
export async function captureDisplayScreenshot(displayPageUrl: string): Promise<Buffer | null> {
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
        waitMs: 15000,
        waitForSelector: '[data-display-ready="true"]',
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
      url.searchParams.set('delay', '12');
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
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await page.waitForSelector('[data-display-ready="true"]', { timeout: 15000 }).catch(() => {});
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
