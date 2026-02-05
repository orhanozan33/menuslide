import { IsUUID, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, Max, Matches } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  @IsNotEmpty()
  screen_id: string;

  @IsUUID()
  @IsNotEmpty()
  menu_id: string;

  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'start_time must be in HH:MM:SS format',
  })
  @IsNotEmpty()
  start_time: string;

  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'end_time must be in HH:MM:SS format',
  })
  @IsNotEmpty()
  end_time: string;

  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  day_of_week?: number; // 0=Sunday, 1=Monday, ..., 6=Saturday, null=all days

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
