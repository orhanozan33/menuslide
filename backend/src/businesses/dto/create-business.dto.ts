import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['restaurant', 'cafe', 'patisserie', 'pizza', 'burger', 'bakery', 'bar', 'fastfood', 'icecream', 'other'])
  business_type?: string;

  @IsString()
  @IsOptional()
  qr_background_image_url?: string;

  @IsString()
  @IsOptional()
  qr_background_color?: string;
}
