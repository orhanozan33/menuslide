import { IsUUID, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class ApplyTemplateDto {
  @IsUUID()
  @IsNotEmpty()
  template_id: string;

  @IsUUID()
  @IsNotEmpty()
  screen_id: string;

  @IsBoolean()
  @IsOptional()
  keep_content?: boolean; // If true, keep existing content; if false, reset content
}
