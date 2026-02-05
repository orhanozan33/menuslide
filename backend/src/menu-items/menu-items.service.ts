import { Injectable, Inject, Optional, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenusService } from '../menus/menus.service';
import { MenuItemsLocalService } from './menu-items-local.service';

@Injectable()
export class MenuItemsService {
  private localService: MenuItemsLocalService | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localService: MenuItemsLocalService,
    private menusService: MenusService,
  ) {
    this.supabase = supabase || null;
    this.localService = localService || null;
  }

  /**
   * Create a new menu item
   */
  async create(createMenuItemDto: CreateMenuItemDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.create(createMenuItemDto, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // Check if user has access to the menu
    const menu = await this.menusService.findOne(createMenuItemDto.menu_id, userId, userRole);

    const { data, error } = await this.supabase
      .from('menu_items')
      .insert(createMenuItemDto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all menu items for a menu
   */
  async findAll(menuId: string, userId: string, userRole: string) {
    try {
      if (this.localService) {
        return await this.localService.findAll(menuId, userId, userRole);
      }
      // Supabase fallback
      if (!this.supabase) {
        throw new ForbiddenException('Database service not available');
      }

      // Check if user has access to the menu
      await this.menusService.findOne(menuId, userId, userRole);

      const { data, error } = await this.supabase
        .from('menu_items')
        .select('*')
        .eq('menu_id', menuId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error(`❌ [SERVICE] findAll hatası:`, error);
      console.error(`❌ [SERVICE] Hata stack:`, error?.stack);
      throw error;
    }
  }

  /**
   * Get menu item by ID
   */
  async findOne(id: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.findOne(id, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    const { data: item, error: itemError } = await this.supabase
      .from('menu_items')
      .select('*, menus!inner(*)')
      .eq('id', id)
      .single();

    if (itemError) throw itemError;
    if (!item) throw new ForbiddenException('Menu item not found');

    // Check access via menu
    await this.menusService.findOne(item.menu_id, userId, userRole);

    return item;
  }

  /**
   * Update menu item
   */
  async update(id: string, updateMenuItemDto: UpdateMenuItemDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.update(id, updateMenuItemDto, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // First check if item exists and user has access
    await this.findOne(id, userId, userRole);

    const { data, error } = await this.supabase
      .from('menu_items')
      .update(updateMenuItemDto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete menu item
   */
  async remove(id: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.remove(id, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // First check if item exists and user has access
    await this.findOne(id, userId, userRole);

    const { error } = await this.supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Menu item deleted successfully' };
  }
}
