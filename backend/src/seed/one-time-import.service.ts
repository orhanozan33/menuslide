import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Canlıya ilk deployda bir kerelik tüm veriyi (ensure-columns + export SQL) canlı DB'ye aktarır.
 * ONE_TIME_IMPORT=1 (veya true) iken backend açılışında çalışır; _one_time_import_done tablosunda
 * kayıt varsa tekrar çalışmaz.
 */
@Injectable()
export class OneTimeImportService {
  private readonly logger = new Logger(OneTimeImportService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async runIfNeeded(): Promise<void> {
    const enabled = this.config.get('ONE_TIME_IMPORT');
    if (enabled !== '1' && enabled !== 'true') return;

    const client = await this.db.getClient();
    try {
      const alreadyDone = await this.isAlreadyDone(client);
      if (alreadyDone) {
        this.logger.log('Bir kerelik import zaten yapılmış, atlanıyor.');
        return;
      }

      this.logger.log('Bir kerelik import başlatılıyor (ensure-columns + veri)...');
      const sqlDir = this.resolveSqlDir();
      if (!sqlDir) {
        this.logger.warn('SQL klasörü bulunamadı (database/). ONE_TIME_IMPORT atlandı.');
        return;
      }

      await this.ensureTable(client);
      await this.runSqlFile(client, path.join(sqlDir, 'supabase-ensure-columns-before-import.sql'));
      await this.runSqlFile(client, path.join(sqlDir, 'export-from-local-data.sql'));
      await this.markDone(client);
      this.logger.log('Bir kerelik import tamamlandı.');
    } catch (err) {
      this.logger.error('Bir kerelik import hatası: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      client.release();
    }
  }

  private async isAlreadyDone(client: { query: (q: string) => Promise<{ rows: unknown[] }> }): Promise<boolean> {
    try {
      const r = await client.query('SELECT 1 FROM _one_time_import_done LIMIT 1');
      return (r.rows?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  private async ensureTable(client: { query: (q: string) => Promise<unknown> }): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _one_time_import_done (
        id SERIAL PRIMARY KEY,
        done_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  }

  private async markDone(client: { query: (q: string) => Promise<unknown> }): Promise<void> {
    await client.query('INSERT INTO _one_time_import_done DEFAULT VALUES');
  }

  private resolveSqlDir(): string | null {
    const envDir = this.config.get('ONE_TIME_IMPORT_SQL_DIR');
    if (envDir && fs.existsSync(envDir)) return envDir;
    const cwd = process.cwd();
    const candidates = [
      path.join(cwd, 'database'),
      path.join(cwd, '..', 'database'),
      path.join(__dirname, '..', '..', '..', 'database'),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'supabase-ensure-columns-before-import.sql')))
        return dir;
    }
    return null;
  }

  /**
   * SQL dosyasını çalıştırır. Noktalı virgüllere göre böler; $$ içindeki ; atlanır.
   * Hata alan satırlar atlanır (ON_ERROR_STOP=0 davranışı).
   */
  private async runSqlFile(client: { query: (q: string) => Promise<unknown> }, filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`Dosya yok, atlanıyor: ${filePath}`);
      return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const statements = this.splitSqlStatements(content);
    this.logger.log(`${path.basename(filePath)}: ${statements.length} ifade çalıştırılıyor...`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt || stmt.startsWith('--')) continue;
      try {
        await client.query(stmt);
      } catch (err) {
        this.logger.warn(`Satır ~${i + 1} atlandı: ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`);
      }
    }
  }

  private splitSqlStatements(content: string): string[] {
    const out: string[] = [];
    let insideDollar = false;
    let start = 0;
    for (let i = 0; i < content.length; i++) {
      if (content.substr(i, 2) === '$$') {
        insideDollar = !insideDollar;
        i++;
        continue;
      }
      if (!insideDollar && content[i] === ';') {
        const stmt = content.slice(start, i).trim();
        if (stmt) out.push(stmt);
        start = i + 1;
      }
    }
    const last = content.slice(start).trim();
    if (last) out.push(last);
    return out;
  }
}
