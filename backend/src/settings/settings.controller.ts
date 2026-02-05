import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private configService: ConfigService) {}

  /** Herkese açık: ödeme sayfasında Abone Ol butonunun gösterilip gösterilmeyeceği */
  @Get('stripe-available')
  getStripeAvailable() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const configured =
      !!secretKey &&
      secretKey.length > 0 &&
      secretKey !== 'sk_test_your_stripe_secret_key';
    return { available: !!configured };
  }

  @Get('stripe-status')
  @UseGuards(AuthGuard)
  getStripeStatus(@CurrentUser() user: { role?: string }) {
    if (user?.role !== 'super_admin' && user?.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const publishableKey = this.configService.get<string>('STRIPE_PUBLISHABLE_KEY');
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    const configured =
      !!secretKey &&
      secretKey.length > 0 &&
      secretKey !== 'sk_test_your_stripe_secret_key';
    const stripeMode = secretKey?.startsWith('sk_live_') ? 'live' : 'test';
    return {
      configured,
      stripeMode,
      hasPublishableKey: !!publishableKey && publishableKey.length > 0 && publishableKey !== 'pk_test_your_publishable_key',
      hasWebhookSecret: !!webhookSecret && webhookSecret.length > 0 && webhookSecret !== 'whsec_your_webhook_secret',
    };
  }
}
