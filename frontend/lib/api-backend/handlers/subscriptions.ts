import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { randomBytes } from 'crypto';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://menuslide.com';

type StripeSubShape = { id: string; status: string; current_period_start: number; current_period_end: number; cancel_at_period_end?: boolean; items?: { data?: { plan?: { interval?: string } }[] } };

function getStripe(): Stripe | null {
  if (!stripeSecret || stripeSecret === 'sk_test_your_stripe_secret_key') return null;
  return new Stripe(stripeSecret, { apiVersion: '2026-01-28.clover' });
}

/** GET /subscriptions/business/:businessId */
export async function getByBusiness(businessId: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  if (user.role !== 'super_admin') {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    if (!u || u.business_id !== businessId) {
      return Response.json({ message: 'Access denied' }, { status: 403 });
    }
  }
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, plans(id, name, display_name, max_screens, price_monthly, price_yearly)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

/** GET /subscriptions/:id/payments */
export async function getPayments(subscriptionId: string, user: JwtPayload): Promise<Response> {
  const supabase = getServerSupabase();
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('business_id')
    .eq('id', subscriptionId)
    .maybeSingle();
  if (subErr || !sub) return Response.json({ message: 'Subscription not found' }, { status: 404 });
  if (user.role !== 'super_admin') {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    if (!u || u.business_id !== sub.business_id) {
      return Response.json({ message: 'Access denied' }, { status: 403 });
    }
  }
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('payment_date', { ascending: false });
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

/** POST /subscriptions/checkout */
export async function createCheckout(req: NextRequest, user: JwtPayload): Promise<Response> {
  const stripe = getStripe();
  if (!stripe) return Response.json({ message: 'Stripe is not configured' }, { status: 400 });
  let body: { planId?: string; businessId?: string; successUrl?: string; cancelUrl?: string; interval?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Invalid body' }, { status: 400 });
  }
  const { planId, businessId, successUrl, cancelUrl, interval = 'monthly', locale = 'en' } = body;
  if (!planId || !businessId || !successUrl || !cancelUrl) {
    return Response.json({ message: 'Missing planId, businessId, successUrl, cancelUrl' }, { status: 400 });
  }
  if (user.role === 'business_user') {
    const supabase = getServerSupabase();
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    if (!u?.business_id || u.business_id !== businessId) {
      return Response.json({ message: 'Access denied to this business' }, { status: 403 });
    }
  }
  const supabase = getServerSupabase();
  const { data: plan, error: planErr } = await supabase.from('plans').select('*').eq('id', planId).maybeSingle();
  if (planErr || !plan) return Response.json({ message: 'Plan not found' }, { status: 404 });

  let customerId: string | null = null;
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  customerId = existingSub?.stripe_customer_id ?? null;
  if (!customerId) {
    const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
    const { data: userRow } = await supabase.from('users').select('email').eq('business_id', businessId).limit(1).maybeSingle();
    const customer = await stripe.customers.create({
      email: (user as any).email || userRow?.email,
      name: biz?.name,
      metadata: { business_id: businessId },
    });
    customerId = customer.id;
  }

  const useYearly = interval === 'yearly';
  const unitAmount = useYearly
    ? Math.round((plan.price_yearly ?? plan.price_monthly * 12 * 0.9) * 100)
    : Math.round((plan.price_monthly || 0) * 100);
  const recurringInterval = (useYearly ? 'year' : 'month') as 'month' | 'year';
  const screensLabel = plan.max_screens === -1 ? 'Unlimited' : plan.max_screens;

  // Logo URL for Stripe Checkout (sol panel ürün görseli)
  const origin = (() => {
    try {
      return new URL(successUrl).origin;
    } catch {
      return process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://menuslide.com');
    }
  })();
  const logoUrl = `${origin}/menuslide-logo.png`;

  // Kurumsal, modern açıklama – Stripe Checkout sol panel
  const productDescription = [
    `MenuSlide - ${screensLabel} screen(s)`,
    '',
    '• Professional digital menu boards for restaurants and businesses',
    '• HD templates, cloud sync, easy content management',
    '• Trusted by businesses across Canada',
    '• Reliable cloud infrastructure',
  ].join('\n');

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'cad',
        unit_amount: unitAmount,
        tax_behavior: 'unspecified',
        recurring: { interval: recurringInterval },
        product_data: {
          name: plan.display_name || `Subscription (${screensLabel} screens)`,
          description: productDescription,
          images: [logoUrl],
          metadata: { plan_id: planId },
        },
      },
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale: locale === 'tr' || locale === 'fr' ? locale : 'en',
    custom_text: {
      submit: {
        message: 'You will be charged according to your selected plan. Cancel anytime from your account.',
      },
    },
    metadata: { business_id: businessId, plan_id: planId },
  });
  if (!session.url) return Response.json({ message: 'Stripe did not return URL' }, { status: 500 });
  return Response.json({ sessionId: session.id, url: session.url });
}

