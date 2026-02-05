import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MenuItemsService } from './menu-items.service';
import { TranslationsService } from './translations.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('menu-items')
@UseGuards(AuthGuard)
export class MenuItemsController {
  constructor(
    private readonly menuItemsService: MenuItemsService,
    private readonly translationsService: TranslationsService,
  ) {}

  @Post()
  create(
    @Body() createMenuItemDto: CreateMenuItemDto,
    @CurrentUser() user: any,
  ) {
    return this.menuItemsService.create(createMenuItemDto, user.id, user.role);
  }

  @Get()
  async findAll(@Query('menu_id') menuId: string, @CurrentUser() user: any) {
    if (!menuId) {
      throw new Error('menu_id query parameter is required');
    }
    return this.menuItemsService.findAll(menuId, user.id, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.menuItemsService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
    @CurrentUser() user: any,
  ) {
    return this.menuItemsService.update(id, updateMenuItemDto, user.id, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.menuItemsService.remove(id, user.id, user.role);
  }

  @Post(':id/translations')
  createTranslation(
    @Param('id') id: string,
    @Body() createTranslationDto: CreateTranslationDto,
    @CurrentUser() user: any,
  ) {
    return this.translationsService.upsert(
      { ...createTranslationDto, menu_item_id: id },
      user.id,
      user.role,
    );
  }

  @Get(':id/translations')
  getTranslations(@Param('id') id: string, @CurrentUser() user: any) {
    return this.translationsService.findByMenuItem(id, user.id, user.role);
  }

  @Delete(':id/translations/:languageCode')
  removeTranslation(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
    @CurrentUser() user: any,
  ) {
    return this.translationsService.remove(id, languageCode, user.id, user.role);
  }

  // TODO: Varyantlar (paket: 20'li, 25'li, 30'lu) - variantsService henüz implement edilmedi
}
