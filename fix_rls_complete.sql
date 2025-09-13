-- Complete RLS fix for admin users
-- Run this directly in Supabase SQL Editor

-- 1. Fix admin role for the current user
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE user_id = 'a38afa22-e265-41c2-9d5d-1ca70cb72597';

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

-- 2. Disable RLS temporarily to reset all policies
ALTER TABLE public.verification_records DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;

-- 4. Drop ALL existing policies
DROP POLICY IF EXISTS "Admins can view all verification records" ON public.verification_records;
DROP POLICY IF EXISTS "Admins can manage all verification records" ON public.verification_records;
DROP POLICY IF EXISTS "Public can view verification records for verified certificates" ON public.verification_records;
DROP POLICY IF EXISTS "Service role can insert verification records" ON public.verification_records;
DROP POLICY IF EXISTS "Admins can do everything with verification records" ON public.verification_records;
DROP POLICY IF EXISTS "Public can view verified certificate records" ON public.verification_records;
DROP POLICY IF EXISTS "Service role can insert" ON public.verification_records;

-- 5. Create simple policies
CREATE POLICY "Admins can do everything" ON public.verification_records
FOR ALL USING (
  public.get_user_role(auth.uid()) = 'admin'::user_role
);

CREATE POLICY "Public can view verified records" ON public.verification_records
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.certificates 
    WHERE id = verification_records.certificate_id 
    AND status = 'verified'
  )
);

CREATE POLICY "Service role can insert" ON public.verification_records
FOR INSERT WITH CHECK (true);

-- 6. Grant explicit permissions
GRANT ALL ON public.verification_records TO authenticated;
GRANT ALL ON public.certificates TO authenticated;
GRANT ALL ON public.institutions TO authenticated;

-- 7. Test the fix
SELECT 
  'Admin role check' as test,
  role,
  full_name
FROM public.profiles 
WHERE user_id = 'a38afa22-e265-41c2-9d5d-1ca70cb72597';

SELECT 
  'Total records check' as test,
  COUNT(*) as total_records
FROM public.verification_records;

SELECT 
  'Admin access test' as test,
  public.test_admin_access() as result;
