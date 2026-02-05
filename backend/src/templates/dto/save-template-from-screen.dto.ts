import { IsString, IsNotEmpty, IsOptional, IsUUID, IsIn } from 'class-validator';

export class SaveTemplateFromScreenDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  display_name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  screen_id: string;

  @IsUUID()
  @IsOptional()
  business_id?: string;

  /** Admin için: 'system' = sistem şablonu (herkes erişir), 'user' = kendi şablonu */
  @IsOptional()
  @IsIn(['user', 'system'])
  scope?: 'user' | 'system';
}
