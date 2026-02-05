import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRegistrationRequestDto {
  @IsString()
  @MinLength(1)
  businessName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  tvCount?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
