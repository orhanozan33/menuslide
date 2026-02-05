import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class SaveAsTemplateDto {
  @IsIn(['system', 'user'])
  scope: 'system' | 'user';

  @IsOptional()
  @IsUUID()
  target_user_id?: string;
}
