import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class HomeChannelItemDto {
  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;
}

export class UpdateHomeChannelsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeChannelItemDto)
  channels: HomeChannelItemDto[];
}
