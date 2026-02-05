import { Module } from '@nestjs/common';
import { TemplateBlocksController } from './template-blocks.controller';
import { TemplateBlocksService } from './template-blocks.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TemplateBlocksController],
  providers: [TemplateBlocksService],
  exports: [TemplateBlocksService],
})
export class TemplateBlocksModule {}
