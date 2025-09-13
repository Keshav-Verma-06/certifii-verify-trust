-- Fix RLS policies to show ALL verification records for admins
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all verification records" ON public.verification_records;
DROP POLICY IF EXISTS "Admins can manage all verification records" ON public.verification_records;
DROP POLICY IF EXISTS "Public can view verification records for verified certificates" ON public.verification_records;
DROP POLICY IF EXISTS "Service role can insert verification records" ON public.verification_records;

-- Create comprehensive policies for admins
CREATE POLICY "Admins can view all verification records" ON public.verification_records
FOR SELECT USING (
  public.get_user_role(auth.uid()) = 'admin'::user_role
);

CREATE POLICY "Admins can manage all verification records" ON public.verification_records
FOR ALL USING (
  public.get_user_role(auth.uid()) = 'admin'::user_role
);

-- Allow public to view verification records for verified certificates (keep original functionality)
CREATE POLICY "Public can view verification records for verified certificates" ON public.verification_records
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.certificates 
    WHERE id = verification_records.certificate_id 
    AND status = 'verified'
  )
);

-- Allow service role to insert verification records (for functions)
CREATE POLICY "Service role can insert verification records" ON public.verification_records
FOR INSERT WITH CHECK (true);

-- Also ensure the get_user_role function works correctly
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(role, 'public'::user_role) FROM public.profiles WHERE user_id = user_uuid;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.verification_records TO authenticated;
GRANT SELECT ON public.certificates TO authenticated;
GRANT SELECT ON public.institutions TO authenticated;
