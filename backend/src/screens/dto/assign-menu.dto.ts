import { IsUUID, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class AssignMenuDto {
  @IsUUID()
  @IsNotEmpty()
  screen_id: string;

  @IsUUID()
  @IsNotEmpty()
  menu_id: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number;
}
