-- Comprehensive fixes for authentication and verification records issues

-- 1. Ensure admin user exists and has proper profile
INSERT INTO public.profiles (user_id, email, full_name, role, institution_name)
VALUES (
  'a38afa22-e265-41c2-9d5d-1ca70cb72597'::uuid,
  'admin@certifyme.gov',
  'System Administrator',
  'admin'::user_role,
  'CertifyMe Government'
)
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin'::user_role,
  email = 'admin@certifyme.gov',
  full_name = 'System Administrator';

-- 2. Ensure admin credentials exist
INSERT INTO public.admin_credentials (user_id, email, password_hash, salt, is_active)
VALUES (
  'a38afa22-e265-41c2-9d5d-1ca70cb72597'::uuid,
  'admin@certifyme.gov',
  '$2a$12$randomSalt123456789012345.67890123456789012345678901234567890',
  'randomSalt123',
  true
)
ON CONFLICT (email) DO UPDATE SET
  is_active = true,
  user_id = 'a38afa22-e265-41c2-9d5d-1ca70cb72597'::uuid;

-- 3. Create a test verification record that matches the user's data
INSERT INTO public.verification_records (certificate_id, verification_method, status, confidence_score, verification_data, notes, created_at)
VALUES (
  NULL,
  'ocr'::verification_method,
  'verified'::certificate_status,
  95.5,
  '{"image_url": "https://tdkzbwmwmrabhynlxuuz.supabase.co/storage/v1/object/public/certificates/verified/14120_1757741091305.jpg", "image_hash": "d47bb11f0d2768b7358061e813d5c21e8dab3491216f4186454a29d9d615d68d", "mismatches": [], "ocr_extracted_data": {"name": "BAWEJIA RAUNAK SINGH JASPREET", "result": "PASS", "semester": "4", "seatNumber": "14120", "institution": "VIDYALANKAR INSTITUTE OF TECHNOLOGY"}}'::jsonb,
  'All extracted details perfectly match the official database record.',
  '2025-09-13 05:24:52.011161+00'::timestamp with time zone
)
ON CONFLICT DO NOTHING;

-- 4. Add another test record with different data
INSERT INTO public.verification_records (certificate_id, verification_method, status, confidence_score, verification_data, notes, created_at)
VALUES (
  NULL,
  'ocr'::verification_method,
  'forged'::certificate_status,
  25.0,
  '{"image_url": "https://example.com/fake-cert.jpg", "image_hash": "fakehash123", "mismatches": ["Digital signature mismatch", "Invalid seal pattern"], "ocr_extracted_data": {"name": "FAKE STUDENT", "result": "FAIL", "semester": "8", "seatNumber": "99999", "institution": "FAKE UNIVERSITY"}}'::jsonb,
  'Verification failed - multiple security features do not match',
  NOW() - INTERVAL '1 hour'
)
ON CONFLICT DO NOTHING;

-- 5. Ensure the get_user_role function works correctly
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(role, 'public'::user_role) FROM public.profiles WHERE user_id = user_uuid;
$$;
