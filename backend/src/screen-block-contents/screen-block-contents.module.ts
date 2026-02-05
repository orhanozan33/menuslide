import { Module } from '@nestjs/common';
import { ScreenBlockContentsController } from './screen-block-contents.controller';
import { ScreenBlockContentsService } from './screen-block-contents.service';
import { ScreenBlockContentsLocalService } from './screen-block-contents-local.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ScreenBlockContentsController],
  providers: [ScreenBlockContentsService, ScreenBlockContentsLocalService],
  exports: [ScreenBlockContentsService],
})
export class ScreenBlockContentsModule {}
