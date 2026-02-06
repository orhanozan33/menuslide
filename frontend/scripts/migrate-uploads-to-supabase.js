/**
 * Yerel public/uploads dosyalarını Supabase Storage'a yükler ve
 * veritabanındaki /uploads/... referanslarını Storage URL'leriyle günceller.
 *
 * Çalıştırma: cd frontend && node -r ./scripts/load-env.js scripts/migrate-uploads-to-supabase.js
 *
 * Gereksinim: .env.local içinde NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (Veritabanı güncellemesi için SERVICE_ROLE zorunludur; anon key ile RLS yüzünden 0 satır güncellenir.)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Env: önce bu script'in bulunduğu frontend/.env.local yükle (node -r load-env ile gelmezse)
const FRONTEND_ROOT = path.join(__dirname, '..');
const ENV_LOCAL = path.join(FRONTEND_ROOT, '.env.local');
if (fs.existsSync(ENV_LOCAL)) {
  const content = fs.readFileSync(ENV_LOCAL, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (t && !t.startsWith('#')) {
      const eq = t.indexOf('=');
      if (eq > 0) {
        const k = t.slice(0, eq).trim();
        let v = t.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (k) process.env[k] = v;
      }
    }
  });
}

const BUCKET = 'menuslide';
const UPLOAD_PREFIX = 'uploads/migrated';

const ROOT = FRONTEND_ROOT;
const UPLOADS_DIR = path.join(ROOT, 'public', 'uploads');

function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) {
    console.error('Hata: NEXT_PUBLIC_SUPABASE_URL tanımlı değil. frontend/.env.local kontrol edin.');
    process.exit(1);
  }
  // Veritabanı güncellemesi RLS nedeniyle sadece service_role ile tüm satırları görür
  if (!serviceKey) {
    console.error('Hata: SUPABASE_SERVICE_ROLE_KEY gerekli (frontend/.env.local). Anon key ile veritabanında 0 satır güncellenir.');
    process.exit(1);
  }
  const key = serviceKey;
  console.log('Service role kullanılıyor; veritabanı güncellemesi yapılacak.');

  const supabase = createClient(url, key);

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('public/uploads klasörü yok; atlanıyor.');
    return;
  }

  /** public/uploads altındaki tüm dosyaları (alt klasörler dahil) listeler; her biri relative path ile döner */
  function listAllFiles(dir, baseDir, out) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(baseDir, full);
      if (e.isFile()) out.push(rel);
      else if (e.isDirectory()) listAllFiles(full, baseDir, out);
    }
  }
  const allRelative = [];
  listAllFiles(UPLOADS_DIR, UPLOADS_DIR, allRelative);

  if (allRelative.length === 0) {
    console.log('public/uploads içinde dosya yok; atlanıyor.');
    return;
  }

  console.log(`${allRelative.length} dosya bulundu. Supabase Storage'a yükleniyor...`);

  const pathToUrl = {};
  let uploaded = 0;

  for (const relativePath of allRelative) {
    const localPath = path.join(UPLOADS_DIR, relativePath);
    const storagePath = `${UPLOAD_PREFIX}/${relativePath}`;
    const buffer = fs.readFileSync(localPath);
    const fileName = path.basename(relativePath);
    const { error } = supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: getMime(fileName),
      upsert: true,
    });
    if (error) {
      console.error(`  Yükleme hatası ${relativePath}:`, error.message);
      continue;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = data?.publicUrl || '';
    if (publicUrl) {
      pathToUrl[`/uploads/${relativePath}`] = publicUrl;
      pathToUrl[`uploads/${relativePath}`] = publicUrl;
      if (!relativePath.includes('/')) pathToUrl[fileName] = publicUrl;
      uploaded++;
      console.log(`  OK: ${relativePath} -> ${publicUrl.slice(0, 60)}...`);
    }
  }

  console.log(`\n${uploaded}/${allRelative.length} dosya yüklendi. Veritabanı güncelleniyor...`);

  if (Object.keys(pathToUrl).length === 0) {
    console.log('Güncellenecek URL eşlemesi yok.');
    return;
  }

  updateDatabase(supabase, pathToUrl);
}

