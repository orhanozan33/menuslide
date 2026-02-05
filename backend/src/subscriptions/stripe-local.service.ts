import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { DatabaseService } from '../database/database.service';
import { ScreensLocalService } from '../screens/screens-local.service';

/**
 * Stripe checkout using local PostgreSQL (when Supabase is not configured)
 */
@Injectable()
export class StripeLocalService {
  private stripe: Stripe | null = null;

  constructor(
    private configService: ConfigService,
    private database: DatabaseService,
    private screensLocalService: ScreensLocalService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey && stripeSecretKey.length > 0 && stripeSecretKey !== 'sk_test_your_stripe_secret_key') {
      this.stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    }
  }

  isAvailable(): boolean {
    return !!this.stripe;
  }

  async createCheckoutSession(
    planId: string,
    businessId: string,
    successUrl: string,
    cancelUrl: string,
    interval: 'monthly' | 'yearly' = 'monthly',
    locale: 'en' | 'tr' | 'fr' | 'auto' = 'en',
    userEmail?: string,
  ) {
    if (!this.stripe) {
      throw new BadRequestException('STRIPE_SECRET_KEY is not configured. Add it to backend .env');
    }

    // Get plan from PostgreSQL
    const planResult = await this.database.query(
      'SELECT * FROM plans WHERE id = $1',
      [planId],
    );
    if (planResult.rows.length === 0) {
      throw new BadRequestException('Plan not found');
    }
    const plan = planResult.rows[0];

    // Get or create Stripe customer
    const subResult = await this.database.query(
      `SELECT stripe_customer_id FROM subscriptions
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [businessId],
    );
    let customerId = subResult.rows[0]?.stripe_customer_id;

    const email = userEmail || (await this.database.query(
      'SELECT email FROM users WHERE business_id = $1 LIMIT 1',
      [businessId],
    )).rows[0]?.email;

    if (!customerId) {
      const businessResult = await this.database.query(
        'SELECT name FROM businesses WHERE id = $1',
        [businessId],
      );
      const customer = await this.stripe.customers.create({
        email: email,
        name: businessResult.rows[0]?.name,
        metadata: { business_id: businessId },
      });
      customerId = customer.id;
    } else if (email) {
      try {
        await this.stripe.customers.update(customerId, { email });
      } catch {
        // Ignore update errors (e.g. invalid customer)
      }
    }

    const useYearly = interval === 'yearly';
    // Checkout uses price_data (plan fiyatlarından dinamik), Stripe Price ID zorunlu değil
    const screensLabel = plan.max_screens === -1 ? 'Unlimited' : plan.max_screens;

    // Extended corporate description to fill left panel and reduce black space
    const corporateDescription = [
      'MenuSlide by Findpoint',
      'Digital menu and signage platform trusted by businesses across Canada.',
      '',
      'What you get:',
      `• ${screensLabel} screen(s) for your TV displays`,
      '• Unlimited digital menus — create and manage as many as you need',
      '• Instant updates — change your menu in seconds, it reflects immediately',
      '• Templates and content library — ready-to-use designs',
      '• Priority support — we help you get set up and keep running',
      '',
      'Why MenuSlide?',
      '• No long-term contracts — cancel anytime',
      '• Secure payments via Stripe',
      '• Works on any TV or display with a browser',
      '• Used by restaurants, cafés, and businesses across Canada',
      '',
      'Need help? Visit www.menuslide.com or contact us at www.findpoint.ca',
    ].join('\n');

    const corporateAfter = 'Manage or cancel your subscription anytime from your account. Support: www.menuslide.com';

    // Package preview image URL (Stripe fetches server-side - must be publicly accessible)
    const appUrl = this.configService.get<string>('CORS_ORIGIN') || this.configService.get<string>('FRONTEND_URL') || 'https://menuslide.com';
    const previewImageUrl = this.configService.get<string>('STRIPE_CHECKOUT_PREVIEW_IMAGE')
      || `${appUrl.replace(/\/$/, '')}/checkout-package-preview.png`;
    const isPublicUrl = /^https?:\/\/(?!localhost|127\.0\.0\.1)[^/]+/i.test(previewImageUrl);

    const unitAmount = useYearly
      ? Math.round((plan.price_yearly ?? plan.price_monthly * 12 * 0.9) * 100)
      : Math.round((plan.price_monthly || 0) * 100);
    const recurringInterval = useYearly ? 'year' : 'month';

    let session;
    try {
      session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        automatic_tax: { enabled: true },
        billing_address_collection: 'required',
        customer_update: { address: 'auto' },
        line_items: [
          {
            price_data: {
              currency: 'cad',
              unit_amount: unitAmount,
              tax_behavior: 'exclusive',
              recurring: { interval: recurringInterval as 'month' | 'year' },
              product_data: {
                name: plan.display_name || `Subscription (${screensLabel} screens)`,
                description: corporateDescription,
                tax_code: 'txcd_10103000',
                ...(isPublicUrl && { images: [previewImageUrl] }),
                metadata: { plan_id: planId },
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        locale,
        metadata: { business_id: businessId, plan_id: planId },
        payment_method_collection: 'always',
        custom_text: {
          submit: { message: 'Secure subscription powered by Stripe. Your card will be charged according to the plan above.' },
          after_submit: { message: corporateAfter },
        },
      });
    } catch (stripeErr: any) {
      const msg = stripeErr?.raw?.message || stripeErr?.message || 'Stripe checkout failed';
      throw new BadRequestException(`Stripe: ${msg}`);
    }

    return session;
  }

  /**
   * Handle Stripe webhook (PostgreSQL) – creates subscription + auto-creates screens
   */
  async handleWebhook(payload: Buffer, signature: string): Promise<{ received: boolean }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret || webhookSecret === 'whsec_your_webhook_secret') {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET is required for webhooks');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const businessId = session.metadata?.business_id;
    const planId = session.metadata?.plan_id;

    if (!businessId || !planId) {
      console.error('[StripeLocal] Checkout completed: missing metadata', { businessId, planId });
      return;
    }

    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      console.error('[StripeLocal] Checkout completed: no subscription id');
      return;
    }

    const stripeSub = await this.stripe!.subscriptions.retrieve(subscriptionId);
    const interval = stripeSub?.items?.data?.[0]?.plan?.interval;
    const billingInterval = interval === 'year' ? 'yearly' : interval === 'month' ? 'monthly' : null;

    const subCheck = await this.database.query(
      'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
      [stripeSub.id],
    );

    if (subCheck.rows.length > 0) {
      await this.database.query(
        `UPDATE subscriptions SET status = $1, current_period_start = $2, current_period_end = $3, billing_interval = $5, cancel_at_period_end = $6
         WHERE stripe_subscription_id = $4`,
        [
          stripeSub.status,
          new Date(stripeSub.current_period_start * 1000).toISOString(),
          new Date(stripeSub.current_period_end * 1000).toISOString(),
          stripeSub.id,
          billingInterval,
          stripeSub.cancel_at_period_end ?? false,
        ],
      );
    } else {
      await this.database.query(
        `INSERT INTO subscriptions (business_id, plan_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end, billing_interval, cancel_at_period_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          businessId,
          planId,
          stripeSub.id,
          typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id,
          stripeSub.status,
          new Date(stripeSub.current_period_start * 1000).toISOString(),
          new Date(stripeSub.current_period_end * 1000).toISOString(),
        ],
      );
    }

    const planResult = await this.database.query(
      'SELECT max_screens FROM plans WHERE id = $1',
      [planId],
    );
    const maxScreens = planResult.rows[0]?.max_screens ?? 0;

    if (maxScreens > 0 && maxScreens !== -1) {
      await this.screensLocalService.createScreensForBusiness(businessId, maxScreens);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const interval = subscription?.items?.data?.[0]?.plan?.interval;
    const billingInterval = interval === 'year' ? 'yearly' : interval === 'month' ? 'monthly' : null;
    await this.database.query(
      `UPDATE subscriptions SET status = $1, current_period_start = $2, current_period_end = $3, billing_interval = $5, cancel_at_period_end = $6
       WHERE stripe_subscription_id = $4`,
      [
        subscription.status,
        new Date(subscription.current_period_start * 1000).toISOString(),
        new Date(subscription.current_period_end * 1000).toISOString(),
        subscription.id,
        billingInterval,
        subscription.cancel_at_period_end ?? false,
      ],
    );
    // Ödeme başarılı olup abonelik tekrar active olduğunda ekranları ve şablonları yeniden aç
    if (subscription.status === 'active') {
      const subResult = await this.database.query(
        'SELECT business_id FROM subscriptions WHERE stripe_subscription_id = $1',
        [subscription.id],
      );
      if (subResult.rows.length > 0 && subResult.rows[0].business_id) {
        await this.screensLocalService.reactivateScreensForBusiness(subResult.rows[0].business_id);
      }
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const subResult = await this.database.query(
      'SELECT business_id FROM subscriptions WHERE stripe_subscription_id = $1',
      [subscription.id],
    );
    await this.database.query(
      `UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = $1`,
      [subscription.id],
    );
    if (subResult.rows.length > 0 && subResult.rows[0].business_id) {
      await this.database.query(
        'UPDATE screens SET is_active = false WHERE business_id = $1',
        [subResult.rows[0].business_id],
      );
      await this.database.query(
        `UPDATE screen_template_rotations str SET is_active = false
         FROM screens s WHERE s.business_id = $1 AND str.screen_id = s.id`,
        [subResult.rows[0].business_id],
      );
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const subResult = await this.database.query(
      'SELECT id, business_id FROM subscriptions WHERE stripe_subscription_id = $1',
      [subscriptionId],
    );
    if (subResult.rows.length === 0) return;

    const paymentIntentId = typeof invoice.payment_intent === 'string'
      ? invoice.payment_intent
      : invoice.payment_intent?.id ?? invoice.id ?? 'unknown';
    const invNumRes = await this.database.query(
      `SELECT 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::text, 5, '0') AS inv`,
    );
    const invoiceNumber = invNumRes.rows[0]?.inv ?? `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    await this.database.query(
      `INSERT INTO payments (subscription_id, stripe_payment_intent_id, amount, currency, status, payment_date, invoice_number)
       VALUES ($1, $2, $3, $4, 'succeeded', $5, $6)`,
      [
        subResult.rows[0].id,
        paymentIntentId,
        (invoice.amount_paid ?? 0) / 100,
        invoice.currency ?? 'cad',
        new Date((invoice.created ?? 0) * 1000).toISOString(),
        invoiceNumber,
      ],
    );
    // Ödeme alındığında ekranları ve önceden yayınlanan şablonları tekrar aç (past_due sonrası)
    const businessId = subResult.rows[0].business_id;
    if (businessId) {
      await this.screensLocalService.reactivateScreensForBusiness(businessId);
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const subResult = await this.database.query(
      'SELECT id, business_id FROM subscriptions WHERE stripe_subscription_id = $1',
      [subscriptionId],
    );
    if (subResult.rows.length === 0) return;

    const sub = subResult.rows[0];
    await this.database.query(
      `UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = $1`,
      [subscriptionId],
    );

    await this.database.query(
      `INSERT INTO payment_failures (subscription_id, business_id, stripe_invoice_id, amount, currency, failure_reason, attempted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sub.id,
        sub.business_id,
        invoice.id ?? null,
        (invoice.amount_due ?? 0) / 100,
        invoice.currency ?? 'cad',
        (invoice as any).last_finalization_error?.message ?? 'Payment failed',
        new Date((invoice.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      ],
    );

    // Ödeme alınamadığında TV yayınlarını durdur
    if (sub.business_id) {
      await this.database.query(
        'UPDATE screens SET is_active = false WHERE business_id = $1',
        [sub.business_id],
      );
      await this.database.query(
        `UPDATE screen_template_rotations str SET is_active = false
         FROM screens s WHERE s.business_id = $1 AND str.screen_id = s.id`,
        [sub.business_id],
      );
    }

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (adminEmail) {
      console.warn(`[StripeLocal] PAYMENT FAILED - Admin notification: ${adminEmail}`);
    }
  }
}
