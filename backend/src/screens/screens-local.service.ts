import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { randomBytes } from 'crypto';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { AssignMenuDto } from './dto/assign-menu.dto';
import { PublishTemplatesDto } from './dto/publish-templates.dto';

@Injectable()
export class ScreensLocalService {
  constructor(private database: DatabaseService) {}

  /**
   * Generate unique public token for screen
   */
  private generatePublicToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate unique 5-digit broadcast code (e.g. 12345) for TV app.
   * Kullanıcı bu kodu TV uygulamasına girince ilgili ekran açılır.
   */
  private async generateBroadcastCode(): Promise<string> {
    for (let attempt = 0; attempt < 100; attempt++) {
      const code = String(10000 + Math.floor(Math.random() * 90000));
      const result = await this.database.query(
        'SELECT 1 FROM screens WHERE broadcast_code = $1',
        [code]
      );
      if (result.rows.length === 0) return code;
    }
    return String(Date.now() % 90000 + 10000);
  }

  /**
   * Generate slug from screen name
   */
  private generateSlug(name: string): string {
    // Türkçe karakterleri İngilizce'ye çevir
    const turkishMap: { [key: string]: string } = {
      'ç': 'c', 'Ç': 'c',
      'ğ': 'g', 'Ğ': 'g',
      'ı': 'i', 'İ': 'i',
      'ö': 'o', 'Ö': 'o',
      'ş': 's', 'Ş': 's',
      'ü': 'u', 'Ü': 'u',
    };

    let slug = name
      .split('')
      .map(char => turkishMap[char] || char)
      .join('')
      .toLowerCase()
      .trim()
      // Özel karakterleri kaldır, sadece harf, rakam ve boşluk bırak
      .replace(/[^a-z0-9\s-]/g, '')
      // Birden fazla boşluğu tek boşluğa çevir
      .replace(/\s+/g, ' ')
      // Boşlukları tire ile değiştir
      .replace(/\s/g, '-')
      // Birden fazla tireyi tek tireye çevir
      .replace(/-+/g, '-')
      // Başta ve sonda tire varsa kaldır
      .replace(/^-+|-+$/g, '');

    // Eğer slug boşsa, varsayılan bir slug oluştur
    if (!slug) {
      slug = 'screen-' + Date.now().toString(36);
    }

    return slug;
  }

  /**
   * Generate unique slug (check for duplicates and append number if needed)
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    let baseSlug = this.generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    // Slug'ın benzersiz olduğundan emin ol
    while (true) {
      const result = await this.database.query(
        'SELECT id FROM screens WHERE public_slug = $1',
        [slug]
      );

      if (result.rows.length === 0) {
        return slug;
      }

      // Eğer slug mevcutsa, sonuna sayı ekle
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Check if business has an active subscription (status active and period not ended).
   */
  async isBusinessSubscriptionActive(businessId: string): Promise<boolean> {
    const result = await this.database.query(
      `SELECT 1 FROM subscriptions s
       INNER JOIN plans p ON s.plan_id = p.id AND p.max_screens > 0
       WHERE s.business_id = $1
         AND s.status = 'active'
         AND (s.current_period_end IS NULL OR s.current_period_end >= NOW())`,
      [businessId]
    );
    return result.rows.length > 0;
  }

  /**
   * Stop all screens for a business (set is_active = false). Used when subscription expires.
   */
  async stopAllScreensForBusiness(businessId: string): Promise<void> {
    await this.database.query(
      'UPDATE screens SET is_active = false WHERE business_id = $1',
      [businessId]
    );
    await this.database.query(
      `UPDATE screen_template_rotations str SET is_active = false
       FROM screens s WHERE s.business_id = $1 AND str.screen_id = s.id`,
      [businessId]
    );
  }

  /**
   * Reactivate all screens and their template rotations for a business.
   * Used when subscription becomes active again (payment received / mark paid).
   * Previously published templates will broadcast again without re-publishing.
   */
  async reactivateScreensForBusiness(businessId: string): Promise<void> {
    await this.database.query(
      'UPDATE screens SET is_active = true WHERE business_id = $1',
      [businessId]
    );
    await this.database.query(
      `UPDATE screen_template_rotations str SET is_active = true
       FROM screens s WHERE s.business_id = $1 AND str.screen_id = s.id`,
      [businessId]
    );
  }

