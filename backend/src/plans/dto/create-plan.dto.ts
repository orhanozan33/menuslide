import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsNumber, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  display_name: string;

  @IsInt()
  @IsNotEmpty()
  max_screens: number; // -1 for unlimited

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price_monthly: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price_yearly?: number;

  @IsString()
  @IsOptional()
  stripe_price_id_monthly?: string;

  @IsString()
  @IsOptional()
  stripe_price_id_yearly?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
