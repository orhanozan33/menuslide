/**
 * Capture a 1920x1080 JPEG screenshot of a display page.
 * Used by GET /api/render/[displayId] for Roku App-Level Image Sync.
 * Requires: npm i puppeteer
 */
export async function captureDisplayScreenshot(displayPageUrl: string): Promise<Buffer | null> {
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
      timeout: 30000,
    });
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: 90,
      fullPage: false,
    });
    if (!buffer) return null;
    return buffer instanceof Buffer ? buffer : Buffer.from(buffer as ArrayBuffer);
  } finally {
    await browser.close();
  }
}