  /**
   * Get user's business_id
   */
  private async getUserBusinessId(userId: string, userRole: string): Promise<string | null> {
    if (userRole === 'super_admin') {
      return null;
    }

    const result = await this.database.query(
      'SELECT business_id FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0]?.business_id || null;
  }

  /**
   * Check if user has access to a business
   */
  private async checkBusinessAccess(businessId: string, userId: string, userRole: string) {
    if (userRole === 'super_admin') {
      return true;
    }

    const userBusinessId = await this.getUserBusinessId(userId, userRole);
    if (userBusinessId !== businessId) {
      throw new ForbiddenException('Access denied to this business');
    }
  }

  /**
   * Create a new screen
   */
  async create(createScreenDto: CreateScreenDto, userId: string, userRole: string) {
    await this.checkBusinessAccess(createScreenDto.business_id, userId, userRole);

    const publicToken = this.generatePublicToken();
    const broadcastCode = await this.generateBroadcastCode();
    // Business bilgisini al
    const businessResult = await this.database.query(
      'SELECT name FROM businesses WHERE id = $1',
      [createScreenDto.business_id]
    );
    const businessName = businessResult.rows[0]?.name || 'business';
    // Slug formatı: business-name-screen-name (örn: metro-pizza-tv3)
    const combinedName = `${businessName} ${createScreenDto.name}`;
    const publicSlug = await this.generateUniqueSlug(combinedName);

    const screenData = {
      ...createScreenDto,
      public_token: publicToken,
      public_slug: publicSlug,
      broadcast_code: broadcastCode,
      animation_type: createScreenDto.animation_type || 'fade',
      animation_duration: createScreenDto.animation_duration || 500,
    };

    const result = await this.database.query(
      `INSERT INTO screens (
        business_id, name, location, public_token, public_slug, broadcast_code, is_active,
        animation_type, animation_duration, language_code,
        font_family, primary_color, background_style, background_color,
        background_image_url, logo_url, template_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        screenData.business_id,
        screenData.name,
        screenData.location || null,
        screenData.public_token,
        screenData.public_slug,
        screenData.broadcast_code,
        screenData.is_active ?? true,
        screenData.animation_type,
        screenData.animation_duration,
        screenData.language_code || null,
        screenData.font_family || null,
        screenData.primary_color || null,
        screenData.background_style || null,
        screenData.background_color || null,
        screenData.background_image_url || null,
        screenData.logo_url || null,
        screenData.template_id || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Create missing screens for a business (used when plan is assigned by admin).
   * Ensures the business has exactly maxScreens screens (TV1, TV2, ...).
   * Numara mevcut en yüksek TV numarasından devam eder (yeni ekranlar TV4, TV5...).
   * No user access check - internal use only.
   */
  async createScreensForBusiness(businessId: string, maxScreens: number): Promise<void> {
    if (maxScreens < 1) return;

    const countResult = await this.database.query(
      'SELECT COUNT(*) as count FROM screens WHERE business_id = $1',
      [businessId]
    );
    const currentCount = parseInt(countResult.rows[0].count, 10);
    const toCreate = maxScreens - currentCount;
    if (toCreate <= 0) return;

    // Mevcut ekran isimlerindeki en yüksek TV numarasını bul (TV1,TV2,TV3 -> 3; boşsa 0)
    const maxNumResult = await this.database.query(
      `SELECT COALESCE(MAX((SUBSTRING(name FROM 'TV([0-9]+)'))::int), 0) as max_num
       FROM screens WHERE business_id = $1`,
      [businessId]
    );
    const nextNumber = (maxNumResult.rows[0]?.max_num ?? 0) + 1;

    const businessResult = await this.database.query(
      'SELECT name FROM businesses WHERE id = $1',
      [businessId]
    );
    const businessName = businessResult.rows[0]?.name || 'business';

    for (let i = 0; i < toCreate; i++) {
      const screenNumber = nextNumber + i;
      const name = `TV${screenNumber}`;
      const publicToken = this.generatePublicToken();
      const broadcastCode = await this.generateBroadcastCode();
      const combinedName = `${businessName} ${name}`;
      const publicSlug = await this.generateUniqueSlug(combinedName);

      await this.database.query(
        `INSERT INTO screens (
          business_id, name, location, public_token, public_slug, broadcast_code, is_active,
          animation_type, animation_duration, language_code,
          font_family, primary_color, background_style, background_color,
          background_image_url, logo_url, template_id
        ) VALUES ($1, $2, NULL, $3, $4, $5, true, 'fade', 500, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
        [businessId, name, publicToken, publicSlug, broadcastCode]
      );
    }
  }

  /**
   * Son 2 dakikada heartbeat atan cihaz sayısı (ekran başına)
   */
  private async getViewerCountsMap(screenIds: string[]): Promise<Record<string, number>> {
    if (screenIds.length === 0) return {};
    try {
      const r = await this.database.query(
        `SELECT screen_id, COUNT(*)::int AS c FROM display_viewers
         WHERE screen_id = ANY($1::uuid[]) AND last_seen_at > NOW() - INTERVAL '2 minutes'
         GROUP BY screen_id`,
        [screenIds]
      );
      const map: Record<string, number> = {};
      for (const row of r.rows) map[row.screen_id] = row.c;
      return map;
    } catch {
      return {};
    }
  }

  /**
   * Aynı linki birden fazla cihazda açan ekranlar (sadece super_admin)
   */
  async getMultiDeviceAlerts(): Promise<Array<{ screen_id: string; screen_name: string; business_name: string; active_viewer_count: number }>> {
    try {
      const r = await this.database.query(
        `WITH counts AS (
          SELECT screen_id, COUNT(*)::int AS c
          FROM display_viewers
          WHERE last_seen_at > NOW() - INTERVAL '2 minutes'
          GROUP BY screen_id
          HAVING COUNT(*) > 1
        )
        SELECT s.id AS screen_id, s.name AS screen_name, b.name AS business_name, c.c AS active_viewer_count
        FROM counts c
        JOIN screens s ON s.id = c.screen_id
        JOIN businesses b ON b.id = s.business_id
        ORDER BY c.c DESC`,
        []
      );
      return r.rows;
    } catch {
      return [];
    }
  }

  /**
   * Get all screens for user's business
   * @param targetUserId - Admin için: başka bir kullanıcının ekranlarını görmek için
   */
  async findAll(userId: string, userRole: string, targetUserId?: string) {
    // Admin başka bir kullanıcının ekranlarını görebilir
    const effectiveUserId = (userRole === 'super_admin' || userRole === 'admin') && targetUserId
      ? targetUserId
      : userId;

    if (userRole === 'super_admin' || userRole === 'admin') {
      const hasTargetUser = targetUserId != null && String(targetUserId).trim() !== '';
      if (hasTargetUser) {
        const userResult = await this.database.query(
          'SELECT business_id FROM users WHERE id = $1',
          [targetUserId!.trim()]
        );
        const targetBusinessId = userResult.rows[0]?.business_id;
        if (!targetBusinessId) {
          return { screens: [], subscription_active: true };
        }
        const subActive = await this.isBusinessSubscriptionActive(targetBusinessId);
        if (!subActive) {
          await this.stopAllScreensForBusiness(targetBusinessId);
        }
        const result = await this.database.query(
          `SELECT * FROM screens WHERE business_id = $1
           ORDER BY COALESCE((SUBSTRING(name FROM 'TV([0-9]+)'))::int, 999999), name ASC`,
          [targetBusinessId]
        );
        const viewerCounts = await this.getViewerCountsMap(result.rows.map((r: any) => r.id));
        const screens = result.rows.map((r: any) => ({ ...r, active_viewer_count: viewerCounts[r.id] ?? 0 }));
        return { screens, subscription_active: subActive };
      }
      // super_admin: user_id yoksa tüm ekranları döndür; admin: kendi business_id ekranları
      if (userRole === 'super_admin') {
        const result = await this.database.query(
          `SELECT s.* FROM screens s
           INNER JOIN businesses b ON s.business_id = b.id
           ORDER BY b.name ASC, COALESCE((SUBSTRING(s.name FROM 'TV([0-9]+)'))::int, 999999), s.name ASC`
        );
        const viewerCounts = await this.getViewerCountsMap(result.rows.map((r: any) => r.id));
        const screens = result.rows.map((r: any) => ({ ...r, active_viewer_count: viewerCounts[r.id] ?? 0 }));
        return { screens, subscription_active: true };
      }
      // admin, no targetUserId: kendi işletmesinin ekranları
      const myBusinessId = (await this.getUserBusinessId(userId, userRole)) ?? null;
      if (!myBusinessId) {
        return { screens: [], subscription_active: true };
      }
      const subActive = await this.isBusinessSubscriptionActive(myBusinessId);
      if (!subActive) {
        await this.stopAllScreensForBusiness(myBusinessId);
      }
      const result = await this.database.query(
        `SELECT * FROM screens WHERE business_id = $1
         ORDER BY COALESCE((SUBSTRING(name FROM 'TV([0-9]+)'))::int, 999999), name ASC`,
        [myBusinessId]
      );
      const viewerCounts = await this.getViewerCountsMap(result.rows.map((r: any) => r.id));
      const screens = result.rows.map((r: any) => ({ ...r, active_viewer_count: viewerCounts[r.id] ?? 0 }));
      return { screens, subscription_active: subActive };
    }

    const businessId = await this.getUserBusinessId(effectiveUserId, userRole);
    if (!businessId) {
      return { screens: [], subscription_active: false };
    }

    const subActive = await this.isBusinessSubscriptionActive(businessId);
    if (!subActive) {
      await this.stopAllScreensForBusiness(businessId);
    }

    const result = await this.database.query(
      `SELECT * FROM screens WHERE business_id = $1
       ORDER BY COALESCE((SUBSTRING(name FROM 'TV([0-9]+)'))::int, 999999), name ASC`,
      [businessId]
    );
    const viewerCounts = await this.getViewerCountsMap(result.rows.map((r: any) => r.id));
    const screens = result.rows.map((r: any) => ({ ...r, active_viewer_count: viewerCounts[r.id] ?? 0 }));
    return { screens, subscription_active: subActive };
  }

  /**
   * Bir işletmenin ekran isimlerini TV1, TV2, TV3... sırasına düzeltir (created_at sırasına göre).
   */
  async fixScreenNamesForBusiness(businessId: string): Promise<{ business_id: string; updated: number }> {
    const businessResult = await this.database.query(
      'SELECT name FROM businesses WHERE id = $1',
      [businessId]
    );
    const businessName = businessResult.rows[0]?.name || 'business';

    const screensResult = await this.database.query(
      `SELECT id, name FROM screens WHERE business_id = $1 ORDER BY created_at ASC, id ASC`,
      [businessId]
    );
    let updated = 0;
    for (let i = 0; i < screensResult.rows.length; i++) {
      const screen = screensResult.rows[i];
      const newName = `TV${i + 1}`;
      if (screen.name === newName) continue;
      const combinedName = `${businessName} ${newName}`;
      const publicSlug = await this.generateUniqueSlug(combinedName);
      await this.database.query(
        'UPDATE screens SET name = $1, public_slug = $2, updated_at = NOW() WHERE id = $3',
        [newName, publicSlug, screen.id]
      );
      updated++;
    }
    return { business_id: businessId, updated };
  }

  /**
   * Bir işletmenin ekran isimlerini düzeltir (erişim kontrolü ile). Admin/super_admin kullanabilir.
   */
  async fixScreenNamesForBusinessWithAccess(businessId: string, userId: string, userRole: string) {
    await this.checkBusinessAccess(businessId, userId, userRole);
    return this.fixScreenNamesForBusiness(businessId);
  }

  /**
   * Tüm işletmelerdeki ekran isimlerini TV1, TV2, TV3... sırasına düzeltir (created_at sırasına göre).
   * Sadece super_admin tarafından tetiklenir.
   */
  async fixScreenNamesForAllBusinesses(): Promise<{ business_id: string; updated: number }[]> {
    const businessIdsResult = await this.database.query(
      'SELECT DISTINCT business_id FROM screens WHERE business_id IS NOT NULL'
    );
    const results: { business_id: string; updated: number }[] = [];
    for (const row of businessIdsResult.rows) {
      results.push(await this.fixScreenNamesForBusiness(row.business_id));
    }
    return results;
  }

  /**
   * Get screen by ID
   */
  async findOne(id: string, userId: string, userRole: string) {
    const result = await this.database.query(
      'SELECT * FROM screens WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Screen not found');
    }

    const screen = result.rows[0];
    await this.checkBusinessAccess(screen.business_id, userId, userRole);

    const viewerCounts = await this.getViewerCountsMap([id]);
    return { ...screen, active_viewer_count: viewerCounts[id] ?? 0 };
  }

