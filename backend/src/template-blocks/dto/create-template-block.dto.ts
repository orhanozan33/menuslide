import { IsUUID, IsInt, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTemplateBlockDto {
  @IsUUID()
  template_id: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  block_index: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  position_x: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  position_y: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  width: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  height: number;
}
