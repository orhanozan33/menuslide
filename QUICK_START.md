# Quick Start Guide

## 🚀 Setup in 5 Minutes

### Step 1: Supabase Setup (2 min)
1. Go to [supabase.com](https://supabase.com) and create a project
2. Copy your project URL and API keys from Settings > API
3. In SQL Editor, run `database/schema.sql`

### Step 2: Backend (1 min)
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run start:dev
```

### Step 3: Frontend (1 min)
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

### Step 4: Create First User (1 min)
1. In Supabase Dashboard > Authentication, create a user
2. In SQL Editor, run:
```sql
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';
```

### Step 5: Login & Create Business
1. Go to `http://localhost:3000/login`
2. Login with your credentials
3. Create a business (via API or add UI)
4. Create menus and screens
5. Copy the public URL from screen settings
6. Open in browser or TV to see the display!

## 📱 TV Display URL Format

```
http://localhost:3000/display/{public_token}
```

Each screen gets a unique token automatically when created.

## 🔑 Key Features

- ✅ Multi-tenant (each business isolated)
- ✅ Real-time updates (no refresh needed)
- ✅ Public TV URLs (no login required)
- ✅ Role-based access (super admin + business users)
- ✅ Full CRUD for menus, items, screens

## 🐛 Common Issues

**Backend won't start?**
- Check `.env` file exists
- Verify Supabase credentials

**Frontend can't connect?**
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure backend is running on port 3001

**Realtime not working?**
- Enable Realtime in Supabase project settings
- Check RLS policies are correct

## 📚 Full Documentation

See `README.md` for complete documentation.
