/**
 * Yerel public/uploads dosyalarını Supabase Storage'a yükler ve
 * veritabanındaki /uploads/... referanslarını Storage URL'leriyle günceller.
 *
 * Çalıştırma: cd frontend && node -r ./scripts/load-env.js scripts/migrate-uploads-to-supabase.js
 *
 * Gereksinim: .env.local içinde NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'menuslide';
const UPLOAD_PREFIX = 'uploads/migrated';

const ROOT = path.join(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT, 'public', 'uploads');

function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key) {
    console.error('Hata: .env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY (veya NEXT_PUBLIC_SUPABASE_ANON_KEY) olmalı.');
    process.exit(1);
  }
  if (!serviceKey && anonKey) {
    console.log('Not: SUPABASE_SERVICE_ROLE_KEY yok, ANON key kullanılıyor. Storage yükleme için bucket policy gerekebilir.');
  }

  const supabase = createClient(url, key);

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('public/uploads klasörü yok; atlanıyor.');
    return;
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => {
    const full = path.join(UPLOADS_DIR, f);
    return fs.statSync(full).isFile();
  });

  if (files.length === 0) {
    console.log('public/uploads içinde dosya yok; atlanıyor.');
    return;
  }

  console.log(`${files.length} dosya bulundu. Supabase Storage'a yükleniyor...`);

  const pathToUrl = {};
  let uploaded = 0;

  for (const file of files) {
    const localPath = path.join(UPLOADS_DIR, file);
    const storagePath = `${UPLOAD_PREFIX}/${file}`;
    const buffer = fs.readFileSync(localPath);
    const { error } = supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: getMime(file),
      upsert: true,
    });
    if (error) {
      console.error(`  Yükleme hatası ${file}:`, error.message);
      continue;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = data?.publicUrl || '';
    if (publicUrl) {
      pathToUrl[`/uploads/${file}`] = publicUrl;
      pathToUrl[file] = publicUrl;
      uploaded++;
      console.log(`  OK: ${file} -> ${publicUrl.slice(0, 60)}...`);
    }
  }

  console.log(`\n${uploaded}/${files.length} dosya yüklendi. Veritabanı güncelleniyor...`);

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
  const keys = Object.keys(pathToUrl).filter((k) => k.startsWith('/uploads/'));
  if (keys.length === 0) return;

  let total = 0;

  for (const oldPath of keys) {
    const newUrl = pathToUrl[oldPath];
    if (!newUrl) continue;

    const likePattern = oldPath.replace(/%/g, '\\%');
    const likeArg = `%${oldPath}%`;

    const tables = [
      { table: 'templates', column: 'preview_image_url' },
      { table: 'content_library', column: 'url' },
      { table: 'template_block_contents', column: 'image_url' },
      { table: 'template_block_contents', column: 'background_image_url' },
      { table: 'screen_block_contents', column: 'image_url' },
      { table: 'screen_block_contents', column: 'background_image_url' },
    ];

    for (const { table, column } of tables) {
      const { data: rows } = await supabase
        .from(table)
        .select('id,' + column)
        .like(column, likeArg);
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
