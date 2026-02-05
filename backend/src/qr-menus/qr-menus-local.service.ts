import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as QRCode from 'qrcode';

@Injectable()
export class QrMenusLocalService {
  constructor(private database: DatabaseService) {}

  // Expose database for access checks
  get db() {
    return this.database;
  }

  /**
   * Get or create QR menu for business (single QR for all menus).
   * Uses short URL with business slug when available: /qr/{slug} (like TV display).
   */
  async getOrCreateQrMenu(businessId: string, screenId?: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Resolve business slug for short URL
    const bizResult = await this.database.query(
      'SELECT slug FROM businesses WHERE id = $1',
      [businessId]
    );
    const businessSlug = bizResult.rows[0]?.slug?.trim() || null;

    // Check if QR menu exists for business (screen_id IS NULL)
    const existingResult = await this.database.query(
      `SELECT * FROM qr_menus
       WHERE business_id = $1 AND screen_id IS NULL
       LIMIT 1`,
      [businessId]
    );

    if (existingResult.rows.length > 0) {
      const row = existingResult.rows[0];
      const shortUrl = businessSlug
        ? `${frontendUrl}/qr/${businessSlug}`
        : `${frontendUrl}/qr/${businessId}?token=${row.token}`;
      const qrCodeDataUrl = await this.generateQrImage(shortUrl);
      return {
        ...row,
        qr_code_data: shortUrl,
        qr_code_url: qrCodeDataUrl || row.qr_code_url,
      };
    }

    // Generate token
    const tokenResult = await this.database.query('SELECT generate_qr_token() as token');
    const token = tokenResult.rows[0].token;

    const shortUrl = businessSlug
      ? `${frontendUrl}/qr/${businessSlug}`
      : `${frontendUrl}/qr/${businessId}?token=${token}`;

    const qrCodeUrl = await this.generateQrImage(shortUrl);

    const result = await this.database.query(
      `INSERT INTO qr_menus (
        business_id, screen_id, qr_code_url, qr_code_data, token, is_active
      )
      VALUES ($1, NULL, $2, $3, $4, true)
      RETURNING *`,
      [businessId, qrCodeUrl || '', shortUrl, token]
    );

    return result.rows[0];
  }

  private async generateQrImage(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url, { width: 500, margin: 2 });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  }

  /**
   * Resolve business_id and token by business slug (for short /qr/{slug} URLs).
   */
  async getByBusinessSlug(slug: string) {
    const result = await this.database.query(
      `SELECT qm.business_id, qm.token
       FROM qr_menus qm
       INNER JOIN businesses b ON b.id = qm.business_id
       WHERE b.slug = $1 AND qm.screen_id IS NULL AND qm.is_active = true
       LIMIT 1`,
      [slug]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('QR menu not found');
    }
    return result.rows[0];
  }

  /**
   * Get QR menu by token
   */
  async getQrMenuByToken(token: string) {
    const result = await this.database.query(
      `SELECT qm.*, b.name as business_name, b.slug as business_slug
       FROM qr_menus qm
       INNER JOIN businesses b ON qm.business_id = b.id
       WHERE qm.token = $1 AND qm.is_active = true`,
      [token]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('QR menu not found');
    }

    return result.rows[0];
  }

  /**
   * Record QR menu view (analytics)
   */
  async recordView(qrMenuId: string, deviceType: string, userAgent: string, ipAddress: string, languageCode: string = 'en') {
    await this.database.query(
      `INSERT INTO qr_menu_views (
        qr_menu_id, device_type, user_agent, ip_address, language_code
      )
      VALUES ($1, $2, $3, $4, $5)`,
      [qrMenuId, deviceType, userAgent, ipAddress, languageCode]
    );
  }

  /**
   * Get QR menu analytics
   */
  async getAnalytics(qrMenuId: string, days: number = 30) {
    const result = await this.database.query(
      `SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT ip_address) as unique_visitors,
        COUNT(*) FILTER (WHERE device_type = 'mobile') as mobile_views,
        COUNT(*) FILTER (WHERE device_type = 'tablet') as tablet_views,
        COUNT(*) FILTER (WHERE device_type = 'desktop') as desktop_views
      FROM qr_menu_views
      WHERE qr_menu_id = $1
        AND viewed_at >= NOW() - INTERVAL '${days} days'`,
      [qrMenuId]
    );

    return result.rows[0] || {
      total_views: 0,
      unique_visitors: 0,
      mobile_views: 0,
      tablet_views: 0,
      desktop_views: 0,
    };
  }

  /**
   * Update QR menu settings
   */
  async updateSettings(qrMenuId: string, settings: {
    show_allergens?: boolean;
    show_calories?: boolean;
    show_ingredients?: boolean;
    custom_css?: string;
  }) {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (settings.show_allergens !== undefined) {
      updates.push(`show_allergens = $${paramIndex++}`);
      values.push(settings.show_allergens);
    }
    if (settings.show_calories !== undefined) {
      updates.push(`show_calories = $${paramIndex++}`);
      values.push(settings.show_calories);
    }
    if (settings.show_ingredients !== undefined) {
      updates.push(`show_ingredients = $${paramIndex++}`);
      values.push(settings.show_ingredients);
    }
    if (settings.custom_css !== undefined) {
      updates.push(`custom_css = $${paramIndex++}`);
      values.push(settings.custom_css);
    }

    if (updates.length === 0) {
      return this.getQrMenuByToken(qrMenuId);
    }

    values.push(qrMenuId);
    await this.database.query(
      `UPDATE qr_menus SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    return this.getQrMenuByToken(qrMenuId);
  }
}