/** POST /subscriptions/:id/cancel */
export async function cancelSubscription(subscriptionId: string, user: JwtPayload): Promise<Response> {
  const stripe = getStripe();
  if (!stripe) return Response.json({ message: 'Stripe is not configured' }, { status: 400 });
  const supabase = getServerSupabase();
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, business_id')
    .eq('id', subscriptionId)
    .maybeSingle();
  if (subErr || !sub) return Response.json({ message: 'Subscription not found' }, { status: 404 });
  if (user.role !== 'super_admin') {
    const { data: u } = await supabase.from('users').select('business_id').eq('id', user.userId).single();
    if (!u || u.business_id !== sub.business_id) {
      return Response.json({ message: 'Access denied' }, { status: 403 });
    }
  }
  await stripe.subscriptions.cancel(sub.stripe_subscription_id);
  return Response.json({ message: 'Subscription cancelled' });
}

/** Generate public token for new screen */
function generatePublicToken(): string {
  return randomBytes(32).toString('hex');
}

/** Create screens for business up to maxScreens */
async function createScreensForBusiness(businessId: string, maxScreens: number): Promise<void> {
  if (maxScreens < 1) return;
  const supabase = getServerSupabase();
  const { count } = await supabase.from('screens').select('*', { count: 'exact', head: true }).eq('business_id', businessId);
  const currentCount = count ?? 0;
  const toCreate = maxScreens - currentCount;
  if (toCreate <= 0) return;
  const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
  const businessName = biz?.name || 'business';
  for (let i = 0; i < toCreate; i++) {
    const name = `TV${currentCount + i + 1}`;
    const publicToken = generatePublicToken();
    const publicSlug = `${businessName}-${name}-${Date.now().toString(36)}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    await supabase.from('screens').insert({
      business_id: businessId,
      name,
      public_token: publicToken,
      public_slug: publicSlug,
      is_active: true,
      animation_type: 'fade',
      animation_duration: 500,
    });
  }
}

async function reactivateScreensForBusiness(businessId: string): Promise<void> {
  const supabase = getServerSupabase();
  await supabase.from('screens').update({ is_active: true }).eq('business_id', businessId);
  const { data: screens } = await supabase.from('screens').select('id').eq('business_id', businessId);
  if (screens?.length) {
    for (const s of screens) {
      await supabase.from('screen_template_rotations').update({ is_active: true }).eq('screen_id', s.id);
    }
  }
}

/** POST /subscriptions/webhook - requires raw body */
export async function handleWebhook(rawBody: string | ArrayBuffer, signature: string | null): Promise<Response> {
  const stripe = getStripe();
  if (!stripe || !webhookSecret || webhookSecret === 'whsec_your_webhook_secret') {
    return Response.json({ message: 'Stripe webhook not configured' }, { status: 400 });
  }
  const payload = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : Buffer.from(rawBody);
  if (!signature) return Response.json({ message: 'Missing stripe-signature' }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    return Response.json({ message: `Webhook signature failed: ${err.message}` }, { status: 400 });
  }
  const supabase = getServerSupabase();
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const businessId = session.metadata?.business_id;
      const planId = session.metadata?.plan_id;
      if (!businessId || !planId || !session.subscription) break;
      const stripeSubRaw = await stripe.subscriptions.retrieve(session.subscription as string);
      const stripeSub = stripeSubRaw as unknown as { id: string; status: string; current_period_start: number; current_period_end: number; cancel_at_period_end?: boolean; customer?: string | { id: string }; items?: { data?: { plan?: { interval?: string } }[] } };
      const interval = stripeSub?.items?.data?.[0]?.plan?.interval;
      const billingInterval = interval === 'year' ? 'yearly' : interval === 'month' ? 'monthly' : null;
      const { data: existing } = await supabase.from('subscriptions').select('id').eq('stripe_subscription_id', stripeSub.id).maybeSingle();
      const row = {
        status: stripeSub.status,
        current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
        billing_interval: billingInterval,
        cancel_at_period_end: stripeSub.cancel_at_period_end ?? false,
      };
      if (existing) {
        await supabase.from('subscriptions').update(row).eq('stripe_subscription_id', stripeSub.id);
      } else {
        await supabase.from('subscriptions').insert({
          business_id: businessId,
          plan_id: planId,
          stripe_subscription_id: stripeSub.id,
          stripe_customer_id: typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id,
          ...row,
        });
      }
      const { data: plan } = await supabase.from('plans').select('max_screens').eq('id', planId).maybeSingle();
      const maxScreens = plan?.max_screens ?? 0;
      if (maxScreens > 0 && maxScreens !== -1) await createScreensForBusiness(businessId, maxScreens);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as unknown as StripeSubShape;
      const interval = subscription?.items?.data?.[0]?.plan?.interval;
      const billingInterval = interval === 'year' ? 'yearly' : interval === 'month' ? 'monthly' : null;
      await supabase.from('subscriptions').update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        billing_interval: billingInterval,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      }).eq('stripe_subscription_id', subscription.id);
      if (subscription.status === 'active') {
        const { data: sub } = await supabase.from('subscriptions').select('business_id').eq('stripe_subscription_id', subscription.id).maybeSingle();
        if (sub?.business_id) await reactivateScreensForBusiness(sub.business_id);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as unknown as { id: string };
      const { data: sub } = await supabase.from('subscriptions').select('business_id').eq('stripe_subscription_id', subscription.id).maybeSingle();
      await supabase.from('subscriptions').update({ status: 'canceled' }).eq('stripe_subscription_id', subscription.id);
      if (sub?.business_id) {
        await supabase.from('screens').update({ is_active: false }).eq('business_id', sub.business_id);
      }
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as unknown as { subscription?: string; payment_intent?: string | { id?: string }; id?: string; amount_paid?: number; currency?: string; created?: number };
      const subscriptionId = invoice.subscription as string;
      if (!subscriptionId) break;
      const { data: sub } = await supabase.from('subscriptions').select('id, business_id').eq('stripe_subscription_id', subscriptionId).maybeSingle();
      if (!sub) break;
      const paymentIntentId = typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.payment_intent?.id ?? invoice.id ?? 'unknown';
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
      await supabase.from('payments').insert({
        subscription_id: sub.id,
        stripe_payment_intent_id: paymentIntentId,
        amount: (invoice.amount_paid ?? 0) / 100,
        currency: invoice.currency ?? 'cad',
        status: 'succeeded',
        payment_date: new Date((invoice.created ?? 0) * 1000).toISOString(),
        invoice_number: invoiceNumber,
      });
      if (sub.business_id) await reactivateScreensForBusiness(sub.business_id);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as unknown as { subscription?: string; amount_due?: number; currency?: string; id?: string; created?: number; last_finalization_error?: { message?: string } };
      const subscriptionId = invoice.subscription as string;
      if (!subscriptionId) break;
      const { data: sub } = await supabase.from('subscriptions').select('id, business_id').eq('stripe_subscription_id', subscriptionId).maybeSingle();
      if (!sub) break;
      await supabase.from('subscriptions').update({ status: 'past_due' }).eq('stripe_subscription_id', subscriptionId);
      await supabase.from('payment_failures').insert({
        subscription_id: sub.id,
        business_id: sub.business_id,
        stripe_invoice_id: invoice.id ?? null,
        amount: (invoice.amount_due ?? 0) / 100,
        currency: invoice.currency ?? 'cad',
        failure_reason: invoice.last_finalization_error?.message ?? 'Payment failed',
        attempted_at: new Date((invoice.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      });
      if (sub.business_id) {
        await supabase.from('screens').update({ is_active: false }).eq('business_id', sub.business_id);
      }
      break;
    }
  }
  return Response.json({ received: true });
}
