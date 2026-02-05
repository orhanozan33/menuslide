import { Module } from '@nestjs/common';
import { QrMenusController } from './qr-menus.controller';
import { QrMenusLocalService } from './qr-menus-local.service';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';

@Module({
  imports: [DatabaseModule],
  controllers: [QrMenusController],
  providers: [QrMenusLocalService, DatabaseService],
  exports: [QrMenusLocalService],
})
export class QrMenusModule {}
