import { Module } from '@nestjs/common';
import { TemplateBlockContentsController } from './template-block-contents.controller';
import { TemplateBlockContentsService } from './template-block-contents.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TemplateBlockContentsController],
  providers: [TemplateBlockContentsService],
  exports: [TemplateBlockContentsService],
})
export class TemplateBlockContentsModule {}
