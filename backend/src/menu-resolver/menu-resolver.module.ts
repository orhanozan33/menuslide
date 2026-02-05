import { Module } from '@nestjs/common';
import { MenuResolverController } from './menu-resolver.controller';
import { MenuResolverService } from './menu-resolver.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MenuResolverController],
  providers: [MenuResolverService],
  exports: [MenuResolverService],
})
export class MenuResolverModule {}