  /**
   * Update screen
   */
  async update(id: string, updateScreenDto: UpdateScreenDto, userId: string, userRole: string) {
    await this.findOne(id, userId, userRole);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateScreenDto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(updateScreenDto.name);
      // Name değişirse slug'ı da güncelle (business name ile birlikte)
      const screenResult = await this.database.query(
        'SELECT business_id FROM screens WHERE id = $1',
        [id]
      );
      if (screenResult.rows.length > 0) {
        const businessResult = await this.database.query(
          'SELECT name FROM businesses WHERE id = $1',
          [screenResult.rows[0].business_id]
        );
        const businessName = businessResult.rows[0]?.name || 'business';
        const combinedName = `${businessName} ${updateScreenDto.name}`;
        const newSlug = await this.generateUniqueSlug(combinedName);
        updates.push(`public_slug = $${paramIndex++}`);
        values.push(newSlug);
      }
    }
    if (updateScreenDto.location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(updateScreenDto.location);
    }
    if (updateScreenDto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(updateScreenDto.is_active);
    }
    if (updateScreenDto.animation_type !== undefined) {
      updates.push(`animation_type = $${paramIndex++}`);
      values.push(updateScreenDto.animation_type);
    }
    if (updateScreenDto.animation_duration !== undefined) {
      updates.push(`animation_duration = $${paramIndex++}`);
      values.push(updateScreenDto.animation_duration);
    }
    if (updateScreenDto.language_code !== undefined) {
      updates.push(`language_code = $${paramIndex++}`);
      values.push(updateScreenDto.language_code);
    }
    if (updateScreenDto.font_family !== undefined) {
      updates.push(`font_family = $${paramIndex++}`);
      values.push(updateScreenDto.font_family);
    }
    if (updateScreenDto.primary_color !== undefined) {
      updates.push(`primary_color = $${paramIndex++}`);
      values.push(updateScreenDto.primary_color);
    }
    if (updateScreenDto.background_style !== undefined) {
      updates.push(`background_style = $${paramIndex++}`);
      values.push(updateScreenDto.background_style);
    }
    if (updateScreenDto.background_color !== undefined) {
      updates.push(`background_color = $${paramIndex++}`);
      values.push(updateScreenDto.background_color);
    }
    if (updateScreenDto.background_image_url !== undefined) {
      updates.push(`background_image_url = $${paramIndex++}`);
      values.push(updateScreenDto.background_image_url);
    }
    if (updateScreenDto.logo_url !== undefined) {
      updates.push(`logo_url = $${paramIndex++}`);
      values.push(updateScreenDto.logo_url);
    }
    if (updateScreenDto.template_id !== undefined) {
      updates.push(`template_id = $${paramIndex++}`);
      values.push(updateScreenDto.template_id);
    }
    if ((updateScreenDto as Record<string, unknown>).frame_type !== undefined) {
      updates.push(`frame_type = $${paramIndex++}`);
      values.push((updateScreenDto as Record<string, unknown>).frame_type);
    }
    if ((updateScreenDto as Record<string, unknown>).ticker_text !== undefined) {
      updates.push(`ticker_text = $${paramIndex++}`);
      values.push((updateScreenDto as Record<string, unknown>).ticker_text);
    }
    if ((updateScreenDto as Record<string, unknown>).ticker_style !== undefined) {
      updates.push(`ticker_style = $${paramIndex++}`);
      values.push((updateScreenDto as Record<string, unknown>).ticker_style);
    }

