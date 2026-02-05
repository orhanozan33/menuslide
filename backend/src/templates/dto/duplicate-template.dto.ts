import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class DuplicateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  display_name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  business_id?: string;
}
