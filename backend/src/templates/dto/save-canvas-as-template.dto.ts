import { IsString, IsNotEmpty, IsOptional, IsIn, IsUUID, IsArray } from 'class-validator';

export class SaveCanvasAsTemplateDto {
  @IsString()
  @IsNotEmpty()
  display_name: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Canvas shapes (text, image, video, imageRotation) */
  @IsArray()
  shapes: unknown[];

  /** Background color hex */
  @IsString()
  backgroundColor: string;

  /** Layout: full | 2block | 3block | 4block | 5block | 6block */
  @IsString()
  layoutType: string;

  /** Admin: 'system' = all users, 'user' = specific user (target_user_id required) */
  @IsIn(['system', 'user'])
  scope: 'system' | 'user';

  /** Admin only: when scope=user, which user to save for */
  @IsOptional()
  @IsUUID()
  target_user_id?: string;

  /** Önizleme görseli URL (örn. /uploads/xxx) — canvas PNG export yüklendiğinde */
  @IsOptional()
  @IsString()
  preview_image_url?: string;

  /** Editördeki canvas genişliği (CanvasDesignEditor: 800). TV 1920×1080'e scale edilir. */
  @IsOptional()
  designWidth?: number;

  /** Editördeki canvas yüksekliği (CanvasDesignEditor: 450). */
  @IsOptional()
  designHeight?: number;
}
