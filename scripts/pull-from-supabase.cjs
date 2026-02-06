/**
 * Canlı (Supabase) veritabanından yerel PostgreSQL'e veri kopyalar.
 * Böylece yerelde kontrol yaparken canlıdaki veriyi kullanabilirsiniz; sürekli push gerekmez.
 *
 * Kullanım:
 *   export SUPABASE_DB_PASSWORD='canli_db_sifresi'
 *   ./scripts/pull-from-supabase.sh
 *
 * Gereksinim: backend/.env (yerel DB), frontend/.env.local (Supabase URL)
 */
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// FK sırası: önce truncate (child -> parent), sonra insert (parent -> child)
const TRUNCATE_ORDER = [
  'screen_edit_history', 'admin_activity_log', 'admin_permissions', 'payment_failures',
  'display_viewers', 'screen_template_rotations', 'home_channels', 'contact_info',
  'content_library', 'content_library_categories', 'screen_block_contents', 'template_block_contents',
  'screen_blocks', 'template_blocks', 'screen_menu', 'menu_schedules', 'screens',
  'menu_item_translations', 'menu_items', 'menus', 'payments', 'subscriptions',
  'templates', 'plans', 'languages', 'users', 'businesses', 'registration_requests',
];
const INSERT_ORDER = [
  'businesses', 'users', 'menus', 'menu_items', 'languages', 'menu_item_translations',
  'plans', 'subscriptions', 'payments', 'templates', 'template_blocks', 'screens',
  'screen_menu', 'menu_schedules', 'screen_blocks', 'template_block_contents', 'screen_block_contents',
  'content_library', 'content_library_categories', 'contact_info', 'home_channels',
  'screen_template_rotations', 'display_viewers', 'payment_failures', 'admin_permissions',
  'admin_activity_log', 'screen_edit_history', 'registration_requests',
];

function escape(val) {
  if (val === null) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (val instanceof Date) return "'" + val.toISOString().replace(/T/, ' ').replace(/\.\d{3}Z$/, '+00') + "'";
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val);
  if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
  return "'" + String(val).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_DB_HOST || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePassword = process.env.SUPABASE_DB_PASSWORD;
  if (!supabasePassword) {
    console.error('HATA: SUPABASE_DB_PASSWORD tanımlı değil. export SUPABASE_DB_PASSWORD=\'sifre\'');
    process.exit(1);
  }
  let supabaseHost = process.env.SUPABASE_DB_HOST;
  if (!supabaseHost && supabaseUrl) {
    const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
    supabaseHost = match ? `db.${match[1]}.supabase.co` : null;
  }
  if (!supabaseHost) {
    console.error('HATA: Supabase host yok. frontend/.env.local içinde NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_DB_HOST gerekli.');
    process.exit(1);
  }

  const supabase = new Client({
    host: supabaseHost,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: supabasePassword,
    ssl: { rejectUnauthorized: false },
  });

  const local = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'tvproje',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    await supabase.connect();
    console.log('Supabase (canlı) bağlantısı OK');
    await local.connect();
    console.log('Yerel DB bağlantısı OK\n');

    // 1) Yerel tabloları temizle (varsa)
    console.log('Yerel tablolar temizleniyor...');
    for (const table of TRUNCATE_ORDER) {
      try {
        await local.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        console.log('  ' + table + ' truncate OK');
      } catch (e) {
        if (e.code === '42P01') {
          console.log('  ' + table + ' (tablo yok, atla)');
        } else {
          console.warn('  ' + table + ':', e.message);
        }
      }
    }

    // 2) Supabase'den oku, yerele yaz
    console.log('\nCanlıdan veri kopyalanıyor...');
    let totalRows = 0;
    for (const table of INSERT_ORDER) {
      try {
        const res = await supabase.query(`SELECT * FROM ${table}`);
        const rows = res.rows || [];
        if (rows.length === 0) {
          console.log('  ' + table + ': 0 satır');
          continue;
        }
        const cols = res.fields.map((f) => f.name);
        const colList = cols.join(', ');
        const hasId = cols.includes('id');
        let conflictClause = '';
        if (table === 'users' && cols.includes('email')) conflictClause = ' ON CONFLICT (email) DO NOTHING';
        else if (table === 'languages' && cols.includes('code')) conflictClause = ' ON CONFLICT (code) DO NOTHING';
        else if (table === 'plans' && cols.includes('name')) conflictClause = ' ON CONFLICT (name) DO NOTHING';
        else if (hasId) conflictClause = ' ON CONFLICT (id) DO NOTHING';

        for (const row of rows) {
          const vals = cols.map((c) => escape(row[c]));
          await local.query(`INSERT INTO ${table} (${colList}) VALUES (${vals.join(', ')})${conflictClause}`);
        }
        totalRows += rows.length;
        console.log('  ' + table + ': ' + rows.length + ' satır');
      } catch (e) {
        if (e.code === '42P01') {
          console.log('  ' + table + ': tablo yok (Supabase veya yerel), atla');
        } else {
          console.error('  ' + table + ' HATA:', e.message);
        }
      }
    }

    console.log('\nToplam kopyalanan: ' + totalRows + ' satır.');
    console.log('Yerel DB canlı verisi ile güncellendi. Frontend\'i yerel backend + yerel DB ile çalıştırabilirsiniz.');
  } finally {
    await supabase.end();
    await local.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
