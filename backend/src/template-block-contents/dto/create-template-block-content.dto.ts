import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTemplateBlockContentDto {
  @IsString()
  @IsNotEmpty()
  template_block_id: string;

  @IsString()
  @IsNotEmpty()
  content_type: string; // 'image', 'icon', 'text', 'badge', 'background', 'video'

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined || value === null ? undefined : (typeof value === 'string' ? parseFloat(value) : value)))
  @IsNumber()
  price?: number;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsString()
  @IsOptional()
  icon_name?: string;

  @IsString()
  @IsOptional()
  text_color?: string;

  @IsString()
  @IsOptional()
  background_color?: string;

  @IsString()
  @IsOptional()
  background_gradient?: string;

  @IsString()
  @IsOptional()
  badge_style?: string;

  @IsString()
  @IsOptional()
  campaign_text?: string; // For badges: 'NEW', 'HOT', '%50'

  @IsString()
  @IsOptional()
  style_config?: string; // JSON string for style configuration

  @IsNumber()
  @IsOptional()
  display_order?: number;
}
