import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsString()
  @IsNotEmpty()
  businessId: string;

  @IsString()
  @IsNotEmpty()
  successUrl: string;

  @IsString()
  @IsNotEmpty()
  cancelUrl: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  interval?: 'monthly' | 'yearly';

  @IsOptional()
  @IsIn(['en', 'tr', 'fr', 'auto'])
  locale?: 'en' | 'tr' | 'fr' | 'auto';
}
