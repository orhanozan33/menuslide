import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, Max, IsUUID, IsObject } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  display_name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @Max(16)
  block_count: number;

  @IsString()
  @IsOptional()
  preview_image_url?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsUUID()
  @IsOptional()
  target_user_id?: string; // Admin için: başka bir kullanıcı adına template oluşturma

  /** Hareketli menü bölgesi: animationType, interval (sn), visibleItemCount */
  @IsOptional()
  animated_zone_config?: {
    enabled?: boolean;
    animationType?: 'slide-up' | 'slide-left' | 'fade' | 'marquee';
    interval?: number;
    visibleItemCount?: number;
  };

  /** Canvas tasarım verisi: shapes, backgroundColor, layoutType */
  @IsOptional()
  @IsObject()
  canvas_design?: { shapes?: unknown[]; backgroundColor?: string; layoutType?: string };
}
