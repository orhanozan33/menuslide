import { IsOptional, IsNumber, IsString, IsBoolean, IsIn, Min, Max } from 'class-validator';

export class UpdateScreenBlockDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  position_x?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  position_y?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(100)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(100)
  height?: number;

  @IsOptional()
  @IsNumber()
  z_index?: number;

  @IsOptional()
  @IsString()
  @IsIn(['fade', 'slide', 'zoom', 'rotate', 'none'])
  animation_type?: string;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(5000)
  animation_duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2000)
  animation_delay?: number;

  @IsOptional()
  @IsBoolean()
  is_locked?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  display_order?: number;
}
