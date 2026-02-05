import { Expose } from 'class-transformer';
import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';

export class UpdateContentLibraryCategoryDto {
  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  icon?: string;

  @Expose()
  @IsOptional()
  @IsNumber()
  display_order?: number;
}
