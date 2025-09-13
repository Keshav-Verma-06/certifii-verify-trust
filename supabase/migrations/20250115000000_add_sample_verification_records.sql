-- Add sample verification records for testing AdminDashboard
-- First, ensure we have some sample institutions
INSERT INTO public.institutions (name, code, address, contact_email, is_verified, is_blacklisted)
VALUES 
  ('State University', 'SU001', '123 University Ave, State City', 'admin@stateuniv.edu', true, false),
  ('Business College', 'BC002', '456 Business St, Commerce City', 'info@businesscollege.edu', true, false),
  ('Tech Institute', 'TI003', '789 Tech Blvd, Innovation City', 'contact@techinstitute.edu', true, false),
  ('Arts University', 'AU004', '321 Arts Lane, Creative City', 'hello@artsuniversity.edu', true, false)
ON CONFLICT (code) DO NOTHING;

-- Add sample certificates
INSERT INTO public.certificates (certificate_id, student_name, course, institution_id, issue_date, graduation_date, grade, status, verification_method)
SELECT 
  'CERT2024001',
  'John Doe',
  'BSc Computer Science',
  i.id,
  '2024-01-15',
  '2024-01-15',
  'A+',
  'verified',
  ARRAY['ocr']::verification_method[]
FROM public.institutions i WHERE i.code = 'SU001'
ON CONFLICT (certificate_id) DO NOTHING;

INSERT INTO public.certificates (certificate_id, student_name, course, institution_id, issue_date, graduation_date, grade, status, verification_method)
SELECT 
  'CERT2024002',
  'Jane Smith',
  'MBA Finance',
  i.id,
  '2024-01-14',
  '2024-01-14',
  'A',
  'forged',
  ARRAY['ocr']::verification_method[]
FROM public.institutions i WHERE i.code = 'BC002'
ON CONFLICT (certificate_id) DO NOTHING;

INSERT INTO public.certificates (certificate_id, student_name, course, institution_id, issue_date, graduation_date, grade, status, verification_method)
SELECT 
  'CERT2024003',
  'Mike Johnson',
  'BTech Civil Engineering',
  i.id,
  '2024-01-13',
  '2024-01-13',
  'B+',
  'verified',
  ARRAY['ocr']::verification_method[]
FROM public.institutions i WHERE i.code = 'TI003'
ON CONFLICT (certificate_id) DO NOTHING;

INSERT INTO public.certificates (certificate_id, student_name, course, institution_id, issue_date, graduation_date, grade, status, verification_method)
SELECT 
  'CERT2024004',
  'Sarah Wilson',
  'MA English Literature',
  i.id,
  '2024-01-12',
  '2024-01-12',
  'A-',
  'pending',
  ARRAY['ocr']::verification_method[]
FROM public.institutions i WHERE i.code = 'AU004'
ON CONFLICT (certificate_id) DO NOTHING;

-- Add sample verification records
INSERT INTO public.verification_records (certificate_id, verification_method, status, confidence_score, verification_data, notes)
SELECT 
  c.id,
  'ocr'::verification_method,
  'verified'::certificate_status,
  95.5,
  '{"ocr_extracted_data": {"student_name": "John Doe", "course": "BSc Computer Science", "certificate_id": "CERT2024001"}, "mismatches": [], "image_hash": "abc123def456"}'::jsonb,
  'OCR verification successful - all data matches'
FROM public.certificates c WHERE c.certificate_id = 'CERT2024001'
ON CONFLICT DO NOTHING;

INSERT INTO public.verification_records (certificate_id, verification_method, status, confidence_score, verification_data, notes)
SELECT 
  c.id,
  'ocr'::verification_method,
  'forged'::certificate_status,
  15.2,
  '{"ocr_extracted_data": {"student_name": "Jane Smith", "course": "MBA Finance", "certificate_id": "CERT2024002"}, "mismatches": ["Digital signature mismatch", "Invalid seal pattern"], "image_hash": "def456ghi789"}'::jsonb,
  'Verification failed - multiple security features do not match'
FROM public.certificates c WHERE c.certificate_id = 'CERT2024002'
ON CONFLICT DO NOTHING;

INSERT INTO public.verification_records (certificate_id, verification_method, status, confidence_score, verification_data, notes)
SELECT 
  c.id,
  'ocr'::verification_method,
  'verified'::certificate_status,
  88.7,
  '{"ocr_extracted_data": {"student_name": "Mike Johnson", "course": "BTech Civil Engineering", "certificate_id": "CERT2024003"}, "mismatches": [], "image_hash": "ghi789jkl012"}'::jsonb,
  'OCR verification successful with minor confidence reduction due to image quality'
FROM public.certificates c WHERE c.certificate_id = 'CERT2024003'
ON CONFLICT DO NOTHING;

INSERT INTO public.verification_records (certificate_id, verification_method, status, confidence_score, verification_data, notes)
SELECT 
  c.id,
  'ocr'::verification_method,
  'pending'::certificate_status,
  65.0,
  '{"ocr_extracted_data": {"student_name": "Sarah Wilson", "course": "MA English Literature", "certificate_id": "CERT2024004"}, "mismatches": ["Low image quality"], "image_hash": "jkl012mno345"}'::jsonb,
  'Verification pending - requires manual review due to image quality issues'
FROM public.certificates c WHERE c.certificate_id = 'CERT2024004'
ON CONFLICT DO NOTHING;

-- Add some additional recent verification records for better testing
INSERT INTO public.verification_records (certificate_id, verification_method, status, confidence_score, verification_data, notes, created_at)
SELECT 
  c.id,
  'blockchain'::verification_method,
  'verified'::certificate_status,
  99.1,
  '{"blockchain_hash": "0x1234567890abcdef", "verification_timestamp": "2024-01-15T10:30:00Z"}'::jsonb,
  'Blockchain verification successful - certificate hash matches on-chain record',
  NOW() - INTERVAL '2 hours'
FROM public.certificates c WHERE c.certificate_id = 'CERT2024001'
ON CONFLICT DO NOTHING;

INSERT INTO public.verification_records (certificate_id, verification_method, status, confidence_score, verification_data, notes, created_at)
SELECT 
  c.id,
  'manual'::verification_method,
  'verified'::certificate_status,
  100.0,
  '{"reviewer": "admin@certifyme.gov", "review_notes": "Manually verified by admin after OCR failure"}'::jsonb,
  'Manual verification completed by admin reviewer',
  NOW() - INTERVAL '1 hour'
FROM public.certificates c WHERE c.certificate_id = 'CERT2024003'
ON CONFLICT DO NOTHING;

-- Add a verification record with null certificate_id to test the new logic
INSERT INTO public.verification_records (certificate_id, verification_method, status, confidence_score, verification_data, notes, created_at)
VALUES (
  NULL,
  'ocr'::verification_method,
  'verified'::certificate_status,
  95.5,
  '{"ocr_extracted_data": {"name": "BAWEJIA RAUNAK SINGH JASPREET", "result": "PASS", "semester": "4", "seatNumber": "14120", "institution": "VIDYALANKAR INSTITUTE OF TECHNOLOGY", "course": "Bachelor of Technology"}}'::jsonb,
  'All extracted details perfectly match the official database record.',
  NOW() - INTERVAL '30 minutes'
)
ON CONFLICT DO NOTHING;
