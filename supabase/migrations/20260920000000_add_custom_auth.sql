-- Create custom authentication table (no Supabase Auth required)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read usernames (for login verification)
CREATE POLICY "Anyone can read users" 
ON public.users 
FOR SELECT 
USING (true);

-- Policy: Anyone can insert (signup)
CREATE POLICY "Anyone can signup" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

-- Add index for faster username lookups
CREATE INDEX idx_users_username ON public.users(username);

-- Update student_profiles to reference custom users table
ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_user_id_fkey;

