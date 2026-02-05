import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { PublicLocalService } from './public-local.service';
import { DisplayCacheService } from './display-cache.service';

@Injectable()
export class PublicService {
  private localService: PublicLocalService | null = null;
  private supabase: SupabaseClient | null = null;
  private displayCache: DisplayCacheService | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localService: PublicLocalService,
    @Optional() displayCache: DisplayCacheService,
  ) {
    this.supabase = supabase;
    this.localService = localService || null;
    this.displayCache = displayCache || null;
  }

  /**
   * Get screen data by public token (for TV display)
   * Returns active menu based on time schedule with translated items
   * @param templateRotationIndex Optional index for template rotation (0-based)
   */
  async recordViewerHeartbeat(publicToken: string, sessionId: string): Promise<{ ok: boolean; allowed: boolean }> {
    if (this.localService) return this.localService.recordViewerHeartbeat(publicToken, sessionId);
    return { ok: false, allowed: false };
  }

  async getScreenByToken(publicToken: string, templateRotationIndex?: number) {
    // Use local service if available (local PostgreSQL mode)
    if (this.localService) {
      const key = this.displayCache
        ? DisplayCacheService.cacheKey(publicToken, templateRotationIndex)
        : null;
      if (key && this.displayCache) {
        const cached = this.displayCache.get<Awaited<ReturnType<PublicLocalService['getScreenByToken']>>>(key);
        if (cached) return cached;
      }
      const result = await this.localService.getScreenByToken(publicToken, templateRotationIndex);
      if (key && this.displayCache) this.displayCache.set(key, result);
      return result;
    }

    // Supabase fallback (if Supabase is configured)
    if (!this.supabase) {
      throw new Error('Neither local service nor Supabase client is available');
    }

    return this.getScreenByTokenSupabase(publicToken);
  }

  private async getScreenByTokenSupabase(publicTokenOrSlug: string) {
    // Önce slug ile dene
    let { data: screen, error: screenError } = await this.supabase!
      .from('screens')
      .select('id, name, location, business_id, animation_type, animation_duration, language_code, font_family, primary_color, background_style, background_color, background_image_url, logo_url')
      .eq('public_slug', publicTokenOrSlug)
      .eq('is_active', true)
      .single();

    // Eğer slug ile bulunamadıysa, token ile dene (geriye dönük uyumluluk)
    if (screenError || !screen) {
      const result = await this.supabase!
        .from('screens')
        .select('id, name, location, business_id, animation_type, animation_duration, language_code, font_family, primary_color, background_style, background_color, background_image_url, logo_url')
        .eq('public_token', publicTokenOrSlug)
        .eq('is_active', true)
        .single();
      
      screen = result.data;
      screenError = result.error;
    }

    if (screenError || !screen) {
      return {
        screen: null,
        notFound: true,
        menus: [],
        schedules: [],
      };
    }

    // Get default language if screen doesn't have one set
    const languageCode = screen.language_code || 'en';
    const { data: defaultLang } = await this.supabase!
      .from('languages')
      .select('code')
      .eq('is_default', true)
      .single();

    const activeLanguageCode = languageCode || defaultLang?.code || 'en';

    // Determine active menu based on current time using database function
    const { data: activeMenuId } = await this.supabase!
      .rpc('get_active_menu_for_screen', { p_screen_id: screen.id });

    if (!activeMenuId) {
      // Fallback: get first assigned menu
      const { data: fallbackMenu } = await this.supabase!
        .from('screen_menu')
        .select('menu_id')
        .eq('screen_id', screen.id)
        .order('display_order', { ascending: true })
        .limit(1)
        .single();

      if (!fallbackMenu) {
        return {
          screen: {
            id: screen.id,
            name: screen.name,
            location: screen.location,
            animation_type: screen.animation_type || 'fade',
            animation_duration: screen.animation_duration || 500,
          },
          menus: [],
        };
      }

      const menuId = fallbackMenu.menu_id;
      const menu = await this.getMenuWithItems(menuId, activeLanguageCode);
      return {
        screen: {
          id: screen.id,
          name: screen.name,
          location: screen.location,
          animation_type: screen.animation_type || 'fade',
          animation_duration: screen.animation_duration || 500,
        },
        menus: menu ? [menu] : [],
      };
    }

    // Get active menu with items
    const activeMenu = await this.getMenuWithItems(activeMenuId, activeLanguageCode);

    // Also get all scheduled menus for potential future switching
    const { data: schedules } = await this.supabase!
      .from('menu_schedules')
      .select(`
        menu_id,
        start_time,
        end_time,
        day_of_week,
        menus (
          id,
          name
        )
      `)
      .eq('screen_id', screen.id)
      .eq('is_active', true);

    return {
      screen: {
        id: screen.id,
        name: screen.name,
        location: screen.location,
        animation_type: screen.animation_type || 'fade',
        animation_duration: screen.animation_duration || 500,
        language_code: activeLanguageCode,
        font_family: screen.font_family || 'system-ui',
        primary_color: screen.primary_color || '#fbbf24',
        background_style: screen.background_style || 'gradient',
        background_color: screen.background_color || '#0f172a',
        background_image_url: screen.background_image_url,
        logo_url: screen.logo_url,
      },
      menus: activeMenu ? [activeMenu] : [],
      schedules: schedules || [],
    };
  }

  /**
   * Get menu with items and translations
   */
  private async getMenuWithItems(menuId: string, languageCode: string) {
    if (this.localService) {
      // Use local service method if available
      return this.localService.getMenuWithItems(menuId, languageCode);
    }

    // Supabase implementation
    const { data: menu, error: menuError } = await this.supabase!
      .from('menus')
      .select('id, name, description, slide_duration, is_active')
      .eq('id', menuId)
      .eq('is_active', true)
      .single();

    if (menuError || !menu) {
      return null;
    }

    // Get menu items
    const { data: items, error: itemsError } = await this.supabase!
      .from('menu_items')
      .select('*')
      .eq('menu_id', menuId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (itemsError) throw itemsError;

    // Get translations for items
    const itemIds = items?.map((item: any) => item.id) || [];
    const { data: translations } = await this.supabase!
      .from('menu_item_translations')
      .select('*')
      .in('menu_item_id', itemIds)
      .eq('language_code', languageCode);

    // Merge translations with items
    const itemsWithTranslations = (items || []).map((item: any) => {
      const translation = translations?.find((t: any) => t.menu_item_id === item.id);
      return {
        ...item,
        name: translation?.name || item.name,
        description: translation?.description || item.description,
      };
    });

    return {
      id: menu.id,
      name: menu.name,
      description: menu.description,
      slide_duration: menu.slide_duration || 5,
      items: itemsWithTranslations,
    };
  }
}
