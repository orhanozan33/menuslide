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

/** API'den döngü süresini al (templateRotations display_duration toplamı). Kesilme olmasın. */
async function getCycleDurationSeconds(slug) {
  const base = DISPLAY_BASE_URL.replace(/\/$/, '');
  const url = `${base}/api/public-screen/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return RECORD_SECONDS;
    const data = await res.json();
    const rotations = data.templateRotations;
    if (!Array.isArray(rotations) || rotations.length === 0) return RECORD_SECONDS;
    const total = rotations.reduce((s, r) => s + Math.max(1, Number(r.display_duration) || 30), 0);
    const sec = Math.max(30, Math.min(600, Math.max(RECORD_SECONDS, total)));
    console.log('[vps-video-worker] Dongu suresi:', total, 'sn, kayit:', sec, 'sn (slug:', slug, ')');
    return sec;
  } catch (e) {
    console.warn('[vps-video-worker] Dongu suresi alinamadi, varsayilan', RECORD_SECONDS, 'sn:', e.message);
    return RECORD_SECONDS;
  }
}

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

/** Overlap ile loop.mp4: ilk N sn sona eklenir */
/** Son overlapSec saniyeyi videonun ilk overlapSec saniyesiyle degistirir; toplam sure ayni, kararma yok, sonsuz dongu. */
function fallbackLoopMp4(mp4Path, dur, loopMp4, overlapSec) {
  const tail = Math.max(0.5, dur - overlapSec);
  const filter = `[0:v]split=2[main][dup];[main]trim=0:${tail.toFixed(2)},setpts=PTS-STARTPTS[main2];[dup]trim=0:${Math.min(overlapSec, dur).toFixed(2)},setpts=PTS-STARTPTS[first];[main2][first]concat=n=2:v=1[out]`;
  runFfmpeg(
    [
      '-y',
      '-i', mp4Path,
      '-filter_complex', filter,
      '-map', '[out]',
      '-c:v', 'libx264',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-pix_fmt', 'yuv420p',
      '-g', '30',
      '-keyint_min', '30',
      '-movflags', '+faststart',
      loopMp4,
    ],
    'MP4 -> loop.mp4 (kesintisiz dongu)'
  );
  if (fs.existsSync(loopMp4)) {
    console.log('[vps-video-worker] Roku loop.mp4 hazir:', loopMp4, '| sure:', dur.toFixed(1), 'sn');
  }
}

async function recordOne(browser, slug) {
  const recordSeconds = await getCycleDurationSeconds(slug);
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

    // Birlestirme yok: sadece tek parca (max 180 sn) veya kare kare. Kullanici limiti: max 6 template x 30 sn = 180 sn.
    const MAX_SINGLE_RECORD_SEC = 180;
    let mp4Done = false;

    if (recordSeconds <= MAX_SINGLE_RECORD_SEC) {
      try {
        const PuppeteerScreenRecorder = require('puppeteer-screen-recorder').PuppeteerScreenRecorder;
        const recorder = new PuppeteerScreenRecorder(page, {
          followNewTab: false,
          videoFrame: { width: 1920, height: 1080 },
          recordDurationLimit: recordSeconds,
        });
        await recorder.start(mp4Path);
        await new Promise((r) => setTimeout(r, (recordSeconds + 2) * 1000));
        await recorder.stop();
        mp4Done = fs.existsSync(mp4Path) && fs.statSync(mp4Path).size > 1000;
        if (mp4Done) console.log('[vps-video-worker] Tek parca kayit:', recordSeconds, 'sn');
      } catch (e) {
        console.warn('[vps-video-worker] puppeteer-screen-recorder kullanilamadi, kare yakalama kullaniliyor:', e.message);
      }
    }

    if (!mp4Done) {
      if (recordSeconds > MAX_SINGLE_RECORD_SEC) {
        console.warn('[vps-video-worker] Dongu', recordSeconds, 'sn >', MAX_SINGLE_RECORD_SEC, 'sn; tek parca limit asildi, kare yakalama kullaniliyor. Oneri: max 6 template x 30 sn = 180 sn.');
      }
      console.log('[vps-video-worker] Kare yakalama ile kayit (', recordSeconds, 'sn)');
      const FPS = 2;
      const totalFrames = recordSeconds * FPS;
      for (let i = 0; i < totalFrames; i++) {
        const framePath = path.join(framesDir, `frame${String(i + 1).padStart(4, '0')}.jpg`);
        await page.screenshot({ path: framePath, type: 'jpeg', quality: 85 });
        await new Promise((r) => setTimeout(r, 1000 / FPS));
      }
      runFfmpeg(
        ['-y', '-framerate', String(FPS), '-i', path.join(framesDir, 'frame%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-g', String(Math.max(2, FPS)), '-t', String(recordSeconds), mp4Path],
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

    // Roku icin loop.mp4: reklam yok; son 5 sn = ilk 5 sn (uzatma), kararma yok, sonsuz dongu
    const loopMp4 = path.join(outDir, 'loop.mp4');
    try {
      const durOut = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp4Path}"`,
        { encoding: 'utf8', maxBuffer: 4096 }
      );
      const dur = parseFloat(durOut.trim());
      fallbackLoopMp4(mp4Path, dur, loopMp4, 5.0);
    } catch (e) {
      console.warn('[vps-video-worker] loop.mp4 olusturulamadi:', e.message);
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
    'kayit suresi: API dongu suresi (min',
    RECORD_SECONDS,
    'sn), paralel:',
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
