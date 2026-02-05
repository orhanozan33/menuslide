import { Module } from '@nestjs/common';
import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';
import { MenuItemsLocalService } from './menu-items-local.service';
import { TranslationsService } from './translations.service';
import { MenusModule } from '../menus/menus.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [MenusModule, DatabaseModule],
  controllers: [MenuItemsController],
  providers: [MenuItemsService, MenuItemsLocalService, TranslationsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
