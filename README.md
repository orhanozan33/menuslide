# Digital Signage / Online Menu Management System

A complete multi-tenant SaaS platform for managing digital signage menus. Built with NestJS, Next.js, and Supabase.

## 🏗️ Architecture

- **Backend**: NestJS (Node.js) REST API
- **Frontend**: Next.js 14 (React) Admin Panel + Public TV Display
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (JWT)
- **Realtime**: Supabase Realtime subscriptions

## 📋 Features

### Core Features
- **Multi-tenant Architecture**: Complete data isolation per business
- **Role-based Access**: Super Admin and Business User roles
- **Menu Management**: Create menus with items (name, price, image, active/passive)
- **Screen Management**: Create and manage TV screens
- **Menu Assignment**: Assign multiple menus to screens with display order
- **Public TV Display**: Fullscreen menu display with auto-rotation
- **Realtime Updates**: Instant menu updates on all connected screens
- **No TV Authentication**: TVs access menus via unique public token URLs

### Advanced Features ✨
- **Menu Animations**: Per-screen animation configuration (fade, slide, zoom)
- **Time-Based Menus**: Schedule menus by time of day (breakfast, lunch, dinner, night)
- **Multi-Language Support**: Translate menu items to multiple languages
- **SaaS Packages**: Subscription plans (Basic, Pro, Enterprise) with Stripe integration
- **Android TV App**: Native Android TV application (WebView-based)
- **Automatic Menu Switching**: Menus change based on time schedules
- **Language Selection**: Per-screen language configuration
- **Payment Processing**: Stripe Checkout and webhook handling

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- PostgreSQL database (via Supabase)

### 1. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the SQL script from `database/schema.sql`
4. Note your Supabase URL and API keys from Settings > API

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

Start the backend:

