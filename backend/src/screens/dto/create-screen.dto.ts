import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsInt, IsIn, Min } from 'class-validator';

export class CreateScreenDto {
  @IsUUID()
  @IsNotEmpty()
  business_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['fade', 'slide', 'zoom'])
  animation_type?: string;

  @IsInt()
  @IsOptional()
  @Min(100)
  animation_duration?: number;

  @IsString()
  @IsOptional()
  language_code?: string;

  @IsString()
  @IsOptional()
  font_family?: string;

  @IsString()
  @IsOptional()
  primary_color?: string;

  @IsString()
  @IsOptional()
  @IsIn(['gradient', 'solid', 'image'])
  background_style?: string;

  @IsString()
  @IsOptional()
  background_color?: string;

  @IsString()
  @IsOptional()
  background_image_url?: string;

  @IsString()
  @IsOptional()
  logo_url?: string;

  @IsUUID()
  @IsOptional()
  template_id?: string;

  @IsString()
  @IsOptional()
  @IsIn(['fade', 'slide-left', 'slide-right', 'zoom', 'flip', 'car-pull', 'curtain', 'wipe'])
  template_transition_effect?: string;

  @IsString()
  @IsOptional()
  @IsIn(['none', 'frame_1', 'frame_2', 'frame_3', 'frame_4', 'frame_5', 'frame_6', 'frame_7', 'frame_8', 'frame_9', 'frame_10',
    'frame_wood', 'frame_wood_light', 'frame_pattern', 'frame_pattern_geo', 'frame_snowy', 'frame_snowy_soft',
    'frame_icy', 'frame_icy_crystal', 'frame_ivy', 'frame_ivy_light', 'frame_stone', 'frame_copper'])
  frame_type?: string;

  @IsString()
  @IsOptional()
  ticker_text?: string;

  @IsString()
  @IsOptional()
  @IsIn(['default', 'bold', 'elegant', 'modern', 'script', 'condensed'])
  ticker_style?: string;
}
