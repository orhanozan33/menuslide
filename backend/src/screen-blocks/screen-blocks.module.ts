import { Module, forwardRef } from '@nestjs/common';
import { ScreenBlocksController } from './screen-blocks.controller';
import { ScreenBlocksService } from './screen-blocks.service';
import { ScreenBlocksLocalService } from './screen-blocks-local.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ScreenBlocksController],
  providers: [ScreenBlocksService, ScreenBlocksLocalService],
  exports: [ScreenBlocksService],
})
export class ScreenBlocksModule {}
