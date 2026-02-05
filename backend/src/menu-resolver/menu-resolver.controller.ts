import { Controller, Get, Param, Query } from '@nestjs/common';
import { MenuResolverService } from './menu-resolver.service';

@Controller('menu-resolver')
export class MenuResolverController {
  constructor(private readonly menuResolverService: MenuResolverService) {}

  @Get('business/:businessId')
  async getActiveMenu(
    @Param('businessId') businessId: string,
    @Query('lang') lang: string = 'en',
    @Query('screenId') screenId?: string,
  ) {
    const appearance = await this.menuResolverService.getBusinessQrAppearance(businessId);
    const businessName = appearance?.name ?? null;
    const allMenus = await this.menuResolverService.getAllMenus(businessId, lang);

    if (!allMenus || allMenus.length === 0) {
      return {
        menus: [],
        business_name: businessName || null,
        qr_background_image_url: appearance?.qr_background_image_url ?? null,
        qr_background_color: appearance?.qr_background_color ?? null,
        message: 'Bu işletme için henüz menü oluşturulmamış.',
      };
    }

    const formattedMenus = allMenus.map((menu: any) => {
      const pagesConfig = Array.isArray(menu.pages_config) ? menu.pages_config : [];
      const pageNames = pagesConfig
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((p: any) => p.name || 'Sayfa');

      const itemsByPage = new Map<number, any[]>();
      (menu.items || []).forEach((item: any) => {
        const pageIdx = item.page_index ?? 0;
        if (!itemsByPage.has(pageIdx)) itemsByPage.set(pageIdx, []);
        itemsByPage.get(pageIdx)!.push({
          ...item,
          display_name: item.name,
          display_description: item.description,
          display_price: item.price,
        });
      });

      const categories: any[] = [];
      const sortedPageIndices = Array.from(itemsByPage.keys()).sort((a, b) => a - b);
      sortedPageIndices.forEach((pageIdx) => {
        const pageName = pageNames[pageIdx] || `Sayfa ${pageIdx + 1}`;
        categories.push({ name: pageName, items: itemsByPage.get(pageIdx)! });
      });

      if (categories.length === 0 && (menu.items || []).length > 0) {
        categories.push({
          name: 'Menü',
          items: menu.items.map((item: any) => ({
            ...item,
            display_name: item.name,
            display_description: item.description,
            display_price: item.price,
          })),
        });
      }

      return {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        categories,
      };
    });

    return {
      menus: formattedMenus,
      business_name: businessName || null,
      qr_background_image_url: appearance?.qr_background_image_url ?? null,
      qr_background_color: appearance?.qr_background_color ?? null,
    };
  }

  @Get('item/:itemId')
  async getMenuItemDetails(
    @Param('itemId') itemId: string,
    @Query('lang') lang: string = 'en',
  ) {
    return this.menuResolverService.getMenuItemDetails(itemId, lang);
  }

  @Get('languages/:businessId')
  async getMenuLanguages(@Param('businessId') businessId: string) {
    return this.menuResolverService.getMenuLanguages(businessId);
  }
}
