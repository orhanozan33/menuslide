-- Create Super Admin User for Local PostgreSQL
-- Note: This creates a user in the users table
-- You still need to create the auth user in Supabase Auth dashboard

-- First, create a business (optional, for testing)
INSERT INTO businesses (id, name, slug, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Super Admin Business', 'super-admin', true)
ON CONFLICT (slug) DO NOTHING;

-- Create super admin user
-- Note: The id should match the auth.users.id from Supabase
-- For local setup, you'll need to:
-- 1. Create user in Supabase Auth dashboard first
-- 2. Get the user ID
-- 3. Update this script with the actual user ID

-- Example (replace with actual Supabase auth user ID):
-- INSERT INTO users (id, email, role, business_id)
-- VALUES 
--     ('YOUR_SUPABASE_AUTH_USER_ID_HERE', 'orhan@example.com', 'super_admin', NULL)
-- ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

-- Alternative: If using local auth, you might need to adjust the schema
-- to not require auth.users reference

SELECT 'Super admin user creation script ready. Please create user in Supabase Auth first, then update this script with the user ID.' as message;
