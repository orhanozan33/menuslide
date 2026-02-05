import { PartialType } from '@nestjs/mapped-types';
import { CreateContentLibraryItemDto } from './create-content-library-item.dto';

export class UpdateContentLibraryItemDto extends PartialType(CreateContentLibraryItemDto) {}
