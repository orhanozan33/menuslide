# Deployment Notes - Stripe Test Mode & Premium TV UI

## 🚀 Quick Deployment Checklist

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Stripe Test Mode keys:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_BASIC_MONTHLY=price_...
   STRIPE_PRICE_PRO_MONTHLY=price_...
   STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
   ```

3. **Run Database Migrations**
   - Run `database/migrations/add_advanced_features.sql`
   - Run `database/migrations/add_tv_ui_customization.sql`

4. **Start Backend**
   ```bash
   npm run start:dev
   ```

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your values.

3. **Start Frontend**
   ```bash
   npm run dev
   ```

## 🔑 Stripe Test Mode Setup

### Step 1: Get Test API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy **Publishable key** (`pk_test_...`)
3. Copy **Secret key** (`sk_test_...`)

### Step 2: Create Test Products

1. Go to [Products](https://dashboard.stripe.com/test/products)
2. Create three products:
   - **Basic Plan** - $9.99/month recurring
   - **Pro Plan** - $29.99/month recurring
   - **Enterprise Plan** - $99.99/month recurring
3. Copy **Price IDs** (start with `price_`)

### Step 3: Configure Webhook

1. Go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Add endpoint: `https://your-backend.com/subscriptions/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy **Webhook signing secret** (`whsec_...`)

### Step 4: Local Testing with ngrok

For local webhook testing:

```bash
# Install ngrok
npm install -g ngrok

# Start backend
cd backend && npm run start:dev

# In another terminal, expose backend
ngrok http 3001

# Use ngrok URL in Stripe webhook configuration
# Example: https://abc123.ngrok.io/subscriptions/webhook
```

## 🎨 Premium TV UI Features

### Customization Options

Each screen can be customized via database:

- **Font Family**: `font_family` (e.g., 'system-ui', 'serif', 'sans-serif')
- **Primary Color**: `primary_color` (hex format, e.g., '#fbbf24')
- **Background Style**: `background_style` ('gradient', 'solid', 'image')
- **Background Color**: `background_color` (hex format)
- **Background Image**: `background_image_url` (full URL)
- **Logo**: `logo_url` (business logo URL)

### Default Values

- Font: `system-ui`
- Primary Color: `#fbbf24` (amber/gold)
- Background: Gradient (slate-900 to slate-800)
- Animation: Fade (500ms)

### Update Screen Customization

```sql
UPDATE screens 
SET 
  font_family = 'serif',
  primary_color = '#ef4444',
  background_style = 'image',
  background_image_url = 'https://example.com/bg.jpg',
  logo_url = 'https://example.com/logo.png'
WHERE id = 'screen-id';
```

## 🧪 Testing Stripe Test Mode

### Test Cards

Use these cards in Stripe Checkout:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future expiry, any CVC, any ZIP.

### Test Flow

1. Go to `/pricing` page
2. Click "Subscribe Now" on any plan
3. Use test card `4242 4242 4242 4242`
4. Complete checkout
5. Verify subscription created in database
6. Check screen limit enforcement

## 📺 TV Display Testing

### Test URL Format

```
http://localhost:3000/display/{public_token}
```

### Test Animations

Update screen animation:
```sql
UPDATE screens 
SET animation_type = 'slide', animation_duration = 800
WHERE id = 'screen-id';
```

### Test Schedules

Create time-based schedule:
```sql
INSERT INTO menu_schedules (screen_id, menu_id, start_time, end_time)
VALUES ('screen-id', 'menu-id', '08:00:00', '12:00:00');
```

## 🔒 Security Notes

- ✅ **Test Mode Only** - Never use live keys
- ✅ **Webhook Verification** - Signature verification enabled
- ✅ **RLS Policies** - Database access controlled
- ✅ **JWT Authentication** - Admin endpoints protected

## 🐛 Troubleshooting

### Webhook Not Received

- Check webhook URL is publicly accessible
- Verify webhook secret matches
- Check backend logs for errors
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3001/subscriptions/webhook`

### Subscription Not Created

- Check webhook events in Stripe Dashboard
- Verify database migration ran successfully
- Check subscription table for errors
- Review backend logs

### Screen Limit Not Enforcing

- Verify `check_screen_limit` function exists
- Check subscription status is 'active'
- Verify plan has correct `max_screens` value
- Check guard is applied to POST /screens endpoint

### TV UI Not Loading

- Verify public token is correct
- Check screen is active (`is_active = true`)
- Verify menu has active items
- Check browser console for errors

## 📊 Monitoring

### Stripe Dashboard

Monitor test payments and subscriptions:
- [Payments](https://dashboard.stripe.com/test/payments)
- [Subscriptions](https://dashboard.stripe.com/test/subscriptions)
- [Webhooks](https://dashboard.stripe.com/test/webhooks)

### Database Queries

Check subscription status:
```sql
SELECT s.*, p.display_name, p.max_screens
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.business_id = 'business-id';
```

Check screen usage:
```sql
SELECT COUNT(*) as screen_count
FROM screens
WHERE business_id = 'business-id';
```

## ✅ Production Checklist (When Ready)

Before going live:

- [ ] Switch to Stripe Live Mode
- [ ] Update all environment variables
- [ ] Test with real payment methods
- [ ] Set up production webhook endpoint
- [ ] Configure SSL certificates
- [ ] Set up monitoring and alerts
- [ ] Review security settings
- [ ] Test all subscription flows

---

**Remember: This is TEST MODE only. No real charges will occur.**
