import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { MenuItemsService } from './menu-items.service';

@Injectable()
export class TranslationsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private menuItemsService: MenuItemsService,
  ) {}

  /**
   * Create or update translation for menu item
   */
  async upsert(createTranslationDto: CreateTranslationDto, userId: string, userRole: string) {
    // Verify user has access to the menu item
    await this.menuItemsService.findOne(createTranslationDto.menu_item_id, userId, userRole);

    const { data, error } = await this.supabase
      .from('menu_item_translations')
      .upsert({
        menu_item_id: createTranslationDto.menu_item_id,
        language_code: createTranslationDto.language_code,
        name: createTranslationDto.name,
        description: createTranslationDto.description,
      }, {
        onConflict: 'menu_item_id,language_code',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get translations for a menu item
   */
  async findByMenuItem(menuItemId: string, userId: string, userRole: string) {
    await this.menuItemsService.findOne(menuItemId, userId, userRole);

    const { data, error } = await this.supabase
      .from('menu_item_translations')
      .select('*')
      .eq('menu_item_id', menuItemId);

    if (error) throw error;
    return data;
  }

  /**
   * Delete translation
   */
  async remove(menuItemId: string, languageCode: string, userId: string, userRole: string) {
    await this.menuItemsService.findOne(menuItemId, userId, userRole);

    const { error } = await this.supabase
      .from('menu_item_translations')
      .delete()
      .eq('menu_item_id', menuItemId)
      .eq('language_code', languageCode);

    if (error) throw error;
    return { message: 'Translation deleted successfully' };
  }
}
