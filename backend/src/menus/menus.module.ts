import { Module } from '@nestjs/common';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { MenusLocalService } from './menus-local.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MenusController],
  providers: [MenusService, MenusLocalService],
  exports: [MenusService, MenusLocalService],
})
export class MenusModule {}
