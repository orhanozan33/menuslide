import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CreateContentLibraryCategoryDto {
  @IsString()
  @MaxLength(100)
  slug: string;

  @IsString()
  @MaxLength(100)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  icon?: string;

  @IsOptional()
  @IsNumber()
  display_order?: number;
}
