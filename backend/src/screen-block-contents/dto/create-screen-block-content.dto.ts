import { IsUUID, IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateScreenBlockContentDto {
  @IsUUID()
  screen_block_id: string;

  @IsString()
  @IsNotEmpty()
  content_type: 'product_list' | 'single_product' | 'image' | 'icon' | 'text' | 'price' | 'campaign_badge' | 'video';

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsString()
  @IsOptional()
  icon_name?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsString()
  @IsOptional()
  campaign_text?: string;

  @IsString()
  @IsOptional()
  background_color?: string;

  @IsString()
  @IsOptional()
  background_image_url?: string;

  @IsString()
  @IsOptional()
  text_color?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  text_position_x?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  text_position_y?: number;

  @IsNumber()
  @IsOptional()
  @Min(8)
  text_size?: number;

  @IsString()
  @IsOptional()
  font_weight?: string;

  @IsUUID()
  @IsOptional()
  menu_item_id?: string;

  @IsUUID()
  @IsOptional()
  menu_id?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  display_order?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
