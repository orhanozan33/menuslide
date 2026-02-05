# Digital Signage / Online Menu Management System - Architecture Overview

## System Overview

This is a multi-tenant SaaS platform for managing digital signage menus. The system allows super admins to create business accounts, and business users to manage menus and display them on multiple TV screens with advanced features including animations, time-based scheduling, multi-language support, and subscription-based monetization.

## Architecture Components

### 1. Backend (NestJS)
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (JWT)
- **Realtime**: Supabase Realtime subscriptions
- **Payments**: Stripe integration
- **API**: RESTful endpoints

### 2. Frontend (Next.js)
- **Admin Panel**: React-based dashboard for business users
- **TV Display**: Fullscreen public pages for menu display with animations
- **Framework**: Next.js 14+ (App Router)

### 3. Mobile (Android TV)
- **Platform**: Android TV
- **Technology**: WebView-based app
- **Purpose**: Native TV app for better performance and offline support

### 4. Database (PostgreSQL/Supabase)
- Multi-tenant schema with proper isolation
- Realtime triggers for instant updates
- Foreign key relationships and indexes
- Support for animations, schedules, languages, and subscriptions

## User Roles & Permissions

### Super Admin
- Create/manage business accounts
- System-wide oversight
- Access to all businesses
- Manage subscription plans

### Business User
- Login via Supabase Auth
- Create/manage menus
- Create/manage menu items (with translations)
- Create/manage screens (TVs) with animation settings
- Assign menus to screens with time-based scheduling
- Configure display settings
- Manage subscription and payments

### Public (TV Screens)
- No authentication required
- Access via unique public token URL
- Receive realtime updates automatically
- Support animations and time-based menu switching

## New Features

### 1. Menu Animations 🎬
- Per-screen animation configuration
- Animation types: fade, slide, zoom
- Configurable animation duration
- CSS-based smooth transitions
- Real-time animation updates

### 2. Time-Based Menus ⏱️
- Schedule menus by time of day (breakfast, lunch, dinner, night)
- Automatic menu switching based on server time
- Multiple menus per screen with time ranges
- Seamless transitions without page refresh

### 3. Multi-Language Support 🌍
- Support for multiple languages
- Menu item translations (name, description)
- Per-screen language selection
- Default language fallback
- Language switcher in admin panel

### 4. SaaS Packages & Stripe Payments 💳
- Subscription plans: Basic (1 screen), Pro (5 screens), Enterprise (unlimited)
- Stripe Checkout integration
- Webhook handling for payment events
- Automatic screen limit enforcement
- Subscription management

### 5. Android TV App 📱
- WebView-based native app
- Fullscreen support
- Auto-reload on connection loss
- Future-ready architecture

## Data Flow

### Admin Operations
1. Business user logs in → Supabase Auth validates JWT
2. User creates/edits menu → Backend validates & saves to DB
3. User assigns menu to screen with schedule → Backend updates menu_schedules
4. User configures animations → Backend updates screen settings
5. User adds translations → Backend saves to menu_item_translations
6. Database change triggers Supabase Realtime event

### TV Display Operations
1. TV accesses public URL with token → Backend validates token
2. Backend determines active menu based on current time
3. Backend returns menu data with selected language → TV renders fullscreen display
4. TV applies configured animations
5. TV subscribes to Supabase Realtime channel
6. When menu/schedule/animation changes → Realtime event → TV updates instantly

### Payment Flow
1. User selects subscription plan → Frontend calls Stripe Checkout
2. User completes payment → Stripe webhook notifies backend
3. Backend updates subscription status → Database updated
4. Screen limits enforced based on plan
5. Realtime notification to admin panel

## Security Model

- **Admin Panel**: Protected by Supabase JWT middleware
- **Public Screens**: Token-based access (no login required)
- **Data Isolation**: Business users can only access their own data
- **Super Admin**: Can access all businesses
- **Payments**: Stripe webhook signature verification
- **Plan Limits**: Enforced at API level

## Technology Stack Details

### Backend Dependencies
- `@nestjs/core`, `@nestjs/common`
- `@supabase/supabase-js`
- `@nestjs/config`
- `@nestjs/platform-express`
- `stripe` (payment processing)
- `class-validator`, `class-transformer`

### Frontend Dependencies
- `next`, `react`, `react-dom`
- `@supabase/supabase-js`
- `@supabase/auth-helpers-nextjs`
- `@stripe/stripe-js` (Stripe Checkout)
- `tailwindcss` (for styling)

### Android TV
- Kotlin
- Android SDK (TV)
- WebView component

## Project Structure

```
Tvproje/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── businesses/
│   │   ├── menus/
│   │   ├── menu-items/
│   │   ├── screens/
│   │   ├── public/
│   │   ├── animations/        # NEW: Animation config
│   │   ├── schedules/         # NEW: Time-based menus
│   │   ├── languages/         # NEW: Multi-language
│   │   ├── subscriptions/     # NEW: Stripe integration
│   │   ├── plans/             # NEW: Subscription plans
│   │   └── app.module.ts
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── (admin)/
│   │   ├── (public)/
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── .env.example
├── android-tv/                # NEW: Android TV app
│   ├── app/
│   ├── build.gradle
│   └── README.md
├── database/
│   └── schema.sql
├── ARCHITECTURE.md
└── README.md
```

## Key Features

1. **Multi-tenancy**: Complete data isolation per business
2. **Realtime Updates**: Instant menu updates on all connected screens
3. **Public Access**: TVs access menus without authentication
4. **Animations**: Smooth CSS-based transitions per screen
5. **Time Scheduling**: Automatic menu switching by time of day
6. **Multi-language**: Full translation support
7. **SaaS Monetization**: Stripe-powered subscriptions
8. **Scalable**: Built on Supabase for automatic scaling
9. **Secure**: JWT-based auth with role-based access control
10. **Mobile Ready**: Android TV app skeleton for future development

## Realtime Event Types

- **Menu Change**: Updates all screens showing the menu
- **Language Change**: Updates screen language instantly
- **Schedule Change**: Switches menu at scheduled time
- **Animation Change**: Applies new animation without refresh
- **Subscription Update**: Notifies admin of payment status