```bash
npm run start:dev
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Start the frontend:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### 4. Initial Setup

1. **Create a Super Admin User**:
   - Go to Supabase Dashboard > Authentication > Users
   - Create a new user manually or via the Auth API
   - In the SQL Editor, run:
     ```sql
     INSERT INTO users (id, email, role)
     VALUES ('user-uuid-from-auth', 'admin@example.com', 'super_admin');
     ```

2. **Create a Business** (as super admin):
   - Login to the admin panel at `http://localhost:3000/login`
   - Navigate to businesses (you'll need to add this UI or use the API)
   - Or use the API directly:
     ```bash
     curl -X POST http://localhost:3001/businesses \
       -H "Authorization: Bearer YOUR_JWT_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"name": "My Restaurant", "slug": "my-restaurant"}'
     ```

3. **Create a Business User**:
   - Create user in Supabase Auth
   - Link to business:
     ```sql
     UPDATE users SET business_id = 'business-uuid' WHERE id = 'user-uuid';
     ```

## 📁 Project Structure

```
Tvproje/
├── backend/                 # NestJS Backend
│   ├── src/
│   │   ├── auth/           # Authentication guards & services
│   │   ├── businesses/     # Business management
│   │   ├── menus/          # Menu CRUD
│   │   ├── menu-items/     # Menu item CRUD
│   │   ├── screens/        # Screen management
│   │   ├── public/         # Public TV display endpoint
│   │   └── supabase/       # Supabase client module
│   ├── package.json
│   └── .env
├── frontend/                # Next.js Frontend
│   ├── app/
│   │   ├── (admin)/        # Admin panel routes
│   │   ├── (public)/       # Public TV display routes
│   │   └── login/          # Login page
│   ├── lib/                # Utilities (API client, Supabase)
│   ├── package.json
│   └── .env.local
├── database/
│   └── schema.sql          # Database schema
├── ARCHITECTURE.md         # Architecture documentation
└── README.md              # This file
```

## 🆕 New Features Documentation

### Menu Animations
Each screen can have custom animations:
- **Types**: `fade`, `slide`, `zoom`
- **Duration**: Configurable in milliseconds
- **Real-time**: Animation changes apply instantly

### Time-Based Menus
Schedule menus to display at specific times:
- Set `start_time` and `end_time` for each menu
- Optional `day_of_week` for weekly schedules
- Automatic switching based on server time

### Multi-Language Support
- Add translations for menu items
- Each screen can have a default language
- Fallback to default language if translation missing

### SaaS Subscriptions
- **Basic Plan**: 1 screen - $9.99/month
- **Pro Plan**: 5 screens - $29.99/month
- **Enterprise Plan**: Unlimited - $99.99/month
- Stripe-powered payments
- Automatic screen limit enforcement

### Android TV App
- WebView-based native app
- Fullscreen display
- Auto-reload on connection loss
- See `android-tv/README.md` for setup

## 🔌 API Endpoints

### Authentication Required (Bearer Token)

#### Businesses
- `GET /businesses` - List businesses
- `POST /businesses` - Create business (super admin only)
- `GET /businesses/:id` - Get business
- `PATCH /businesses/:id` - Update business
- `DELETE /businesses/:id` - Delete business (super admin only)

#### Menus
- `GET /menus` - List menus
- `POST /menus` - Create menu
- `GET /menus/:id` - Get menu
- `PATCH /menus/:id` - Update menu
- `DELETE /menus/:id` - Delete menu

#### Menu Items
- `GET /menu-items?menu_id=:id` - List menu items
- `POST /menu-items` - Create menu item
- `GET /menu-items/:id` - Get menu item
- `PATCH /menu-items/:id` - Update menu item
- `DELETE /menu-items/:id` - Delete menu item

#### Screens
- `GET /screens` - List screens
- `POST /screens` - Create screen
- `GET /screens/:id` - Get screen
- `GET /screens/:id/menus` - Get assigned menus
- `PATCH /screens/:id` - Update screen
- `POST /screens/:id/assign-menu` - Assign menu to screen
- `DELETE /screens/:id/menus/:menuId` - Remove menu from screen
- `DELETE /screens/:id` - Delete screen

#### Schedules
- `POST /schedules` - Create menu schedule
- `GET /schedules?screen_id=:id` - Get schedules for screen
- `PATCH /schedules/:id` - Update schedule
- `DELETE /schedules/:id` - Delete schedule

#### Languages
- `GET /languages` - List all languages (public)
- `GET /languages/default` - Get default language (public)
- `POST /languages` - Create language (super admin)
- `PATCH /languages/:id` - Update language (super admin)

#### Plans
- `GET /plans` - List all plans (public)
- `GET /plans/:id` - Get plan details (public)
- `POST /plans` - Create plan (super admin)
- `PATCH /plans/:id` - Update plan (super admin)

#### Subscriptions
- `GET /subscriptions/business/:businessId` - Get business subscription
- `GET /subscriptions/:id/payments` - Get payment history
- `POST /subscriptions/checkout` - Create Stripe checkout session
- `POST /subscriptions/webhook` - Stripe webhook endpoint (no auth)
- `POST /subscriptions/:id/cancel` - Cancel subscription

#### Translations
- `POST /menu-items/:id/translations` - Add/update translation
- `GET /menu-items/:id/translations` - Get translations for item
- `DELETE /menu-items/:id/translations/:lang` - Delete translation

### Public Endpoints (No Authentication)

#### TV Display
- `GET /public/screen/:publicToken` - Get screen data for TV display (includes active menu based on schedule, translations, animations)

## 🖥️ TV Display

TVs access menus via public URLs:

```
http://localhost:3000/display/{public_token}
```

Each screen has a unique `public_token` generated automatically. The TV display page:
- Shows menus in fullscreen
- Auto-rotates through menu items
- Updates in realtime when menu data changes
- **Supports animations** (fade, slide, zoom)
- **Time-based menu switching** (automatic)
- **Multi-language display** (per-screen language)
- No authentication required

### Display Features
- **Animations**: Smooth CSS transitions based on screen configuration
- **Schedule Switching**: Automatically changes menu based on time
- **Language Support**: Shows translated content based on screen language
- **Real-time Updates**: Instant updates for all changes

## 🔄 Realtime Updates

The system uses Supabase Realtime to push updates to TV screens instantly:
- When menus change → TVs update automatically
- When menu items change → TVs update automatically
- When menu assignments change → TVs update automatically

No page refresh needed!

## 🔒 Security

- **JWT Authentication**: All admin endpoints require valid Supabase JWT
- **Row Level Security**: Database RLS policies enforce data isolation
- **Public Tokens**: TV screens use cryptographically secure random tokens
- **Business Isolation**: Users can only access their own business data

## 🧪 Development

### Backend
```bash
cd backend
npm run start:dev    # Development with hot reload
npm run build        # Production build
npm run start:prod   # Production server
```

### Frontend
```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
```

## 📝 Notes

- The database schema includes Row Level Security (RLS) policies
- Super admins can access all businesses
- Business users are isolated to their own business
- Public screen endpoints don't require authentication
- Menu items are ordered by `display_order`
- Screens can have multiple menus assigned with custom display order
- **Animations** are per-screen and apply to all menu transitions
- **Time-based menus** use server time (UTC) for scheduling
- **Languages** default to English if not specified
- **Subscriptions** enforce screen limits automatically
- **Android TV app** requires internet connection

## 🆕 Upgrading from Previous Version

If you have an existing installation, see [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md) for step-by-step upgrade instructions.

The upgrade is **backward compatible** - all existing features continue to work.

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists and has correct Supabase credentials
- Ensure Supabase project is active
- Check port 3001 is not in use

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in backend `main.ts`
- Ensure backend is running

### Realtime not working
- Verify Supabase Realtime is enabled in project settings
- Check RLS policies allow necessary access
- Ensure Supabase client is properly configured

### Authentication issues
- Verify JWT token is being sent in Authorization header
- Check user exists in both `auth.users` and `public.users` tables
- Ensure user has correct role and business_id

## 📄 License

MIT

## 🤝 Contributing

This is an MVP. Feel free to extend and improve!
