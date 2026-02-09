import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PublicLocalService } from './public-local.service';
import { DisplayCacheService } from './display-cache.service';
import { DisplayRateLimitService } from './display-rate-limit.service';
import { DatabaseModule } from '../database/database.module';
import { PlayerController } from '../player/player.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicController, PlayerController],
  providers: [PublicService, PublicLocalService, DisplayCacheService, DisplayRateLimitService],
})
export class PublicModule {}
