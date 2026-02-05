import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { TemplatesLocalService } from './templates-local.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplatesLocalService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
