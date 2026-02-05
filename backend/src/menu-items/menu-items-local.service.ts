import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuItemsLocalService {
  constructor(private database: DatabaseService) {}

  /**
   * Check if user has access to a menu
   */
  private async checkMenuAccess(menuId: string, userId: string, userRole: string) {
    try {
      // Get menu
      const menuResult = await this.database.query(
        'SELECT * FROM menus WHERE id = $1',
        [menuId]
      );

      if (menuResult.rows.length === 0) {
        throw new NotFoundException('Menu not found');
      }

      const menu = menuResult.rows[0];

      // Super admin has access to all menus
      if (userRole === 'super_admin') {
        return menu;
      }

      // Get user's business_id
      const userResult = await this.database.query(
        'SELECT business_id FROM users WHERE id = $1',
        [userId]
      );

      const userBusinessId = userResult.rows[0]?.business_id;

      if (!userBusinessId) {
        throw new ForbiddenException('User has no business_id');
      }

      // Check if menu belongs to user's business
      if (menu.business_id !== userBusinessId) {
        throw new ForbiddenException('Access denied to this menu');
      }

      return menu;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Create a new menu item
   */
  async create(createMenuItemDto: CreateMenuItemDto, userId: string, userRole: string) {
    // Check if user has access to the menu
    await this.checkMenuAccess(createMenuItemDto.menu_id, userId, userRole);

    const result = await this.database.query(
      `INSERT INTO menu_items (
        menu_id, name, description, price, image_url, display_order, page_index, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        createMenuItemDto.menu_id,
        createMenuItemDto.name,
        createMenuItemDto.description || null,
        createMenuItemDto.price || null,
        createMenuItemDto.image_url || null,
        createMenuItemDto.display_order || 0,
        createMenuItemDto.page_index ?? 0,
        createMenuItemDto.is_active ?? true,
      ]
    );

    return result.rows[0];
  }

  /**
   * Get all menu items for a menu
   */
  async findAll(menuId: string, userId: string, userRole: string) {
    try {
      await this.checkMenuAccess(menuId, userId, userRole);

      const result = await this.database.query(
        `SELECT * FROM menu_items 
         WHERE menu_id = $1 
         ORDER BY display_order ASC`,
        [menuId]
      );

      return result.rows;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get menu item by ID
   */
  async findOne(id: string, userId: string, userRole: string) {
    const result = await this.database.query(
      'SELECT * FROM menu_items WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Menu item not found');
    }

    const item = result.rows[0];

    // Check access via menu
    await this.checkMenuAccess(item.menu_id, userId, userRole);

    return item;
  }

  /**
   * Update menu item
   */
  async update(id: string, updateMenuItemDto: UpdateMenuItemDto, userId: string, userRole: string) {
    // First check if item exists and user has access
    await this.findOne(id, userId, userRole);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateMenuItemDto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(updateMenuItemDto.name);
    }
    if (updateMenuItemDto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(updateMenuItemDto.description);
    }
    if (updateMenuItemDto.price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      values.push(updateMenuItemDto.price);
    }
    if (updateMenuItemDto.image_url !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      values.push(updateMenuItemDto.image_url);
    }
    if (updateMenuItemDto.display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(updateMenuItemDto.display_order);
    }
    if (updateMenuItemDto.page_index !== undefined) {
      updates.push(`page_index = $${paramIndex++}`);
      values.push(updateMenuItemDto.page_index);
    }
    if (updateMenuItemDto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(updateMenuItemDto.is_active);
    }

    if (updates.length === 0) {
      return this.findOne(id, userId, userRole);
    }

    values.push(id);
    await this.database.query(
      `UPDATE menu_items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    return this.findOne(id, userId, userRole);
  }

  /**
   * Delete menu item
   */
  async remove(id: string, userId: string, userRole: string) {
    // First check if item exists and user has access
    await this.findOne(id, userId, userRole);

    await this.database.query('DELETE FROM menu_items WHERE id = $1', [id]);
    return { message: 'Menu item deleted successfully' };
  }
}
