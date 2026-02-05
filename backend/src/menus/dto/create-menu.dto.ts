import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsUUID, Min, IsArray } from 'class-validator';

export class CreateMenuDto {
  @IsUUID()
  @IsNotEmpty()
  business_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  slide_duration?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsArray()
  @IsOptional()
  pages_config?: { name: string; order: number }[];
}
