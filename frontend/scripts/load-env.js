/**
 * Load .env.local into process.env (simple parser for migration scripts).
 * Tries: frontend/.env.local (from script dir) then cwd/.env.local then cwd/.env
 */
const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '..', '.env.local'),
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env'),
];
let loaded = false;
for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let value = trimmed.slice(eq + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
            value = value.slice(1, -1);
          if (key) process.env[key] = value;
        }
      }
    });
    loaded = true;
    break;
  }
}
if (!loaded) process.env.__ENV_LOAD_FAILED = '1';
