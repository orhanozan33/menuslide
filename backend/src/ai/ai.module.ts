import { Module } from '@nestjs/common';
import { RemoveBackgroundController } from './remove-background.controller';
import { RemoveBackgroundService } from './remove-background.service';

@Module({
  controllers: [RemoveBackgroundController],
  providers: [RemoveBackgroundService],
  exports: [RemoveBackgroundService],
})
export class AiModule {}
