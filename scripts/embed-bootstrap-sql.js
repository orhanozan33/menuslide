const fs = require('fs');
const path = require('path');
const sqlPath = process.argv[2];
const outPath = process.argv[3];
if (!sqlPath || !outPath) {
  console.error('Usage: node embed-bootstrap-sql.js <input.sql> <output.ts>');
  process.exit(1);
}
const sql = fs.readFileSync(path.resolve(sqlPath), 'utf8');
const escaped = sql
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');
const ts = `// Auto-generated. Do not edit. Run ./scripts/build-supabase-bootstrap.sh to regenerate.\nexport const bootstrapSql = \`${escaped}\`;\n`;
fs.writeFileSync(path.resolve(outPath), ts);
