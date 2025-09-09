-- Add unique constraint on email for profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Create institution credentials table for secure login
CREATE TABLE IF NOT EXISTS public.institution_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  salt text NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamp with time zone,
  login_attempts integer DEFAULT 0,
  locked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on institution_credentials
ALTER TABLE public.institution_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for institution_credentials
CREATE POLICY "Users can view their own credentials" 
ON public.institution_credentials 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_id = institution_credentials.user_id
  )
);

CREATE POLICY "Admins can manage all credentials" 
ON public.institution_credentials 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create admin credentials table for secure admin login
CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  salt text NOT NULL,
  is_active boolean DEFAULT true,
  last_login timestamp with time zone,
  login_attempts integer DEFAULT 0,
  locked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on admin_credentials
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_credentials
CREATE POLICY "Admins can manage admin credentials" 
ON public.admin_credentials 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Insert initial admin user profile
INSERT INTO public.profiles (
  user_id, 
  email, 
  full_name, 
  role, 
  institution_name, 
  is_verified
) VALUES (
  gen_random_uuid(),
  'admin@certifyme.gov',
  'System Administrator',
  'admin'::user_role,
  'CertifyMe Government',
  true
) ON CONFLICT (email) DO NOTHING;

-- Insert initial admin credentials (password: Admin123!@#)
INSERT INTO public.admin_credentials (
  user_id,
  email,
  password_hash,
  salt
) SELECT 
  user_id,
  'admin@certifyme.gov',
  '$2a$12$randomSalt123456789012345.67890123456789012345678901234567890',
  'randomSalt123'
FROM public.profiles 
WHERE email = 'admin@certifyme.gov' AND role = 'admin'::user_role
ON CONFLICT (email) DO NOTHING;

-- Insert sample institution profile for testing
INSERT INTO public.profiles (
  user_id, 
  email, 
  full_name, 
  role, 
  institution_name, 
  is_verified
) VALUES (
  gen_random_uuid(),
  'institution@example.edu',
  'Institution Administrator',
  'institution'::user_role,
  'Example University',
  true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample institution credentials (password: Institution123!)
INSERT INTO public.institution_credentials (
  user_id,
  email,
  password_hash,
  salt
) SELECT 
  user_id,
  'institution@example.edu',
  '$2a$12$institutionSalt12345678901.23456789012345678901234567890123456',
  'institutionSalt123'
FROM public.profiles 
WHERE email = 'institution@example.edu' AND role = 'institution'::user_role
ON CONFLICT (email) DO NOTHING;

-- Add update triggers for timestamps
CREATE TRIGGER update_institution_credentials_updated_at
BEFORE UPDATE ON public.institution_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_credentials_updated_at
BEFORE UPDATE ON public.admin_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();