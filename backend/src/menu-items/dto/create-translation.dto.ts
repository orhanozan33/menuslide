import { IsUUID, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTranslationDto {
  @IsUUID()
  @IsNotEmpty()
  menu_item_id: string;

  @IsString()
  @IsNotEmpty()
  language_code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
