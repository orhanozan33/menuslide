import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MenuResolverService {
  constructor(private database: DatabaseService) {}

  async getBusinessName(businessId: string): Promise<string | null> {
    const info = await this.getBusinessQrAppearance(businessId);
    return info?.name ?? null;
  }

  async getBusinessQrAppearance(businessId: string): Promise<{ name: string | null; qr_background_image_url: string | null; qr_background_color: string | null } | null> {
    const result = await this.database.query(
      `SELECT name, qr_background_image_url, qr_background_color FROM businesses WHERE id = $1 AND is_active = true`,
      [businessId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const name = row?.name != null && String(row.name).trim() !== '' ? String(row.name).trim() : null;
    return {
      name,
      qr_background_image_url: row?.qr_background_image_url ? String(row.qr_background_image_url).trim() || null : null,
      qr_background_color: row?.qr_background_color ? String(row.qr_background_color).trim() || null : null,
    };
  }

  async getActiveMenu(businessId: string, languageCode: string = 'en', screenId?: string) {
    // Legacy method - kept for backward compatibility
    // If screenId is provided, get menu from screen_menu relation
    let menuId: string | null = null;
    
    if (screenId) {
      const screenMenuResult = await this.database.query(
        `SELECT menu_id FROM screen_menu 
         WHERE screen_id = $1 
         ORDER BY display_order ASC 
         LIMIT 1`,
        [screenId]
      );
      
      if (screenMenuResult.rows.length > 0) {
        menuId = screenMenuResult.rows[0].menu_id;
      }
    }

    // Get active menus for business
    let menusResult;
    if (menuId) {
      menusResult = await this.database.query(
        `SELECT m.* FROM menus m
         WHERE m.id = $1 AND m.business_id = $2 AND m.is_active = true`,
        [menuId, businessId]
      );
    } else {
      menusResult = await this.database.query(
        `SELECT m.* FROM menus m
         INNER JOIN businesses b ON m.business_id = b.id
         WHERE b.id = $1 AND m.is_active = true
         ORDER BY m.created_at DESC
         LIMIT 1`,
        [businessId]
      );
    }

    if (menusResult.rows.length === 0) {
      return null;
    }

    const menu = menusResult.rows[0];

    // Get menu items with translations
    const itemsResult = await this.database.query(
      `SELECT mi.*, 
              COALESCE(mit.name, mi.name) as name,
              COALESCE(mit.description, mi.description) as description
       FROM menu_items mi
       LEFT JOIN menu_item_translations mit ON mi.id = mit.menu_item_id AND mit.language_code = $2
       WHERE mi.menu_id = $1 AND mi.is_active = true
       ORDER BY mi.display_order ASC`,
      [menu.id, languageCode]
    );

    return {
      ...menu,
      items: itemsResult.rows,
    };
  }

  /**
   * Get all active menus for a business.
   * Şablondan otomatik oluşturulan menüler dahil edilmez; sadece kullanıcının oluşturduğu menüler.
   */
  async getAllMenus(businessId: string, languageCode: string = 'en') {
    const menusResult = await this.database.query(
      `SELECT m.* FROM menus m
       INNER JOIN businesses b ON m.business_id = b.id
       WHERE b.id = $1 AND m.is_active = true
       AND (m.description IS NULL OR (
         m.description NOT LIKE 'Menu auto-created from template:%' AND
         m.description NOT LIKE 'Template''ten otomatik oluşturulan menü:%'
       ))
       ORDER BY m.created_at DESC`,
      [businessId]
    );

    if (menusResult.rows.length === 0) {
      return [];
    }

    const menusWithItems = await Promise.all(
      menusResult.rows.map(async (menu) => {
        const itemsResult = await this.database.query(
          `SELECT mi.*, 
                  COALESCE(mit.name, mi.name) as name,
                  COALESCE(mit.description, mi.description) as description
           FROM menu_items mi
           LEFT JOIN menu_item_translations mit ON mi.id = mit.menu_item_id AND mit.language_code = $2
           WHERE mi.menu_id = $1 AND mi.is_active = true
           ORDER BY mi.display_order ASC`,
          [menu.id, languageCode]
        );

        return {
          ...menu,
          items: itemsResult.rows,
        };
      })
    );

    return menusWithItems;
  }

  async getMenuItemDetails(itemId: string, languageCode: string = 'en') {
    const itemResult = await this.database.query(
      `SELECT mi.*,
              COALESCE(mit.name, mi.name) as name,
              COALESCE(mit.description, mi.description) as description
       FROM menu_items mi
       LEFT JOIN menu_item_translations mit ON mi.id = mit.menu_item_id AND mit.language_code = $2
       WHERE mi.id = $1 AND mi.is_active = true`,
      [itemId, languageCode]
    );

    if (itemResult.rows.length === 0) {
      return null;
    }

    const item = itemResult.rows[0];
    return {
      ...item,
      display_name: item.name,
      display_description: item.description,
      display_price: item.price,
    };
  }

  async getMenuLanguages(businessId: string) {
    const result = await this.database.query(
      `SELECT DISTINCT l.code, l.name, l.is_default
       FROM languages l
       INNER JOIN menu_item_translations mit ON l.code = mit.language_code
       INNER JOIN menu_items mi ON mit.menu_item_id = mi.id
       INNER JOIN menus m ON mi.menu_id = m.id
       WHERE m.business_id = $1 AND m.is_active = true AND mi.is_active = true AND l.is_active = true
       UNION
       SELECT code, name, is_default FROM languages WHERE code = 'en' AND is_active = true
       ORDER BY code`,
      [businessId]
    );

    return result.rows;
  }
}
