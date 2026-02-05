# Upgrade Guide - Advanced Features

This guide explains how to upgrade your existing Digital Signage system to include the new advanced features.

## 🚀 New Features Added

1. **Menu Animations** - Per-screen animation configuration
2. **Time-Based Menus** - Schedule menus by time of day
3. **Multi-Language Support** - Translate menu items
4. **SaaS Packages & Stripe** - Subscription-based monetization
5. **Android TV App** - Native TV application

## 📋 Pre-Upgrade Checklist

- [ ] Backup your database
- [ ] Test in a development environment first
- [ ] Ensure Supabase project is active
- [ ] Have Stripe account ready (for payments feature)
- [ ] Review breaking changes below

## 🔄 Database Migration

### Step 1: Run Migration Script

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the migration script: `database/migrations/add_advanced_features.sql`

This will:
- Add animation fields to screens table
- Create menu_schedules table
- Create languages and translations tables
- Create plans, subscriptions, and payments tables
- Add RLS policies for new tables
- Insert default data (languages, plans)

### Step 2: Verify Migration

Check that all tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'menu_schedules', 
  'languages', 
  'menu_item_translations', 
  'plans', 
  'subscriptions', 
  'payments'
);
```

## 🔧 Backend Updates

### Step 1: Update Dependencies

```bash
cd backend
npm install
```

New dependencies:
- `stripe` - For payment processing

### Step 2: Update Environment Variables

Add to `backend/.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### Step 3: Configure Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from Dashboard > Developers > API keys
3. Create products and prices for your plans
4. Update the `plans` table with Stripe Price IDs:
   ```sql
   UPDATE plans 
   SET stripe_price_id_monthly = 'price_xxxxx' 
   WHERE name = 'basic';
   ```
5. Set up webhook endpoint in Stripe Dashboard:
   - URL: `https://your-backend.com/subscriptions/webhook`
   - Events to listen: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### Step 4: Restart Backend

```bash
npm run start:dev
```

## 🎨 Frontend Updates

### Step 1: Update Dependencies

```bash
cd frontend
npm install
```

### Step 2: No Breaking Changes

The frontend is backward compatible. Existing functionality continues to work.

### Step 3: Optional - Add Stripe.js

If you want to add subscription UI:

```bash
npm install @stripe/stripe-js
```

## 📱 Android TV App Setup

### Step 1: Open in Android Studio

1. Open Android Studio
2. Open project: `android-tv/`
3. Sync Gradle files

### Step 2: Configure Display URL

Edit `MainActivity.kt`:
```kotlin
private val DISPLAY_URL = "https://your-domain.com/display/YOUR_PUBLIC_TOKEN"
```

### Step 3: Build and Deploy

```bash
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 🔄 Migration Steps Summary

1. **Database**: Run migration SQL
2. **Backend**: Install dependencies, add env vars, restart
3. **Frontend**: No changes required (backward compatible)
4. **Stripe**: Set up account and configure webhooks
5. **Android TV**: Configure and build (optional)

## ⚠️ Breaking Changes

### None!

All new features are additive. Existing functionality remains unchanged.

## 🆕 New API Endpoints

### Schedules
- `POST /schedules` - Create menu schedule
- `GET /schedules?screen_id=:id` - Get schedules for screen
- `PATCH /schedules/:id` - Update schedule
- `DELETE /schedules/:id` - Delete schedule

### Languages
- `GET /languages` - List all languages
- `GET /languages/default` - Get default language
- `POST /languages` - Create language (super admin)
- `PATCH /languages/:id` - Update language (super admin)

### Plans
- `GET /plans` - List all plans
- `GET /plans/:id` - Get plan details
- `POST /plans` - Create plan (super admin)
- `PATCH /plans/:id` - Update plan (super admin)

### Subscriptions
- `GET /subscriptions/business/:businessId` - Get business subscription
- `GET /subscriptions/:id/payments` - Get payment history
- `POST /subscriptions/checkout` - Create Stripe checkout session
- `POST /subscriptions/webhook` - Stripe webhook endpoint
- `POST /subscriptions/:id/cancel` - Cancel subscription

### Translations
- `POST /menu-items/:id/translations` - Add/update translation
- `GET /menu-items/:id/translations` - Get translations
- `DELETE /menu-items/:id/translations/:lang` - Delete translation

## 🔍 Testing Checklist

After upgrade, test:

- [ ] Existing screens still work
- [ ] Can create screens with animations
- [ ] Can create menu schedules
- [ ] Can add translations to menu items
- [ ] TV display shows correct language
- [ ] Time-based menu switching works
- [ ] Animations apply correctly
- [ ] Stripe checkout works
- [ ] Webhooks are received
- [ ] Screen limits enforced

## 🐛 Troubleshooting

### Database Migration Fails

- Check Supabase connection
- Verify RLS policies aren't blocking
- Run migration in parts if needed

### Stripe Webhook Not Working

- Verify webhook URL is accessible
- Check webhook secret matches
- Ensure raw body is preserved (NestJS config)

### Animations Not Working

- Check browser console for errors
- Verify CSS animations are supported
- Check animation_type is valid ('fade', 'slide', 'zoom')

### Time-Based Menus Not Switching

- Verify database function `get_active_menu_for_screen` exists
- Check menu_schedules have correct time ranges
- Ensure screen has active schedules

## 📞 Support

For issues during upgrade:
1. Check logs in Supabase Dashboard
2. Review backend console output
3. Check browser console for frontend errors
4. Verify all environment variables are set

## ✅ Post-Upgrade

After successful upgrade:

1. Test all new features
2. Configure default languages
3. Set up subscription plans
4. Create test schedules
5. Test Stripe integration
6. Deploy Android TV app (optional)

## 🔐 Security Notes

- Stripe webhook signature verification is enabled
- RLS policies protect all new tables
- Screen limits enforced at API level
- Public endpoints remain token-based

## 📊 Performance

New features are optimized:
- Database indexes on all new tables
- Efficient time-based menu queries
- Cached language lookups
- Optimized translation queries

---

**Upgrade completed successfully!** 🎉

Your system now supports all advanced features. Refer to the main README for usage instructions.
