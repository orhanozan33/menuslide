import { IsArray, IsUUID, IsInt, Min, ValidateNested, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateRotationItem {
  @IsUUID()
  template_id: string;

  @IsInt()
  @Min(1)
  display_duration: number; // seconds
}

export class PublishTemplatesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateRotationItem)
  templates: TemplateRotationItem[];

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
