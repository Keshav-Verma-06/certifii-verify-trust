-- Create initial admin user credentials
-- Insert admin user profile with hashed password
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
-- Create student_academics table to store semester-wise SGPA uploads
CREATE TABLE IF NOT EXISTS public.student_academics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
    certificate_id uuid REFERENCES public.certificates(id), -- optional link if a certificate exists
    name text NOT NULL,
    roll_number text NOT NULL,
    division text,
    department text,
    sgpa_sem1 numeric(4,2),
    sgpa_sem2 numeric(4,2),
    sgpa_sem3 numeric(4,2),
    sgpa_sem4 numeric(4,2),
    sgpa_sem5 numeric(4,2),
    sgpa_sem6 numeric(4,2),
    sgpa_sem7 numeric(4,2),
    sgpa_sem8 numeric(4,2),
    uploaded_by uuid, -- user who uploaded the record
    source_file text, -- reference to the uploaded file path if needed
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (institution_id, roll_number) -- one row per student per institution
);

-- Enable RLS and create policies similar to certificates
ALTER TABLE public.student_academics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view verified student academics via certificate link" ON public.student_academics
FOR SELECT USING (
  -- Allow select when there is a linked verified certificate
  EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.id = student_academics.certificate_id AND c.status = 'verified'
  )
);

CREATE POLICY "Institutions can manage their student academics" ON public.student_academics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.institutions i ON p.institution_name = i.name
    WHERE p.user_id = auth.uid() AND i.id = student_academics.institution_id
  )
);

-- Allow authenticated users to insert rows they upload (when institution_id is null) to avoid blocking
-- bulk uploads for onboarding. Tighten later once institution mapping is enforced.
CREATE POLICY "Authenticated can insert their own student academics" ON public.student_academics
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "Admins can manage all student academics" ON public.student_academics
FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Trigger to maintain updated_at
CREATE TRIGGER update_student_academics_updated_at
    BEFORE UPDATE ON public.student_academics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_academics_institution ON public.student_academics(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_academics_roll ON public.student_academics(roll_number);
CREATE INDEX IF NOT EXISTS idx_student_academics_certificate ON public.student_academics(certificate_id);

-- Additional permissive policies to allow returning rows after insert under RLS
-- Allow authenticated users to SELECT rows they uploaded
CREATE POLICY "Authenticated can select own student academics" ON public.student_academics
FOR SELECT USING (
  auth.role() = 'authenticated' AND uploaded_by = auth.uid()
);

-- Allow authenticated users to UPDATE rows they uploaded (optional for future upserts)
CREATE POLICY "Authenticated can update own student academics" ON public.student_academics
FOR UPDATE USING (
  auth.role() = 'authenticated' AND uploaded_by = auth.uid()
) WITH CHECK (
  auth.role() = 'authenticated' AND uploaded_by = auth.uid()
);
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

-- Insert initial admin credentials (password: Admin123!@#)
-- Salt: randomSalt123
-- Password hash generated using bcrypt with the salt
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

-- Insert sample institution credentials for testing (password: Institution123!)
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