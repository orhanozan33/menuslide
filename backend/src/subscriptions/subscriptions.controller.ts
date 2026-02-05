import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  RawBodyRequest,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { StripeLocalService } from './stripe-local.service';
import { DatabaseService } from '../database/database.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { CheckoutDto } from './dto/checkout.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly stripeService: StripeService,
    private readonly stripeLocalService: StripeLocalService,
    private readonly database: DatabaseService,
  ) {}

  @Get('business/:businessId')
  @UseGuards(AuthGuard)
  findByBusiness(
    @Param('businessId') businessId: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionsService.findByBusiness(businessId, user.id, user.role);
  }

  @Get(':id/payments')
  @UseGuards(AuthGuard)
  getPaymentHistory(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.subscriptionsService.getPaymentHistory(id, user.id, user.role);
  }

  @Post('checkout')
  @UseGuards(AuthGuard)
  async createCheckout(
    @Body() body: CheckoutDto,
    @CurrentUser() user: any,
  ) {
    // Verify user has access to business (business_user can only subscribe their own business)
    // super_admin and admin can subscribe any business
    if (user.role === 'business_user') {
      const userBusinessId = user.business_id;
      if (!userBusinessId) {
        throw new BadRequestException('No business linked to your account. Contact support.');
      }
      const reqBizId = String(body.businessId || '').trim();
      const userBizId = String(userBusinessId).trim();
      if (userBizId !== reqBizId) {
        console.warn('[checkout] business_id mismatch:', { userBizId, reqBizId, userId: user.id });
        throw new BadRequestException('Access denied to this business');
      }
    }

    if (!body.planId || !body.businessId || !body.successUrl || !body.cancelUrl) {
      throw new BadRequestException('Missing required fields: planId, businessId, successUrl, cancelUrl');
    }

    const interval = body.interval || 'monthly';
    const locale = body.locale || 'en';
    if (!this.stripeLocalService.isAvailable() && !this.stripeService.isAvailable()) {
      throw new BadRequestException('Stripe is not configured. Add STRIPE_SECRET_KEY to environment.');
    }
    let session;
    try {
      session = this.stripeLocalService.isAvailable()
        ? await this.stripeLocalService.createCheckoutSession(
            body.planId,
            body.businessId,
            body.successUrl,
            body.cancelUrl,
            interval,
            locale,
            user.email,
          )
        : await this.stripeService.createCheckoutSession(
            body.planId,
            body.businessId,
            body.successUrl,
            body.cancelUrl,
          );
    } catch (err: any) {
      console.error('[checkout] Error:', err?.message || err);
      const msg = err?.response?.message || err?.message || 'Checkout failed';
      throw new BadRequestException(Array.isArray(msg) ? msg[0] : msg);
    }

    if (!session?.url) {
      throw new BadRequestException('Stripe did not return a checkout URL');
    }
    return { sessionId: session.id, url: session.url };
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body required for webhook verification');
    }
    if (!this.stripeLocalService.isAvailable() && !this.stripeService.isAvailable()) {
      throw new BadRequestException('Stripe is not configured.');
    }
    if (this.stripeLocalService.isAvailable()) {
      return this.stripeLocalService.handleWebhook(rawBody, signature);
    }
    return this.stripeService.handleWebhook(rawBody, signature);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard)
  async cancelSubscription(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    // Get subscription (use local DB)
    const subResult = await this.database.query(
      'SELECT stripe_subscription_id, business_id FROM subscriptions WHERE id = $1',
      [id],
    );
    const subscription = subResult.rows[0];
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Verify access
    if (user.role !== 'super_admin') {
      const userResult = await this.database.query(
        'SELECT business_id FROM users WHERE id = $1',
        [user.id],
      );
      if (userResult.rows[0]?.business_id !== subscription.business_id) {
        throw new Error('Access denied');
      }
    }

    if (!this.stripeService.isAvailable() && !this.stripeLocalService.isAvailable()) {
      throw new BadRequestException('Stripe is not configured. Cannot cancel subscription.');
    }
    if (this.stripeService.isAvailable()) {
      return this.stripeService.cancelSubscription(subscription.stripe_subscription_id);
    }
    throw new BadRequestException('Cancel subscription is only available when Stripe is configured.');
  }
}
