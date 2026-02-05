import { Injectable, Inject, Optional, ForbiddenException, NotFoundException, forwardRef } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { AssignMenuDto } from './dto/assign-menu.dto';
import { PublishTemplatesDto } from './dto/publish-templates.dto';
import { ScreenBlocksService } from '../screen-blocks/screen-blocks.service';
import { ScreensLocalService } from './screens-local.service';

@Injectable()
export class ScreensService {
  private localService: ScreensLocalService | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localService: ScreensLocalService,
    @Optional() @Inject(forwardRef(() => ScreenBlocksService)) private screenBlocksService?: ScreenBlocksService,
  ) {
    this.supabase = supabase || null;
    this.localService = localService || null;
  }

  /**
   * Create a new screen
   */
  async create(createScreenDto: CreateScreenDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.create(createScreenDto, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // ... (Supabase implementation - keeping for compatibility)
    throw new ForbiddenException('Database service not available');
  }

  /**
   * Ekran isimlerini TV1, TV2, TV3... düzeltir.
   * business_id verilmezse tüm işletmeler (sadece super_admin). Verilirse o işletme (admin/super_admin).
   */
  async fixScreenNames(userId: string, userRole: string, businessId?: string) {
    if (!this.localService) return businessId ? { business_id: businessId, updated: 0 } : [];
    if (businessId) {
      return this.localService.fixScreenNamesForBusinessWithAccess(businessId, userId, userRole);
    }
    if (userRole !== 'super_admin') {
      throw new ForbiddenException('Sadece süper admin tüm ekran isimlerini düzeltebilir');
    }
    return this.localService.fixScreenNamesForAllBusinesses();
  }

  /**
   * Aynı linki birden fazla cihazda açan ekranlar (sadece super_admin)
   */
  async getMultiDeviceAlerts(userId: string, userRole: string) {
    if (userRole !== 'super_admin') {
      throw new ForbiddenException('Only super admin can view multi-device alerts');
    }
    if (this.localService) {
      return this.localService.getMultiDeviceAlerts();
    }
    return [];
  }

  /**
   * Get all screens for user's business
   */
  async findAll(userId: string, userRole: string, targetUserId?: string) {
    if (this.localService) {
      return this.localService.findAll(userId, userRole, targetUserId);
    }

    // Supabase fallback
    if (!this.supabase) {
      return { screens: [], subscription_active: true };
    }

    // ... (Supabase implementation)
    return { screens: [], subscription_active: true };
  }

  /**
   * Get screen by ID
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
   * Update screen
   */
  async update(id: string, updateScreenDto: UpdateScreenDto, userId: string, userRole: string) {
    if (this.localService) {
      const screen = await this.localService.findOne(id, userId, userRole);
      const oldTemplateId = screen.template_id;

      const updated = await this.localService.update(id, updateScreenDto, userId, userRole);

      // If template_id changed, reinitialize screen blocks
      if (updateScreenDto.template_id && updateScreenDto.template_id !== oldTemplateId && this.screenBlocksService) {
        try {
          await this.screenBlocksService.initializeScreenBlocks(id, updateScreenDto.template_id);
        } catch (err) {
          console.error('Error reinitializing screen blocks:', err);
          // Don't fail screen update if block initialization fails
        }
      }

      return updated;
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // ... (Supabase implementation)
    throw new ForbiddenException('Database service not available');
  }

  /**
   * Delete screen
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
   * Assign menu to screen
   */
  async assignMenu(assignMenuDto: AssignMenuDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.assignMenu(assignMenuDto, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // ... (Supabase implementation)
    throw new ForbiddenException('Database service not available');
  }

  /**
   * Remove menu from screen
   */
  async removeMenu(screenId: string, menuId: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.removeMenu(screenId, menuId, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // ... (Supabase implementation)
    throw new ForbiddenException('Database service not available');
  }

  /**
   * Get menus assigned to a screen
   */
  async getScreenMenus(screenId: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.getScreenMenus(screenId, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // ... (Supabase implementation)
    return [];
  }

  /**
   * Publish templates to screen with rotation
   */
  async publishTemplates(screenId: string, dto: PublishTemplatesDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.publishTemplates(screenId, dto, userId, userRole);
    }

    throw new ForbiddenException('Database service not available');
  }

  /**
   * Stop template rotation (deactivate screen)
   */
  async stopPublishing(screenId: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.stopPublishing(screenId, userId, userRole);
    }

    throw new ForbiddenException('Database service not available');
  }

  /**
   * Get active template rotations for a screen
   */
  async getTemplateRotations(screenId: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.getTemplateRotations(screenId, userId, userRole);
    }

    return [];
  }
}
