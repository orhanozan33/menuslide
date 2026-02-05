import { IsOptional, IsObject } from 'class-validator';

export class UpdateHowToUseContentDto {
  @IsOptional()
  @IsObject()
  texts?: Record<string, string>;

  @IsOptional()
  @IsObject()
  images?: Record<string, string>;
}
