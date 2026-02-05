import { Injectable, Inject, Optional, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenusLocalService } from './menus-local.service';

@Injectable()
export class MenusService {
  private localService: MenusLocalService | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localService: MenusLocalService,
  ) {
    this.supabase = supabase || null;
    this.localService = localService || null;
  }


  /**
   * Create a new menu
   */
  async create(createMenuDto: CreateMenuDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.create(createMenuDto, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // ... (Supabase implementation)
    throw new ForbiddenException('Database service not available');
  }

  /**
   * Get all menus for user's business (or for target user when super_admin)
   */
  async findAll(userId: string, userRole: string, targetUserId?: string) {
    if (this.localService) {
      return this.localService.findAll(userId, userRole, targetUserId);
    }

    // Supabase fallback
    if (!this.supabase) {
      return [];
    }

    // ... (Supabase implementation)
    return [];
  }

  /**
   * Get menu by ID
   */
  async findOne(id: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.findOne(id, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // ... (Supabase implementation)
    throw new ForbiddenException('Database service not available');
  }

  /**
   * Update menu
   */
  async update(id: string, updateMenuDto: UpdateMenuDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.update(id, updateMenuDto, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // ... (Supabase implementation)
    throw new ForbiddenException('Database service not available');
  }

  /**
   * Delete menu
   */
  async remove(id: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.remove(id, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // ... (Supabase implementation)
    throw new ForbiddenException('Database service not available');
  }

  /**
   * Get stats (menu count and menu items count) for user's business
   */
  async getStats(userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.getStats(userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      return { menus: 0, menuItems: 0 };
    }

    // ... (Supabase implementation)
    return { menus: 0, menuItems: 0 };
  }
}
