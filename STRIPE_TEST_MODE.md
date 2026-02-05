# Stripe Test Mode Integration Guide

## Overview

This system uses **Stripe Test Mode** for subscription management. All payments are simulated and no real charges occur.

## Architecture

### Test Mode Flow

```
User → Admin Panel → Stripe Checkout (Test) → Webhook → Database Update
```

1. **User selects plan** in admin panel
2. **Backend creates Stripe Checkout Session** (test mode)
3. **User completes checkout** with test card
4. **Stripe sends webhook** to backend
5. **Backend updates subscription** in database
6. **Screen limits enforced** based on plan

## Stripe Test Mode Setup

### 1. Get Test API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy **Publishable key** (starts with `pk_test_`)
3. Copy **Secret key** (starts with `sk_test_`)

### 2. Create Test Products & Prices

1. Go to [Products](https://dashboard.stripe.com/test/products)
2. Create products for each plan:
   - **Basic Plan** - $9.99/month
   - **Pro Plan** - $29.99/month
   - **Enterprise Plan** - $99.99/month
3. Copy **Price IDs** (start with `price_`)

### 3. Configure Webhook

1. Go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Add endpoint: `https://your-backend.com/subscriptions/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy **Webhook signing secret** (starts with `whsec_`)

## Test Cards

Use these cards in Stripe Checkout (test mode):

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future expiry date, any CVC, any ZIP.

## Environment Variables

```env
# Stripe Test Mode Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY

# Price IDs (from Stripe Dashboard)
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
```

## Subscription Plans

| Plan | Screens | Monthly Price | Stripe Price ID |
|------|---------|---------------|-----------------|
| Basic | 1 | $9.99 | `STRIPE_PRICE_BASIC_MONTHLY` |
| Pro | 5 | $29.99 | `STRIPE_PRICE_PRO_MONTHLY` |
| Enterprise | Unlimited | $99.99 | `STRIPE_PRICE_ENTERPRISE_MONTHLY` |

## Webhook Events

### checkout.session.completed
- User completes payment
- Create/update subscription in database
- Activate business subscription

### customer.subscription.updated
- Subscription status changes
- Update subscription record
- Sync period dates

### customer.subscription.deleted
- Subscription canceled
- Mark subscription as canceled
- Disable screens if needed

### invoice.payment_succeeded
- Payment successful
- Record payment in database
- Update subscription status

### invoice.payment_failed
- Payment failed
- Mark subscription as past_due
- Notify business (optional)

## Security

- **Webhook signature verification** - Ensures requests are from Stripe
- **Test mode only** - No real charges
- **RLS policies** - Database access control
- **JWT authentication** - Admin endpoints protected

## Testing Checklist

- [ ] Create checkout session
- [ ] Complete test payment
- [ ] Verify webhook received
- [ ] Check subscription created
- [ ] Test screen limit enforcement
- [ ] Test subscription cancellation
- [ ] Verify payment history

## Important Notes

⚠️ **TEST MODE ONLY** - Never use live keys in development
⚠️ **Webhook URL** - Must be publicly accessible (use ngrok for local testing)
⚠️ **Price IDs** - Must match Stripe Dashboard exactly
⚠️ **Test Cards** - Only work in test mode

## Local Testing

For local webhook testing, use ngrok:

```bash
ngrok http 3001
# Use ngrok URL in Stripe webhook configuration
```
