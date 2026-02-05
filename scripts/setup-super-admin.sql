-- Setup Super Admin User
-- Run this in Supabase SQL Editor after creating the user in Supabase Auth

-- Step 1: Create user in Supabase Auth (do this in Supabase Dashboard > Authentication > Users)
-- Email: orhan@example.com
-- Password: 33333333
-- After creating, copy the user ID from the users table

-- Step 2: Update the user in public.users table
-- Replace 'USER_ID_FROM_AUTH' with the actual user ID from auth.users

-- Option A: If user already exists in auth.users, just update public.users
UPDATE users 
SET 
  email = 'orhan@example.com',
  role = 'super_admin',
  business_id = NULL
WHERE id = (SELECT id FROM auth.users WHERE email = 'orhan@example.com' LIMIT 1);

-- If no row exists, insert it
INSERT INTO users (id, email, role, business_id)
SELECT 
  id,
  email,
  'super_admin',
  NULL
FROM auth.users
WHERE email = 'orhan@example.com'
ON CONFLICT (id) DO UPDATE
SET 
  role = 'super_admin',
  business_id = NULL;

-- Verify the super admin was created
SELECT id, email, role, business_id 
FROM users 
WHERE email = 'orhan@example.com';
