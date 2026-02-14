#!/usr/bin/env node
/**
 * VPS Screenshot Worker
 * Puppeteer ile MenuSlide ekran sayfalarının görüntüsünü alıp /var/www/menuslide/cdn/ altına kaydeder.
 * Cron ile periyodik çalıştırılır. 200+ TV için paralel çalışma desteklenir.
 *
 * Gerekli env:
 *   DISPLAY_BASE_URL   - Örn. https://menuslide.com
 *   OUTPUT_DIR         - Örn. /var/www/menuslide/cdn
 *   SCREEN_SLUGS       - Virgülle ayrılmış slug'lar: menuslide-tv10,menuslide-tv11
 *   SCREEN_SLUGS_FILE  - VEYA slug listesi dosyası (her satırda bir slug)
 *   CONCURRENCY        - Aynı anda kaç ekran (varsayılan 5, 200 TV için 10 önerilir)
 *
 * Kullanım:
 *   SCREEN_SLUGS=menuslide-tv10,menuslide-tv11 node vps-screenshot-worker.js
 *   SCREEN_SLUGS_FILE=/var/www/menuslide/slugs.txt CONCURRENCY=10 node vps-screenshot-worker.js
 */

const fs = require('fs');
const path = require('path');

const DISPLAY_BASE_URL = process.env.DISPLAY_BASE_URL || 'https://menuslide.com';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/var/www/menuslide/cdn';
const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '5', 10) || 5);

let SLUGS = (process.env.SCREEN_SLUGS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (SLUGS.length === 0 && process.env.SCREEN_SLUGS_FILE) {
  const file = process.env.SCREEN_SLUGS_FILE;
  if (fs.existsSync(file)) {
    SLUGS = fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

async function captureOne(browser, slug) {
  const url = `${DISPLAY_BASE_URL.replace(/\/$/, '')}/display/${encodeURIComponent(slug)}?lite=1`;
  const outputPath = path.join(OUTPUT_DIR, `${slug}.jpg`);
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: outputPath, type: 'jpeg', quality: 90 });
    console.log('[vps-screenshot-worker] OK', slug);
    return true;
  } catch (err) {
    console.error('[vps-screenshot-worker] HATA', slug, err.message);
    return false;
  } finally {
    await page.close();
  }
}

async function runBatch(browser, batch) {
  return Promise.all(batch.map((slug) => captureOne(browser, slug)));
}

async function main() {
  if (SLUGS.length === 0) {
    console.error(
      '[vps-screenshot-worker] Slug yok. SCREEN_SLUGS veya SCREEN_SLUGS_FILE kullanin. Ornek: SCREEN_SLUGS=menuslide-tv10,menuslide-tv11'
    );
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error('[vps-screenshot-worker] OUTPUT_DIR yok:', OUTPUT_DIR);
    process.exit(1);
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('[vps-screenshot-worker] puppeteer yuklu degil: npm install puppeteer');
    process.exit(1);
  }

  console.log('[vps-screenshot-worker] Basladi, slug sayisi:', SLUGS.length, 'paralel:', CONCURRENCY);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  for (let i = 0; i < SLUGS.length; i += CONCURRENCY) {
    const batch = SLUGS.slice(i, i + CONCURRENCY);
    await runBatch(browser, batch);
  }

  await browser.close();
  console.log('[vps-screenshot-worker] Bitti.');
}

main().catch((e) => {
  console.error('[vps-screenshot-worker]', e);
  process.exit(1);
});
