import { IsOptional, IsBoolean, IsUUID, IsString, IsEmail, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean; // For enabling/disabling user

  @IsOptional()
  @IsUUID()
  business_id?: string;

  @IsOptional()
  @IsUUID()
  plan_id?: string; // Change user's plan

  @IsOptional()
  @IsString()
  business_name?: string; // Update business name

  /** Admin kullanıcı için sayfa yetkileri (super_admin only): { page_key: { view: true, edit: false, ... } } - net action bazlı */
  @IsOptional()
  admin_permissions?: Record<string, Record<string, boolean>>;
}
