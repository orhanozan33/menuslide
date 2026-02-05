import { Module } from '@nestjs/common';
import { ContentLibraryController } from './content-library.controller';
import { ContentLibraryService } from './content-library.service';
import { ContentLibraryLocalService } from './content-library-local.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ContentLibraryController],
  providers: [ContentLibraryService, ContentLibraryLocalService],
  exports: [ContentLibraryService],
})
export class ContentLibraryModule {}
