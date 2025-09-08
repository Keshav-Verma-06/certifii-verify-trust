import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRData {
  student_name: string;
  course: string;
  institution_name: string;
  issue_date: string;
  grade?: string;
  certificate_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string || '{}');

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing certificate upload:', file.name, file.type);

    // Upload file to Supabase Storage
    const fileName = `${crypto.randomUUID()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('certificates')
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get file URL
    const { data: urlData } = supabaseClient.storage
      .from('certificates')
      .getPublicUrl(fileName);

    // OCR Processing using OpenAI Vision API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Convert file to base64 for OpenAI
    const arrayBuffer = await file.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract the following information from this certificate image and return only valid JSON:
                {
                  "student_name": "full name of student",
                  "course": "course/degree name",
                  "institution_name": "institution name",
                  "issue_date": "YYYY-MM-DD format",
                  "grade": "grade if mentioned",
                  "certificate_id": "certificate ID/number if visible"
                }
                If any field is not clearly visible, use null for that field.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${base64File}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      }),
    });

    const ocrResult = await ocrResponse.json();
    console.log('OCR Result:', ocrResult);

    let extractedData: OCRData | null = null;
    try {
      extractedData = JSON.parse(ocrResult.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse OCR result:', parseError);
      extractedData = null;
    }

    // Generate blockchain hash for authenticity
    const blockchainHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${fileName}-${Date.now()}`)
    );
    const hashArray = Array.from(new Uint8Array(blockchainHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create digital signature
    const digitalSignature = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify(extractedData) + hashHex)
    );
    const sigArray = Array.from(new Uint8Array(digitalSignature));
    const sigHex = sigArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Find or create institution
    let institutionId = null;
    if (extractedData?.institution_name) {
      const { data: institution } = await supabaseClient
        .from('institutions')
        .select('id')
        .eq('name', extractedData.institution_name)
        .single();

      if (!institution) {
        const { data: newInstitution } = await supabaseClient
          .from('institutions')
          .insert({
            name: extractedData.institution_name,
            code: extractedData.institution_name.replace(/\s+/g, '_').toUpperCase(),
            is_verified: false
          })
          .select('id')
          .single();
        institutionId = newInstitution?.id;
      } else {
        institutionId = institution.id;
      }
    }

    // Save certificate record
    const { data: certificate, error: certError } = await supabaseClient
      .from('certificates')
      .insert({
        certificate_id: extractedData?.certificate_id || `CERT-${Date.now()}`,
        student_name: extractedData?.student_name || metadata.student_name,
        course: extractedData?.course || metadata.course,
        institution_id: institutionId,
        issue_date: extractedData?.issue_date || metadata.issue_date,
        grade: extractedData?.grade || metadata.grade,
        blockchain_hash: hashHex,
        digital_signature: sigHex,
        ocr_extracted_data: extractedData,
        file_url: urlData.publicUrl,
        status: 'pending',
        verification_method: ['ocr'],
        uploaded_by: (await supabaseClient.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (certError) {
      throw new Error(`Failed to save certificate: ${certError.message}`);
    }

    // Create verification record
    await supabaseClient
      .from('verification_records')
      .insert({
        certificate_id: certificate.id,
        verification_method: 'ocr',
        status: extractedData ? 'verified' : 'pending',
        confidence_score: extractedData ? 85.0 : 50.0,
        verification_data: {
          ocr_extracted: extractedData,
          blockchain_hash: hashHex,
          digital_signature: sigHex
        },
        notes: extractedData ? 'OCR extraction successful' : 'OCR extraction failed, manual review required'
      });

    // Log audit trail
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: (await supabaseClient.auth.getUser()).data.user?.id,
        action: 'CERTIFICATE_UPLOAD',
        entity_type: 'certificate',
        entity_id: certificate.id,
        new_values: certificate
      });

    return new Response(JSON.stringify({
      success: true,
      certificate,
      extracted_data: extractedData,
      blockchain_hash: hashHex,
      verification_status: extractedData ? 'verified' : 'pending'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in certificate-upload function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});