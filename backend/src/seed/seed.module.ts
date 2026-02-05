import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SeedService } from './seed.service';
import { OneTimeImportService } from './one-time-import.service';

@Module({
  imports: [DatabaseModule],
  providers: [SeedService, OneTimeImportService],
  exports: [SeedService],
})
export class SeedModule {}
