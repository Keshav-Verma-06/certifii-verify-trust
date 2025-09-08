-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE certificate_status AS ENUM ('pending', 'verified', 'forged', 'expired');
CREATE TYPE user_role AS ENUM ('admin', 'institution', 'public');
CREATE TYPE verification_method AS ENUM ('ocr', 'blockchain', 'manual', 'watermark');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create profiles table for user management
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    institution_name TEXT,
    role user_role DEFAULT 'public',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create institutions table
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    verification_key TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_blacklisted BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create certificates table
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id TEXT UNIQUE NOT NULL,
    student_name TEXT NOT NULL,
    course TEXT NOT NULL,
    institution_id UUID REFERENCES institutions(id),
    issue_date DATE NOT NULL,
    graduation_date DATE,
    grade TEXT,
    blockchain_hash TEXT,
    digital_signature TEXT,
    watermark_data JSONB,
    ocr_extracted_data JSONB,
    file_url TEXT,
    thumbnail_url TEXT,
    status certificate_status DEFAULT 'pending',
    verification_method verification_method[],
    is_legacy BOOLEAN DEFAULT false,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create verification_records table
CREATE TABLE public.verification_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID REFERENCES certificates(id),
    verified_by UUID,
    verification_method verification_method NOT NULL,
    status certificate_status NOT NULL,
    confidence_score DECIMAL(5,2),
    verification_data JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create blacklist_entries table
CREATE TABLE public.blacklist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'certificate', 'institution', 'user'
    entity_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    evidence JSONB,
    reported_by UUID,
    severity alert_severity DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID
);

-- Create forgery_reports table
CREATE TABLE public.forgery_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID REFERENCES certificates(id),
    reporter_email TEXT,
    reporter_name TEXT,
    description TEXT NOT NULL,
    evidence JSONB,
    severity alert_severity DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    investigated_by UUID,
    investigation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create bulk_upload_sessions table
CREATE TABLE public.bulk_upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id),
    uploaded_by UUID NOT NULL,
    file_name TEXT NOT NULL,
    total_records INTEGER NOT NULL,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing',
    error_log JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system_alerts table
CREATE TABLE public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity alert_severity DEFAULT 'medium',
    entity_type TEXT,
    entity_id TEXT,
    is_read BOOLEAN DEFAULT false,
    recipient_role user_role,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forgery_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for institutions
CREATE POLICY "Public can view verified institutions" ON public.institutions
FOR SELECT USING (is_verified = true AND is_blacklisted = false);

CREATE POLICY "Admins can manage institutions" ON public.institutions
FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Institutions can view their own data" ON public.institutions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND institution_name = institutions.name
  )
);

-- Create RLS policies for certificates
CREATE POLICY "Public can view verified certificates" ON public.certificates
FOR SELECT USING (status = 'verified');

CREATE POLICY "Institutions can manage their certificates" ON public.certificates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.institutions i ON p.institution_name = i.name
    WHERE p.user_id = auth.uid() AND i.id = certificates.institution_id
  )
);

CREATE POLICY "Admins can manage all certificates" ON public.certificates
FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for verification records
CREATE POLICY "Public can view verification records for verified certificates" ON public.verification_records
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.certificates 
    WHERE id = verification_records.certificate_id 
    AND status = 'verified'
  )
);

CREATE POLICY "Admins can manage verification records" ON public.verification_records
FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for blacklist entries
CREATE POLICY "Admins can manage blacklist entries" ON public.blacklist_entries
FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for forgery reports
CREATE POLICY "Anyone can create forgery reports" ON public.forgery_reports
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view and manage forgery reports" ON public.forgery_reports
FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for bulk upload sessions
CREATE POLICY "Institutions can view their upload sessions" ON public.bulk_upload_sessions
FOR SELECT USING (uploaded_by = auth.uid());

CREATE POLICY "Institutions can create upload sessions" ON public.bulk_upload_sessions
FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admins can view all upload sessions" ON public.bulk_upload_sessions
FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for system alerts
CREATE POLICY "Users can view their role alerts" ON public.system_alerts
FOR SELECT USING (
  recipient_role IS NULL OR 
  recipient_role = public.get_user_role(auth.uid()) OR
  public.get_user_role(auth.uid()) = 'admin'
);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('certificates', 'certificates', false),
('thumbnails', 'thumbnails', true),
('bulk-uploads', 'bulk-uploads', false);

-- Create storage policies for certificates
CREATE POLICY "Authenticated users can upload certificates" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'certificates' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their uploaded certificates" ON storage.objects
FOR SELECT USING (
  bucket_id = 'certificates' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all certificates" ON storage.objects
FOR SELECT USING (
  bucket_id = 'certificates' AND 
  public.get_user_role(auth.uid()) = 'admin'
);

-- Create storage policies for thumbnails (public)
CREATE POLICY "Anyone can view thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' AND 
  auth.role() = 'authenticated'
);

-- Create storage policies for bulk uploads
CREATE POLICY "Institutions can upload bulk files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'bulk-uploads' AND 
  public.get_user_role(auth.uid()) IN ('institution', 'admin')
);

CREATE POLICY "Users can view their bulk uploads" ON storage.objects
FOR SELECT USING (
  bucket_id = 'bulk-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_institutions_updated_at
    BEFORE UPDATE ON public.institutions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at
    BEFORE UPDATE ON public.certificates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_certificates_status ON public.certificates(status);
CREATE INDEX idx_certificates_institution ON public.certificates(institution_id);
CREATE INDEX idx_certificates_student_name ON public.certificates(student_name);
CREATE INDEX idx_verification_records_certificate ON public.verification_records(certificate_id);
CREATE INDEX idx_blacklist_entries_entity ON public.blacklist_entries(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_action ON public.audit_logs(user_id, action);
CREATE INDEX idx_system_alerts_role ON public.system_alerts(recipient_role, is_read);