    if (updates.length === 0) {
      return this.findOne(id, userId, userRole);
    }

    values.push(id);
    await this.database.query(
      `UPDATE screens SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    return this.findOne(id, userId, userRole);
  }

  /**
   * Delete screen
   */
  async remove(id: string, userId: string, userRole: string) {
    await this.findOne(id, userId, userRole);

    await this.database.query('DELETE FROM screens WHERE id = $1', [id]);
    return { message: 'Screen deleted successfully' };
  }

  /**
   * Assign menu to screen
   */
  async assignMenu(assignMenuDto: AssignMenuDto, userId: string, userRole: string) {
    // Check if screen exists and user has access
    const screen = await this.findOne(assignMenuDto.screen_id, userId, userRole);

    // Check if menu exists
    const menuResult = await this.database.query(
      'SELECT business_id FROM menus WHERE id = $1',
      [assignMenuDto.menu_id]
    );

    if (menuResult.rows.length === 0) {
      throw new NotFoundException('Menu not found');
    }

    const menu = menuResult.rows[0];
    if (menu.business_id !== screen.business_id) {
      throw new ForbiddenException('Menu and screen must belong to the same business');
    }

    // Check if relation already exists
    const existingResult = await this.database.query(
      'SELECT id FROM screen_menu WHERE screen_id = $1 AND menu_id = $2',
      [assignMenuDto.screen_id, assignMenuDto.menu_id]
    );

    if (existingResult.rows.length > 0) {
      // Update existing relation
      const result = await this.database.query(
        'UPDATE screen_menu SET display_order = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [assignMenuDto.display_order || 0, existingResult.rows[0].id]
      );
      return result.rows[0];
    } else {
      // Create new relation
      const result = await this.database.query(
        `INSERT INTO screen_menu (screen_id, menu_id, display_order)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [assignMenuDto.screen_id, assignMenuDto.menu_id, assignMenuDto.display_order || 0]
      );
      return result.rows[0];
    }
  }

  /**
   * Remove menu from screen
   */
  async removeMenu(screenId: string, menuId: string, userId: string, userRole: string) {
    await this.findOne(screenId, userId, userRole);

    await this.database.query(
      'DELETE FROM screen_menu WHERE screen_id = $1 AND menu_id = $2',
      [screenId, menuId]
    );
    return { message: 'Menu removed from screen successfully' };
  }

  /**
   * Get menus assigned to a screen
   */
  async getScreenMenus(screenId: string, userId: string, userRole: string) {
    await this.findOne(screenId, userId, userRole);

    const result = await this.database.query(
      `SELECT 
        sm.*,
        json_build_object(
          'id', m.id,
          'name', m.name,
          'description', m.description,
          'slide_duration', m.slide_duration,
          'is_active', m.is_active
        ) as menus
      FROM screen_menu sm
      INNER JOIN menus m ON sm.menu_id = m.id
      WHERE sm.screen_id = $1
      ORDER BY sm.display_order ASC`,
      [screenId]
    );

    return result.rows;
  }

  /**
   * Publish templates to screen with rotation
   */
  async publishTemplates(screenId: string, dto: PublishTemplatesDto, userId: string, userRole: string) {
    // Check screen access and get screen (includes business_id)
    const screen = await this.findOne(screenId, userId, userRole) as { business_id: string };
    if (!screen?.business_id) {
      throw new ForbiddenException('Screen or business not found');
    }
    // Abonelik süresi dolmuş veya ödeme alınamamışsa yayın yapılamaz
    const subActive = await this.isBusinessSubscriptionActive(screen.business_id);
    if (!subActive) {
      throw new ForbiddenException(
        'Subscription expired or payment failed. Renew your subscription to broadcast.',
      );
    }

    // Delete existing rotations
    await this.database.query(
      'DELETE FROM screen_template_rotations WHERE screen_id = $1',
      [screenId]
    );

    // Delete existing screen blocks (will be recreated for first template)
    await this.database.query(
      'DELETE FROM screen_blocks WHERE screen_id = $1',
      [screenId]
    );

    // Insert new rotations and setup first template
    for (let i = 0; i < dto.templates.length; i++) {
      const template = dto.templates[i];
      
      // Verify template exists
      const templateCheck = await this.database.query(
        'SELECT id FROM templates WHERE id = $1 AND is_active = true',
        [template.template_id]
      );

      if (templateCheck.rows.length === 0) {
        throw new NotFoundException(`Template ${template.template_id} not found or inactive`);
      }

      // For first template, apply it to screen and create screen blocks
      if (i === 0) {
        // Set first template as current template
        await this.database.query(
          `UPDATE screens SET template_id = $1 WHERE id = $2`,
          [template.template_id, screenId]
        );

        // Create screen blocks from first template
        const templateBlocksResult = await this.database.query(
          'SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index ASC',
          [template.template_id]
        );

        // Create screen blocks for first template
        for (const templateBlock of templateBlocksResult.rows) {
          await this.database.query(
            `INSERT INTO screen_blocks (
              screen_id, template_block_id, display_order, is_active
            )
            VALUES ($1, $2, $3, true)`,
            [screenId, templateBlock.id, templateBlock.block_index]
          );
        }
      }

      // Insert rotation record for all templates
      await this.database.query(
        `INSERT INTO screen_template_rotations (
          screen_id, template_id, display_duration, display_order, is_active
        )
        VALUES ($1, $2, $3, $4, true)`,
        [screenId, template.template_id, template.display_duration, i]
      );
    }

    // Activate screen and optionally update frame_type, ticker_text, ticker_style
    const hasFrameOrTicker = (dto as any).frame_type !== undefined || (dto as any).ticker_text !== undefined || (dto as any).ticker_style !== undefined;
    if (hasFrameOrTicker) {
      const frameUpdates: string[] = ['is_active = true'];
      const frameValues: any[] = [];
      let fi = 1;
      if ((dto as any).frame_type !== undefined) {
        frameUpdates.push(`frame_type = $${fi++}`);
        frameValues.push((dto as any).frame_type);
      }
      if ((dto as any).ticker_text !== undefined) {
        frameUpdates.push(`ticker_text = $${fi++}`);
        frameValues.push((dto as any).ticker_text);
      }
      if ((dto as any).ticker_style !== undefined) {
        frameUpdates.push(`ticker_style = $${fi++}`);
        frameValues.push((dto as any).ticker_style);
      }
      frameValues.push(screenId);
      await this.database.query(
        `UPDATE screens SET ${frameUpdates.join(', ')}, updated_at = NOW() WHERE id = $${fi}`,
        frameValues
      );
    } else {
      await this.database.query(
        'UPDATE screens SET is_active = true WHERE id = $1',
        [screenId]
      );
    }

    return { message: 'Templates published successfully', count: dto.templates.length };
  }

  /**
   * Stop template rotation (deactivate screen)
   */
  async stopPublishing(screenId: string, userId: string, userRole: string) {
    await this.findOne(screenId, userId, userRole);

    // Deactivate screen
    await this.database.query(
      'UPDATE screens SET is_active = false WHERE id = $1',
      [screenId]
    );

    // Deactivate all rotations
    await this.database.query(
      'UPDATE screen_template_rotations SET is_active = false WHERE screen_id = $1',
      [screenId]
    );

    return { message: 'Publishing stopped successfully' };
  }

  /**
   * Get active template rotations for a screen
   */
  async getTemplateRotations(screenId: string, userId: string, userRole: string) {
    await this.findOne(screenId, userId, userRole);

    const result = await this.database.query(
      `SELECT 
        str.*,
        json_build_object(
          'id', t.id,
          'name', t.display_name,
          'description', t.description,
          'block_count', t.block_count
        ) as template
      FROM screen_template_rotations str
      INNER JOIN templates t ON str.template_id = t.id
      WHERE str.screen_id = $1 AND str.is_active = true
      ORDER BY str.display_order ASC`,
      [screenId]
    );

    return result.rows;
  }
}
