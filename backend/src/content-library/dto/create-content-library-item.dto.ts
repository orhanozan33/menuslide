import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsIn, Min } from 'class-validator';

export class CreateContentLibraryItemDto {
  @IsString()
  @IsNotEmpty({ message: 'İçerik adı boş olamaz' })
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['image', 'icon', 'background', 'drink', 'text', 'video'])
  type: 'image' | 'icon' | 'background' | 'drink' | 'text' | 'video';

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  content?: string; // For emoji icons

  @IsString()
  @IsOptional()
  icon?: string; // Category icon

  @IsString()
  @IsOptional()
  gradient?: string; // For gradient backgrounds

  @IsString()
  @IsOptional()
  color?: string; // For solid color backgrounds

  @IsString()
  @IsOptional()
  template?: string; // For text templates

  @IsString()
  @IsOptional()
  sample?: string; // Sample text for text templates

  @IsNumber()
  @IsOptional()
  @Min(0)
  display_order?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
