/**
 * Slide görselleri nereden gelir?
 * Bu script: Display sayfasını (her şablon için) screenshot alıp DigitalOcean Spaces'e yükler.
 * Böylece "slide görselleri" otomatik üretilir: slides/{screen_id}/{template_id}.jpg
 *
 * Gereksinim: puppeteer, @supabase/supabase-js, @aws-sdk/client-s3
 * cd frontend && npm install @aws-sdk/client-s3
 *
 * Env (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_BUCKET=menuslide-signage, DO_SPACES_REGION=tor1
 *   NEXT_PUBLIC_APP_URL=https://menuslide.com
 *
 * Çalıştır: cd frontend && node -r ./scripts/load-env.js scripts/export-slides-to-spaces.js [screen_id]
 * screen_id verilmezse tüm aktif ekranlar için export eder.
 */

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://menuslide.com').replace(/\/$/, '');
if (appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
  appUrl = 'https://menuslide.com';
  console.log('localhost kullanılamıyor, canlı site kullanılıyor:', appUrl);
}
const doKey = (process.env.DO_SPACES_KEY || '').trim();
const doSecret = (process.env.DO_SPACES_SECRET || '').trim();
const doBucket = (process.env.DO_SPACES_BUCKET || 'menuslide-signage').trim();
const doRegion = (process.env.DO_SPACES_REGION || 'tor1').trim();
const doEndpoint = `https://${doRegion}.digitaloceanspaces.com`;

if (!supabaseUrl || !supabaseKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
  process.exit(1);
}
if (!doKey || !doSecret) {
  console.error('DO_SPACES_KEY ve DO_SPACES_SECRET gerekli. DigitalOcean → API → Spaces Keys.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
// DO Spaces: AWS SDK v3 ile region 'us-east-1' kullan (endpoint yönlendirir)
const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: doEndpoint,
  credentials: { accessKeyId: doKey, secretAccessKey: doSecret },
  forcePathStyle: false,
});

async function captureScreenshot(url) {
  const puppeteer = await import('puppeteer').catch(() => null);
  if (!puppeteer?.default) {
    console.error('puppeteer yüklü değil: npm install puppeteer');
    return null;
  }
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2500));
    const buffer = await page.screenshot({ type: 'jpeg', quality: 90 });
    return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}

async function uploadToSpaces(screenId, templateId, buffer) {
  const key = `slides/${screenId}/${templateId}.jpg`;
  await s3.send(
    new PutObjectCommand({
      Bucket: doBucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    })
  );
  return key;
}

async function main() {
  const screenIdFilter = process.argv[2] || null;

  const { data: screens, error: screensError } = await supabase
    .from('screens')
    .select('id, public_slug, public_token, broadcast_code')
    .eq('is_active', true);

  if (screensError || !screens?.length) {
    console.error('Aktif ekran bulunamadı:', screensError?.message || '');
    process.exit(1);
  }

  let list = screens;
  if (screenIdFilter) {
    list = screens.filter((s) => s.id === screenIdFilter);
    if (!list.length) {
      console.error('Ekran bulunamadı:', screenIdFilter);
      process.exit(1);
    }
  }

  for (const screen of list) {
    const slug = screen.public_slug || screen.public_token || screen.broadcast_code;
    if (!slug) {
      console.warn('Ekran slug yok, atlanıyor:', screen.id);
      continue;
    }

    const { data: rotations, error: rotError } = await supabase
      .from('screen_template_rotations')
      .select('template_id, full_editor_template_id, display_order')
      .eq('screen_id', screen.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (rotError || !rotations?.length) {
      console.warn('Rotasyon yok:', screen.id);
      continue;
    }

    console.log('Ekran:', screen.id, 'slug:', slug, 'slide sayısı:', rotations.length);

    for (let i = 0; i < rotations.length; i++) {
      const r = rotations[i];
      const templateId = r.full_editor_template_id || r.template_id;
      if (!templateId) continue;

      const url = `${appUrl}/display/${encodeURIComponent(String(slug))}?lite=1&rotationIndex=${i}`;
      console.log('  Screenshot:', url);
      const buffer = await captureScreenshot(url);
      if (!buffer) {
        console.warn('    Screenshot alınamadı');
        continue;
      }
      const key = await uploadToSpaces(screen.id, templateId, buffer);
      console.log('    Yüklendi:', key);
    }
  }

  console.log('Bitti.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
