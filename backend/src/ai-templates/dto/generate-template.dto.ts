import { IsString, IsOptional, IsUUID, IsIn } from 'class-validator';

export class GenerateTemplateDto {
  @IsUUID()
  @IsOptional()
  business_id?: string;

  @IsUUID()
  @IsOptional()
  screen_id?: string;

  @IsString()
  @IsOptional()
  business_type?: string;

  @IsString()
  @IsOptional()
  @IsIn(['1', '2', '3', '4', '5', '6'])
  screen_count?: string;

  @IsString()
  @IsOptional()
  @IsIn(['modern', 'classic', 'minimal', 'colorful'])
  preferred_style?: string;

  @IsString()
  @IsOptional()
  @IsIn(['menu-heavy', 'image-heavy', 'campaign-focused'])
  content_type?: string;

  @IsString()
  @IsOptional()
  @IsIn(['main-menu', 'campaign'])
  menu_purpose?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  @IsIn(['low', 'medium', 'premium'])
  price_level?: string;
}
