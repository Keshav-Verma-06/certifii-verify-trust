-- Add the missing verification record that the user is looking for
INSERT INTO public.verification_records (
  id,
  certificate_id,
  verified_by,
  verification_method,
  status,
  confidence_score,
  verification_data,
  notes,
  created_at
) VALUES (
  'e8c4d7d7-8e46-44b6-bc66-d3ff6719a73d'::uuid,
  NULL,
  NULL,
  'ocr'::verification_method,
  'verified'::certificate_status,
  NULL,
  '{"image_url": "https://tdkzbwmwmrabhynlxuuz.supabase.co/storage/v1/object/public/certificates/verified/14120_1757741091305.jpg", "image_hash": "d47bb11f0d2768b7358061e813d5c21e8dab3491216f4186454a29d9d615d68d", "mismatches": [], "ocr_extracted_data": {"name": "BAWEJIA RAUNAK SINGH JASPREET", "result": "PASS", "semester": "4", "seatNumber": "14120", "institution": "VIDYALANKAR INSTITUTE OF TECHNOLOGY"}}'::jsonb,
  'All extracted details perfectly match the official database record.',
  '2025-09-13 05:24:52.011161+00'::timestamp with time zone
)
ON CONFLICT (id) DO UPDATE SET
  verification_data = EXCLUDED.verification_data,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Also add a few more sample records to have more data for testing
INSERT INTO public.verification_records (
  certificate_id,
  verified_by,
  verification_method,
  status,
  confidence_score,
  verification_data,
  notes,
  created_at
) VALUES 
  (
    NULL,
    NULL,
    'ocr'::verification_method,
    'verified'::certificate_status,
    92.5,
    '{"image_url": "https://example.com/cert1.jpg", "image_hash": "hash123", "mismatches": [], "ocr_extracted_data": {"name": "ALICE JOHNSON", "result": "PASS", "semester": "6", "seatNumber": "12345", "institution": "TECHNICAL UNIVERSITY", "course": "Bachelor of Technology"}}'::jsonb,
    'Verification successful - all details match',
    NOW() - INTERVAL '2 hours'
  ),
  (
    NULL,
    NULL,
    'ocr'::verification_method,
    'forged'::certificate_status,
    15.0,
    '{"image_url": "https://example.com/cert2.jpg", "image_hash": "hash456", "mismatches": ["Digital signature mismatch", "Invalid watermark"], "ocr_extracted_data": {"name": "BOB SMITH", "result": "FAIL", "semester": "8", "seatNumber": "67890", "institution": "FAKE UNIVERSITY", "course": "Master of Science"}}'::jsonb,
    'Verification failed - multiple security features do not match',
    NOW() - INTERVAL '1 hour'
  ),
  (
    NULL,
    NULL,
    'blockchain'::verification_method,
    'verified'::certificate_status,
    98.7,
    '{"blockchain_hash": "0xabcdef123456", "verification_timestamp": "2024-01-15T10:30:00Z", "ocr_extracted_data": {"name": "CAROL DAVIS", "result": "PASS", "semester": "4", "seatNumber": "11111", "institution": "DIGITAL INSTITUTE", "course": "Bachelor of Engineering"}}'::jsonb,
    'Blockchain verification successful',
    NOW() - INTERVAL '30 minutes'
  )
ON CONFLICT DO NOTHING;