function getMime(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  return mimes[ext] || 'application/octet-stream';
}

async function updateDatabase(supabase, pathToUrl) {
  // Hem /uploads/dosya hem uploads/dosya hem alt yol (uploads/2025-02-06/dosya) ile eşleş
  const keys = Object.keys(pathToUrl).filter(
    (k) => k.startsWith('/uploads/') || k.startsWith('uploads/')
  );
  if (keys.length === 0) return;

  const tables = [
    { table: 'templates', column: 'preview_image_url' },
    { table: 'content_library', column: 'url' },
    { table: 'template_block_contents', column: 'image_url' },
    { table: 'template_block_contents', column: 'background_image_url' },
    { table: 'screen_block_contents', column: 'image_url' },
    { table: 'screen_block_contents', column: 'background_image_url' },
  ];

  // Tanı: her tabloda "/uploads/" içeren kaç satır var (genel pattern; ilk path sadece bir dosya adı)
  const genericPattern = '%/uploads/%';
  console.log('Veritabanı eşleşme kontrolü (pattern: %/uploads/%):');
  let anyMatch = 0;
  for (const { table, column } of tables) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).ilike(column, genericPattern);
    const n = count ?? 0;
    anyMatch += n;
    console.log('  ' + table + '.' + column + ': ' + n + ' satır');
  }
  // canvas_design (JSON) içinde de /uploads/ olabilir
  const { data: canvasRows } = await supabase.from('templates').select('id').not('canvas_design', 'is', null);
  let canvasMatch = 0;
  if (canvasRows && canvasRows.length > 0) {
    const { count } = await supabase.from('templates').select('*', { count: 'exact', head: true }).ilike('canvas_design', genericPattern);
    canvasMatch = count ?? 0;
    console.log('  templates.canvas_design (JSON): ' + canvasMatch + ' satır');
    anyMatch += canvasMatch;
  }
  if (anyMatch === 0) {
    console.log('\nHiç eşleşme yok. Supabase\'deki veri /uploads/... path\'i içermiyor olabilir.');
    console.log('Yerel veritabanındaki şablon/kütüphane verisini Supabase\'e aktarıp tekrar çalıştırın.');
    console.log('Bitti.');
    return;
  }
  console.log('');

  let total = 0;
  for (const oldPath of keys) {
    const newUrl = pathToUrl[oldPath];
    if (!newUrl) continue;

    const likeArgCur = `%${oldPath}%`;

    for (const { table, column } of tables) {
      const { data: rows } = await supabase
        .from(table)
        .select('id,' + column)
        .ilike(column, likeArgCur);
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const val = row[column];
          if (!val || !val.includes(oldPath)) continue;
          const updated = (val === oldPath || val.endsWith(oldPath)) ? newUrl : val.replace(oldPath, newUrl);
          const { error } = await supabase.from(table).update({ [column]: updated }).eq('id', row.id);
          if (error) console.error(`  UPDATE ${table}.${column} ${row.id}:`, error.message);
          else total++;
        }
      }
    }
  }

  const { data: templatesWithCanvas } = await supabase
    .from('templates')
    .select('id, canvas_design')
    .not('canvas_design', 'is', null);
  if (templatesWithCanvas && templatesWithCanvas.length > 0) {
    for (const row of templatesWithCanvas) {
      let json = row.canvas_design;
      if (typeof json !== 'object') continue;
      let str = JSON.stringify(json);
      let changed = false;
      for (const oldPath of keys) {
        const newUrl = pathToUrl[oldPath];
        if (str.includes(oldPath)) {
          str = str.split(oldPath).join(newUrl);
          changed = true;
        }
      }
      if (changed) {
        try {
          const updated = JSON.parse(str);
          const { error } = await supabase.from('templates').update({ canvas_design: updated }).eq('id', row.id);
          if (error) console.error('  UPDATE templates.canvas_design', row.id, error.message);
          else total++;
        } catch (e) {
          console.error('  canvas_design JSON parse hatası', row.id, e.message);
        }
      }
    }
  }

  console.log(`\nToplam ${total} satır güncellendi. Bitti.`);
}

main();
