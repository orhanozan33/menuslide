import { IsEmail, IsString, IsOptional, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsUUID()
  business_id?: string;

  @IsOptional()
  @IsString()
  role?: string; // 'business_user' or 'super_admin'

  @IsOptional()
  @IsUUID()
  plan_id?: string; // Plan ID for subscription
}
