import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { OneTimeImportService } from './one-time-import.service';

/**
 * Veritabanı boşsa (languages/plans yoksa) başlangıç verisini otomatik oluşturur.
 * Backend ilk açıldığında veya Supabase yeni kurulduğunda tek sefer çalışır.
 * ONE_TIME_IMPORT=1 ise önce bir kerelik tam veri import'u (ensure-columns + export SQL) yapılır.
 */
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly oneTimeImport: OneTimeImportService,
  ) {}

  async onModuleInit() {
    try {
      await this.oneTimeImport.runIfNeeded();
    } catch (err) {
      this.logger.warn('One-time import atlandı: ' + (err instanceof Error ? err.message : String(err)));
    }
    try {
      const needsSeed = await this.isEmpty();
      if (!needsSeed) return;
      this.logger.log('Veritabanı boş: başlangıç verisi otomatik oluşturuluyor...');
      await this.runSeed();
      this.logger.log('Başlangıç verisi oluşturuldu (diller, planlar, demo işletme/menü/ekran).');
    } catch (err) {
      this.logger.warn('Seed atlandı veya hata: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  private async isEmpty(): Promise<boolean> {
    try {
      const r = await this.db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM languages');
      const count = parseInt(r.rows[0]?.count ?? '0', 10);
      return count === 0;
    } catch {
      return false;
    }
  }

  private async runSeed(): Promise<void> {
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');

      // 1) Diller
      await client.query(`
        INSERT INTO languages (code, name, is_default, is_active) VALUES
          ('en', 'English', true, true),
          ('tr', 'Turkish', false, true),
          ('fr', 'French', false, true),
          ('es', 'Spanish', false, true),
          ('de', 'German', false, true),
          ('it', 'Italian', false, true),
          ('pt', 'Portuguese', false, true)
        ON CONFLICT (code) DO NOTHING
      `);

      // 2) Planlar
      await client.query(`
        INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, is_active) VALUES
          ('basic', '1 Screen', 1, 14.99, 152.90, true),
          ('pro', '5 Screens', 5, 74.95, 764.49, true),
          ('enterprise', 'Enterprise', -1, 149.99, 1529.89, true)
        ON CONFLICT (name) DO NOTHING
      `);

      // 3) contact_info (tablo varsa)
      try {
        await client.query(`
          INSERT INTO contact_info (id, email, phone, address, whatsapp)
          VALUES ('00000000-0000-0000-0000-000000000001'::uuid, '', '', '', '')
          ON CONFLICT (id) DO NOTHING
        `);
      } catch {
        /* tablo yoksa atla */
      }

      // 4) Demo işletme
      await client.query(`
        INSERT INTO businesses (id, name, slug, is_active, created_at, updated_at)
        VALUES (
          'a0000001-0001-0001-0001-000000000001'::uuid,
          'Demo İşletme',
          'demo-isletme',
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `);

      // 5) Demo menü
      await client.query(`
        INSERT INTO menus (id, business_id, name, description, slide_duration, is_active)
        SELECT
          'b0000001-0001-0001-0001-000000000001'::uuid,
          id,
          'Demo Menü',
          'Başlangıç menüsü',
          5,
          true
        FROM businesses
        WHERE slug = 'demo-isletme' OR id = 'a0000001-0001-0001-0001-000000000001'::uuid
        LIMIT 1
        ON CONFLICT (id) DO NOTHING
      `);

      // 6) Demo ekran
      await client.query(`
        INSERT INTO screens (id, business_id, name, public_token, public_slug, is_active, animation_type, animation_duration)
        SELECT
          'c0000001-0001-0001-0001-000000000001'::uuid,
          b.id,
          'TV 1',
          'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          'demo-tv1',
          true,
          'fade',
          500
        FROM businesses b
        WHERE b.slug = 'demo-isletme' OR b.id = 'a0000001-0001-0001-0001-000000000001'::uuid
        LIMIT 1
        ON CONFLICT (id) DO NOTHING
      `);

      // 7) Ekran–menü bağlantısı
      await client.query(`
        INSERT INTO screen_menu (screen_id, menu_id, display_order)
        SELECT s.id, m.id, 0
        FROM screens s
        JOIN businesses b ON s.business_id = b.id
        JOIN menus m ON m.business_id = b.id
        WHERE (b.slug = 'demo-isletme' OR b.id = 'a0000001-0001-0001-0001-000000000001'::uuid)
          AND (s.public_slug = 'demo-tv1' OR s.id = 'c0000001-0001-0001-0001-000000000001'::uuid)
          AND m.name = 'Demo Menü'
        LIMIT 1
        ON CONFLICT (screen_id, menu_id) DO NOTHING
      `);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }
}
