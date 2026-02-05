import { Module } from '@nestjs/common';
import { HowToUseContentController } from './how-to-use-content.controller';
import { HowToUseContentService } from './how-to-use-content.service';

@Module({
  controllers: [HowToUseContentController],
  providers: [HowToUseContentService],
  exports: [HowToUseContentService],
})
export class HowToUseContentModule {}
