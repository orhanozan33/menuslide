import { Module, forwardRef } from '@nestjs/common';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';
import { ScreensLocalService } from './screens-local.service';
import { ScreenBlocksModule } from '../screen-blocks/screen-blocks.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [forwardRef(() => ScreenBlocksModule), DatabaseModule],
  controllers: [ScreensController],
  providers: [ScreensService, ScreensLocalService],
  exports: [ScreensService, ScreensLocalService],
})
export class ScreensModule {}
