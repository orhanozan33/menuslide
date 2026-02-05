import { Module } from '@nestjs/common';
import { HomeChannelsController } from './home-channels.controller';
import { HomeChannelsService } from './home-channels.service';

@Module({
  controllers: [HomeChannelsController],
  providers: [HomeChannelsService],
  exports: [HomeChannelsService],
})
export class HomeChannelsModule {}
