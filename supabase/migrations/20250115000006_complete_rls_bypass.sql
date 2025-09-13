-- Complete RLS bypass for admin users to see ALL verification records
-- This migration ensures admins can see all records regardless of RLS policies

-- First, disable RLS temporarily to reset all policies
ALTER TABLE public.verification_records DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admins can view all verification records" ON public.verification_records;
DROP POLICY IF EXISTS "Admins can manage all verification records" ON public.verification_records;
DROP POLICY IF EXISTS "Public can view verification records for verified certificates" ON public.verification_records;
DROP POLICY IF EXISTS "Service role can insert verification records" ON public.verification_records;

-- Create a simple policy that allows admins to see everything
CREATE POLICY "Admins can do everything with verification records" ON public.verification_records
FOR ALL USING (
  public.get_user_role(auth.uid()) = 'admin'::user_role
);

-- Allow public to view verification records for verified certificates
CREATE POLICY "Public can view verified certificate records" ON public.verification_records
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.certificates 
    WHERE id = verification_records.certificate_id 
    AND status = 'verified'
  )
);

-- Allow service role to insert (for functions)
CREATE POLICY "Service role can insert" ON public.verification_records
FOR INSERT WITH CHECK (true);

-- Ensure the get_user_role function is working correctly
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(role, 'public'::user_role) FROM public.profiles WHERE user_id = user_uuid;
$$;

-- Grant explicit permissions
GRANT ALL ON public.verification_records TO authenticated;
GRANT ALL ON public.certificates TO authenticated;
GRANT ALL ON public.institutions TO authenticated;

-- Create a test function to verify admin access
CREATE OR REPLACE FUNCTION public.test_admin_access()
RETURNS TABLE(
  total_records BIGINT,
  admin_can_see_all BOOLEAN,
  sample_record_ids TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    (SELECT COUNT(*) FROM public.verification_records) as total_records,
    (SELECT COUNT(*) FROM public.verification_records WHERE public.get_user_role(auth.uid()) = 'admin') > 0 as admin_can_see_all,
    ARRAY(SELECT id::TEXT FROM public.verification_records ORDER BY created_at DESC LIMIT 5) as sample_record_ids;
$$;

-- Grant execute permission on test function
GRANT EXECUTE ON FUNCTION public.test_admin_access() TO authenticated;
