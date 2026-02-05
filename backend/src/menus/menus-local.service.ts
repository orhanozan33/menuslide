import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenusLocalService {
  constructor(private database: DatabaseService) {}

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
   * Create a new menu
   */
  async create(createMenuDto: CreateMenuDto, userId: string, userRole: string) {
    await this.checkBusinessAccess(createMenuDto.business_id, userId, userRole);

    const pagesConfig = createMenuDto.pages_config && createMenuDto.pages_config.length > 0
      ? JSON.stringify(createMenuDto.pages_config)
      : JSON.stringify([{ name: 'Sayfa 1', order: 0 }]);

    const result = await this.database.query(
      `INSERT INTO menus (business_id, name, description, slide_duration, is_active, pages_config)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [
        createMenuDto.business_id,
        createMenuDto.name,
        createMenuDto.description || null,
        createMenuDto.slide_duration || 5,
        createMenuDto.is_active ?? true,
        pagesConfig,
      ]
    );

    return result.rows[0];
  }

  /**
   * Get all menus for user's business (or for selected user when super_admin)
   */
  async findAll(userId: string, userRole: string, targetUserId?: string) {
    // Super admin / admin: seçili kullanıcının menüleri; seçim yoksa boş
    if (userRole === 'super_admin' || userRole === 'admin') {
      if (!targetUserId) {
        return { menus: [], business_id: null };
      }
      const userRow = await this.database.query(
        'SELECT business_id FROM users WHERE id = $1',
        [targetUserId]
      );
      const businessId = userRow.rows[0]?.business_id || null;
      if (!businessId) {
        return { menus: [], business_id: null };
      }
      const result = await this.database.query(
        `SELECT * FROM menus WHERE business_id = $1
         AND (description IS NULL OR (
           description NOT LIKE 'Menu auto-created from template:%' AND
           description NOT LIKE 'Template''ten otomatik oluşturulan menü:%'
         ))
         ORDER BY created_at DESC`,
        [businessId]
      );
      return { menus: result.rows, business_id: businessId };
    }

    const businessId = await this.getUserBusinessId(userId, userRole);
    if (!businessId) {
      return { menus: [], business_id: null };
    }

    const result = await this.database.query(
      `SELECT * FROM menus WHERE business_id = $1
       AND (description IS NULL OR (
         description NOT LIKE 'Menu auto-created from template:%' AND
         description NOT LIKE 'Template''ten otomatik oluşturulan menü:%'
       ))
       ORDER BY created_at DESC`,
      [businessId]
    );

    return {
      menus: result.rows,
      business_id: businessId
    };
  }

  /**
   * Get stats (menu count and menu items count) for user's business
   */
  async getStats(userId: string, userRole: string) {
    if (userRole === 'super_admin') {
      const menusResult = await this.database.query(
        'SELECT COUNT(*) as count FROM menus'
      );
      const menuItemsResult = await this.database.query(
        'SELECT COUNT(*) as count FROM menu_items WHERE is_active = true'
      );
      return {
        menus: parseInt(menusResult.rows[0].count, 10),
        menuItems: parseInt(menuItemsResult.rows[0].count, 10),
      };
    }

    const businessId = await this.getUserBusinessId(userId, userRole);
    if (!businessId) {
      return { menus: 0, menuItems: 0 };
    }

    // Aynı filtreyle say (şablondan otomatik oluşturulan menüler hariç — kullanıcının gördüğü liste ile uyumlu)
    const menuFilter = `business_id = $1
      AND (description IS NULL OR (
        description NOT LIKE 'Menu auto-created from template:%' AND
        description NOT LIKE 'Template''ten otomatik oluşturulan menü:%'
      ))`;
    const menusResult = await this.database.query(
      `SELECT COUNT(*) as count FROM menus WHERE ${menuFilter}`,
      [businessId]
    );

    const menuIdsResult = await this.database.query(
      `SELECT id FROM menus WHERE ${menuFilter}`,
      [businessId]
    );
    const menuIds = menuIdsResult.rows.map((row) => row.id);

    let menuItemsCount = 0;
    if (menuIds.length > 0) {
      const menuItemsResult = await this.database.query(
        `SELECT COUNT(*) as count FROM menu_items 
         WHERE menu_id = ANY($1::uuid[]) AND is_active = true`,
        [menuIds]
      );
      menuItemsCount = parseInt(menuItemsResult.rows[0].count, 10);
    }

    return {
      menus: parseInt(menusResult.rows[0].count, 10),
      menuItems: menuItemsCount,
    };
  }

  /**
   * Get menu by ID
   */
  async findOne(id: string, userId: string, userRole: string) {
    const result = await this.database.query(
      'SELECT * FROM menus WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Menu not found');
    }

    const menu = result.rows[0];
    await this.checkBusinessAccess(menu.business_id, userId, userRole);

    return menu;
  }

  /**
   * Update menu
   */
  async update(id: string, updateMenuDto: UpdateMenuDto, userId: string, userRole: string) {
    await this.findOne(id, userId, userRole);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateMenuDto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(updateMenuDto.name);
    }
    if (updateMenuDto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(updateMenuDto.description);
    }
    if (updateMenuDto.slide_duration !== undefined) {
      updates.push(`slide_duration = $${paramIndex++}`);
      values.push(updateMenuDto.slide_duration);
    }
    if (updateMenuDto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(updateMenuDto.is_active);
    }
    if (updateMenuDto.pages_config !== undefined) {
      updates.push(`pages_config = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(updateMenuDto.pages_config));
    }

    if (updates.length === 0) {
      return this.findOne(id, userId, userRole);
    }

    values.push(id);
    await this.database.query(
      `UPDATE menus SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    return this.findOne(id, userId, userRole);
  }

  /**
   * Delete menu
   */
  async remove(id: string, userId: string, userRole: string) {
    await this.findOne(id, userId, userRole);

    await this.database.query('DELETE FROM menus WHERE id = $1', [id]);
    return { message: 'Menu deleted successfully' };
  }
}
