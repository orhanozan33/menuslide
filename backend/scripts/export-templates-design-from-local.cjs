/**
 * Yerel DB'den sadece şablon, blok ve tasarım sistemi tablolarını export eder.
 * Çıktı: INSERT ... ON CONFLICT (id) DO UPDATE ile Supabase'e güvenli upsert.
 * Kullanım: backend dizininden node scripts/export-templates-design-from-local.cjs
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// FK sırası: önce referanslanan (plans, languages, categories), sonra templates, blocks, contents
const TABLES = [
  'plans',
  'languages',
  'content_library_categories',
  'content_library',
  'templates',
  'template_blocks',
  'template_block_contents',
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
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'tvproje',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  const outPath = path.join(__dirname, '../../database/export-templates-design-from-local.sql');
  const lines = [
    '-- Şablon, blok ve tasarım sistemi (yerelden Supabase upsert)',
    '-- Üretilen: backend/scripts/export-templates-design-from-local.cjs',
    '',
  ];

  try {
    await client.connect();
    console.log('Yerel DB bağlandı. Şablon/blok/tasarım tabloları export ediliyor...\n');

    for (const table of TABLES) {
      try {
        const res = await client.query(`SELECT * FROM ${table}`);
        const rows = res.rows || [];
        const cols = res.fields.map((f) => f.name);
        const colList = cols.join(', ');
        const hasId = cols.includes('id');

        if (rows.length === 0) {
          console.log(`  ${table}: 0 satır (atla)`);
          continue;
        }

        lines.push(`-- ${table} (${rows.length} satır)`);
        const setClause = cols.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`).join(', ');

        let conflictClause = '';
        if (table === 'languages' && cols.includes('code')) {
          conflictClause = ` ON CONFLICT (code) DO UPDATE SET ${setClause}`;
        } else if (table === 'plans' && cols.includes('name')) {
          conflictClause = ` ON CONFLICT (name) DO UPDATE SET ${setClause}`;
        } else if (table === 'template_blocks' && cols.includes('template_id') && cols.includes('block_index')) {
          conflictClause = ` ON CONFLICT (template_id, block_index) DO UPDATE SET ${setClause}`;
        } else if (hasId) {
          conflictClause = ` ON CONFLICT (id) DO UPDATE SET ${setClause}`;
        }

        for (const row of rows) {
          const vals = cols.map((c) => escape(row[c]));
          lines.push(`INSERT INTO ${table} (${colList}) VALUES (${vals.join(', ')})${conflictClause};`);
        }
        lines.push('');
        console.log(`  ${table}: ${rows.length} satır`);
      } catch (e) {
        if (e.code === '42P01') {
          console.log(`  ${table}: tablo yok (atla)`);
        } else {
          console.error(`  ${table}:`, e.message);
        }
      }
    }

    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
    console.log('\nYazıldı:', outPath);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
