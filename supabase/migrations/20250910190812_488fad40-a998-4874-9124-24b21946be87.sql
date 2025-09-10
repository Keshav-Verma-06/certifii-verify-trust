-- Create verification_logs table to store verification attempts and results
CREATE TABLE public.verification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_status TEXT NOT NULL,
  ocr_extracted_data JSONB,
  user_input_data JSONB,
  is_db_verified BOOLEAN DEFAULT false,
  is_tampering_suspected BOOLEAN DEFAULT false,
  notes TEXT,
  image_hash TEXT,
  image_url TEXT,
  student_record_id UUID,
  qr_verification JSONB,
  mismatches TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for verification logs
CREATE POLICY "Admins can manage all verification logs" 
ON public.verification_logs 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Public can insert verification logs" 
ON public.verification_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can view their own verification logs" 
ON public.verification_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_verification_logs_status ON public.verification_logs(verification_status);
CREATE INDEX idx_verification_logs_image_hash ON public.verification_logs(image_hash);
CREATE INDEX idx_verification_logs_created_at ON public.verification_logs(created_at DESC);
CREATE INDEX idx_verification_logs_ocr_data ON public.verification_logs USING GIN(ocr_extracted_data);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_verification_logs_updated_at
BEFORE UPDATE ON public.verification_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();