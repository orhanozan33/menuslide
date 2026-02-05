import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private supabase: SupabaseClient | null;

  constructor(
    private configService: ConfigService,
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
  ) {
    this.supabase = supabase ?? null;
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create Stripe Checkout session
   */
  async createCheckoutSession(
    planId: string,
    businessId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    if (!this.supabase) {
      throw new Error('Stripe checkout requires Supabase. Use StripeLocalService for local PostgreSQL.');
    }
    // Get plan details
    const { data: plan } = await this.supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get or create Stripe customer
    const { data: subscription } = await this.supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Get business email for customer creation
      const { data: business } = await this.supabase
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .single();

      const { data: user } = await this.supabase
        .from('users')
        .select('email')
        .eq('business_id', businessId)
        .limit(1)
        .single();

      // Create Stripe customer
      const customer = await this.stripe.customers.create({
        email: user?.email,
        name: business?.name,
        metadata: {
          business_id: businessId,
        },
      });

      customerId = customer.id;
    }

    // Get Stripe Price ID: prefer plan DB field, env only as fallback
    let priceId = plan.stripe_price_id_monthly || plan.stripe_price_id_yearly;
    if (!priceId) {
      if (plan.name === 'basic') priceId = this.configService.get<string>('STRIPE_PRICE_BASIC_MONTHLY');
      else if (plan.name === 'pro') priceId = this.configService.get<string>('STRIPE_PRICE_PRO_MONTHLY');
      else if (plan.name === 'enterprise') priceId = this.configService.get<string>('STRIPE_PRICE_ENTERPRISE_MONTHLY');
    }

    if (!priceId) {
      throw new Error(`Stripe Price ID not found for plan: ${plan.name}`);
    }

    // Create checkout session (TEST MODE)
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        business_id: businessId,
        plan_id: planId,
      },
      // Test mode specific settings
      payment_method_collection: 'always',
    });

    return session;
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle different event types
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
      throw new Error('Missing metadata in checkout session');
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    // Create or update subscription in database
    await this.supabase
      .from('subscriptions')
      .upsert({
        business_id: businessId,
        plan_id: planId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      }, {
        onConflict: 'stripe_subscription_id',
      });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    await this.supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;

    const { data: subscription } = await this.supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (subscription) {
      await this.supabase
        .from('payments')
        .insert({
          subscription_id: subscription.id,
          stripe_payment_intent_id: invoice.payment_intent as string,
          amount: invoice.amount_paid / 100, // Convert from cents
          currency: invoice.currency,
          status: 'succeeded',
          payment_date: new Date(invoice.created * 1000).toISOString(),
        });
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;

    const { data: subscription } = await this.supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (subscription) {
      await this.supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
        })
        .eq('id', subscription.id);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(stripeSubscriptionId: string) {
    const subscription = await this.stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await this.supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
      })
      .eq('stripe_subscription_id', stripeSubscriptionId);

    return subscription;
  }
}
