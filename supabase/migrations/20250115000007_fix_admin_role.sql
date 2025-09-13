-- Fix admin role for the current user
-- This ensures the user has admin role to bypass RLS

-- Update the user's role to admin
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE user_id = 'a38afa22-e265-41c2-9d5d-1ca70cb72597';

-- If the profile doesn't exist, create it
INSERT INTO public.profiles (user_id, role, full_name, email)
VALUES (
  'a38afa22-e265-41c2-9d5d-1ca70cb72597',
  'admin'::user_role,
  'Admin User',
  'harshkeshavverma@gmail.com'
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin'::user_role,
  full_name = COALESCE(profiles.full_name, 'Admin User'),
  email = COALESCE(profiles.email, 'harshkeshavverma@gmail.com');

-- Verify the role was set correctly
SELECT 
  user_id, 
  role, 
  full_name, 
  email,
  created_at
FROM public.profiles 
WHERE user_id = 'a38afa22-e265-41c2-9d5d-1ca70cb72597';
