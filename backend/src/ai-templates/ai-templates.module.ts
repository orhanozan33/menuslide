import { Module } from '@nestjs/common';
import { AITemplatesController } from './ai-templates.controller';
import { AITemplateGeneratorService } from './ai-template-generator.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AITemplatesController],
  providers: [AITemplateGeneratorService],
  exports: [AITemplateGeneratorService],
})
export class AITemplatesModule {}
