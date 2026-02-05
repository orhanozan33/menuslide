import { PartialType } from '@nestjs/mapped-types';
import { CreateScreenBlockContentDto } from './create-screen-block-content.dto';

export class UpdateScreenBlockContentDto extends PartialType(CreateScreenBlockContentDto) {}
