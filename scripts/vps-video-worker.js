#!/usr/bin/env node
/**
 * VPS Video Worker — Web sayfasını video (HLS) olarak kaydeder, Roku/Android TV'de oynatılır.
 *
 * Akış: Puppeteer sayfayı açar → 30 sn kayıt (MP4) → FFmpeg ile HLS'e çevir → /stream/{slug}/ altına yazar.
 *
 * Gerekli env:
 *   DISPLAY_BASE_URL   - Örn. https://menuslide.com
 *   STREAM_OUTPUT_DIR  - HLS çıktı dizini (örn. /var/www/menuslide/stream)
 *   SCREEN_SLUGS       - Virgülle ayrılmış slug'lar: menuslide-tv10,menuslide-tv11
 *   SCREEN_SLUGS_FILE  - VEYA her satırda bir slug olan dosya yolu
 *   RECORD_SECONDS     - Kayıt süresi saniye (varsayılan 30)
 *   CONCURRENCY        - Aynı anda kaç ekran (varsayılan 1; video ağır)
 *
 * Sunucuda gerekli: ffmpeg (apt install ffmpeg), Node, puppeteer, puppeteer-screen-recorder
 *
 * Kullanım:
 *   SCREEN_SLUGS=menuslide-tv10 STREAM_OUTPUT_DIR=/var/www/menuslide/stream node vps-video-worker.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const os = require('os');

const DISPLAY_BASE_URL = process.env.DISPLAY_BASE_URL || 'https://menuslide.com';
const STREAM_OUTPUT_DIR = process.env.STREAM_OUTPUT_DIR || '/var/www/menuslide/stream';
const RECORD_SECONDS = Math.max(5, parseInt(process.env.RECORD_SECONDS || '30', 10) || 30);
const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '1', 10) || 1);

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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runFfmpeg(args, description) {
  try {
    execFileSync('ffmpeg', args, {
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 * 50,
    });
  } catch (e) {
    throw new Error(`${description}: ${e.message || e.stderr?.toString() || e}`);
  }
}

async function recordOne(browser, slug) {
  const url = `${DISPLAY_BASE_URL.replace(/\/$/, '')}/display/${encodeURIComponent(slug)}?lite=1`;
  const outDir = path.join(STREAM_OUTPUT_DIR, slug);
  const tmpDir = path.join(os.tmpdir(), `menuslide-video-${slug}-${Date.now()}`);
  const mp4Path = path.join(tmpDir, 'output.mp4');
  const hlsDir = path.join(tmpDir, 'hls');

  ensureDir(tmpDir);
  ensureDir(hlsDir);
  ensureDir(outDir);

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const framesDir = path.join(tmpDir, 'frames');
    ensureDir(framesDir);

    let mp4Done = false;
    try {
      const PuppeteerScreenRecorder = require('puppeteer-screen-recorder').PuppeteerScreenRecorder;
      const recorder = new PuppeteerScreenRecorder(page, {
        followNewTab: false,
        videoFrame: { width: 1920, height: 1080 },
        recordDurationLimit: RECORD_SECONDS,
      });
      await recorder.start(mp4Path);
      await new Promise((r) => setTimeout(r, (RECORD_SECONDS + 2) * 1000));
      await recorder.stop();
      mp4Done = fs.existsSync(mp4Path) && fs.statSync(mp4Path).size > 1000;
    } catch (e) {
      console.warn('[vps-video-worker] puppeteer-screen-recorder kullanilamadi, kare yakalama kullaniliyor:', e.message);
    }

    if (!mp4Done) {
      // Fallback: saniyede 2 kare screenshot, FFmpeg ile MP4
      const FPS = 2;
      const totalFrames = RECORD_SECONDS * FPS;
      for (let i = 0; i < totalFrames; i++) {
        const framePath = path.join(framesDir, `frame${String(i + 1).padStart(4, '0')}.jpg`);
        await page.screenshot({ path: framePath, type: 'jpeg', quality: 85 });
        await new Promise((r) => setTimeout(r, 1000 / FPS));
      }
      runFfmpeg(
        ['-y', '-framerate', String(FPS), '-i', path.join(framesDir, 'frame%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', String(RECORD_SECONDS), mp4Path],
        'Frames -> MP4'
      );
    }

    if (!fs.existsSync(mp4Path) || fs.statSync(mp4Path).size < 1000) {
      console.error('[vps-video-worker] MP4 olusmadi:', slug);
      return false;
    }

    // FFmpeg: MP4 -> HLS (playlist.m3u8 + segment*.ts)
    const hlsPlaylist = path.join(hlsDir, 'playlist.m3u8');
    const segmentPattern = path.join(hlsDir, 'segment%03d.ts');
    runFfmpeg(
      [
        '-y',
        '-i', mp4Path,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-hls_time', '2',
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', segmentPattern,
        hlsPlaylist,
      ],
      'MP4 -> HLS'
    );

    if (!fs.existsSync(hlsPlaylist)) {
      console.error('[vps-video-worker] HLS playlist olusmadi:', slug);
      return false;
    }

    // Mevcut HLS dosyalarını silip yenilerini kopyala
    const existing = fs.readdirSync(outDir);
    for (const f of existing) {
      fs.unlinkSync(path.join(outDir, f));
    }
    const hlsFiles = fs.readdirSync(hlsDir);
    for (const f of hlsFiles) {
      fs.copyFileSync(path.join(hlsDir, f), path.join(outDir, f));
    }

    console.log('[vps-video-worker] OK', slug, '->', path.join(outDir, 'playlist.m3u8'));
    return true;
  } catch (err) {
    console.error('[vps-video-worker] HATA', slug, err.message);
    return false;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
    await page.close();
  }
}

async function main() {
  if (SLUGS.length === 0) {
    console.error(
      '[vps-video-worker] Slug yok. SCREEN_SLUGS veya SCREEN_SLUGS_FILE kullanin. Ornek: SCREEN_SLUGS=menuslide-tv10'
    );
    process.exit(1);
  }

  if (!fs.existsSync(STREAM_OUTPUT_DIR)) {
    console.error('[vps-video-worker] STREAM_OUTPUT_DIR yok:', STREAM_OUTPUT_DIR);
    process.exit(1);
  }

  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch (e) {
    console.error('[vps-video-worker] ffmpeg bulunamadi. Sunucuda: apt install ffmpeg');
    process.exit(1);
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('[vps-video-worker] puppeteer yuklu degil: npm install puppeteer');
    process.exit(1);
  }

  console.log(
    '[vps-video-worker] Basladi, slug sayisi:',
    SLUGS.length,
    'kayit suresi:',
    RECORD_SECONDS,
    'sn, paralel:',
    CONCURRENCY
  );

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ],
  });

  for (let i = 0; i < SLUGS.length; i += CONCURRENCY) {
    const batch = SLUGS.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((slug) => recordOne(browser, slug)));
  }

  await browser.close();
  console.log('[vps-video-worker] Bitti.');
}

main().catch((e) => {
  console.error('[vps-video-worker]', e);
  process.exit(1);
});
