import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateMenuItemDto {
  @IsUUID()
  @IsNotEmpty()
  menu_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  page_index?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
