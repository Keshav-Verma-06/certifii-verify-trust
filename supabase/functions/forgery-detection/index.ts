import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ForgeryDetectionRequest {
  certificate_id: string;
  file_url?: string;
  reporter_info?: {
    name: string;
    email: string;
    description: string;
  };
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

    const { certificate_id, file_url, reporter_info }: ForgeryDetectionRequest = await req.json();

    console.log('Running forgery detection for certificate:', certificate_id);

    // Get certificate from database
    const { data: certificate, error: certError } = await supabaseClient
      .from('certificates')
      .select('*, institutions(*)')
      .eq('certificate_id', certificate_id)
      .single();

    if (certError || !certificate) {
      throw new Error('Certificate not found');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let suspiciousPatterns = [];
    let confidenceScore = 100;

    // AI-powered forgery detection using GPT-5
    if (file_url || certificate.file_url) {
      const imageUrl = file_url || certificate.file_url;
      
      const forgeryAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this certificate image for signs of forgery. Look for:
                  1. Inconsistent fonts or typography
                  2. Misaligned text or elements
                  3. Poor image quality in specific areas
                  4. Suspicious watermarks or stamps
                  5. Inconsistent dates or formatting
                  6. Unusual institution names or logos
                  
                  Return a JSON response with:
                  {
                    "is_suspicious": boolean,
                    "confidence_score": number (0-100),
                    "suspicious_elements": ["list of issues found"],
                    "analysis": "detailed analysis"
                  }`
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl }
                }
              ]
            }
          ],
          max_completion_tokens: 1000
        }),
      });

      const forgeryResult = await forgeryAnalysisResponse.json();
      console.log('Forgery Analysis Result:', forgeryResult);

      try {
        const analysis = JSON.parse(forgeryResult.choices[0].message.content);
        if (analysis.is_suspicious) {
          suspiciousPatterns = analysis.suspicious_elements || [];
          confidenceScore = Math.min(confidenceScore, 100 - analysis.confidence_score);
        }
      } catch (parseError) {
        console.error('Failed to parse forgery analysis:', parseError);
      }
    }

    // Check for data inconsistencies
    if (certificate.ocr_extracted_data) {
      const extractedData = certificate.ocr_extracted_data as any;
      
      // Check date consistency
      if (extractedData.issue_date && certificate.issue_date) {
        const extractedDate = new Date(extractedData.issue_date);
        const recordDate = new Date(certificate.issue_date);
        if (Math.abs(extractedDate.getTime() - recordDate.getTime()) > 86400000) { // 1 day difference
          suspiciousPatterns.push('Date mismatch between OCR and database');
          confidenceScore -= 20;
        }
      }

      // Check name consistency
      if (extractedData.student_name && certificate.student_name) {
        const similarity = calculateStringSimilarity(
          extractedData.student_name.toLowerCase(),
          certificate.student_name.toLowerCase()
        );
        if (similarity < 0.8) {
          suspiciousPatterns.push('Student name inconsistency');
          confidenceScore -= 15;
        }
      }
    }

    // Check institution verification status
    if (certificate.institutions && (!certificate.institutions.is_verified || certificate.institutions.is_blacklisted)) {
      suspiciousPatterns.push('Institution not verified or blacklisted');
      confidenceScore -= 30;
    }

    // Check for duplicate certificates
    const { data: duplicates } = await supabaseClient
      .from('certificates')
      .select('id, certificate_id')
      .eq('student_name', certificate.student_name)
      .eq('course', certificate.course)
      .eq('institution_id', certificate.institution_id)
      .neq('id', certificate.id);

    if (duplicates && duplicates.length > 0) {
      suspiciousPatterns.push('Duplicate certificate detected');
      confidenceScore -= 25;
    }

    // Determine final status
    let finalStatus: 'verified' | 'forged' | 'pending';
    let severity: 'low' | 'medium' | 'high' | 'critical';

    if (confidenceScore < 30) {
      finalStatus = 'forged';
      severity = 'critical';
    } else if (confidenceScore < 60) {
      finalStatus = 'pending';
      severity = 'high';
    } else if (confidenceScore < 80) {
      finalStatus = 'pending';
      severity = 'medium';
    } else {
      finalStatus = 'verified';
      severity = 'low';
    }

    // Update certificate status
    await supabaseClient
      .from('certificates')
      .update({ 
        status: finalStatus,
        verification_method: [...(certificate.verification_method || []), 'watermark']
      })
      .eq('id', certificate.id);

    // Create verification record
    const { data: verificationRecord } = await supabaseClient
      .from('verification_records')
      .insert({
        certificate_id: certificate.id,
        verification_method: 'watermark',
        status: finalStatus,
        confidence_score: confidenceScore,
        verification_data: {
          suspicious_patterns: suspiciousPatterns,
          ai_analysis: true,
          manual_review_required: confidenceScore < 70
        },
        notes: `Forgery detection completed. Found ${suspiciousPatterns.length} suspicious patterns.`
      })
      .select()
      .single();

    // Create forgery report if reporter info provided
    if (reporter_info) {
      await supabaseClient
        .from('forgery_reports')
        .insert({
          certificate_id: certificate.id,
          reporter_email: reporter_info.email,
          reporter_name: reporter_info.name,
          description: reporter_info.description,
          evidence: {
            suspicious_patterns: suspiciousPatterns,
            confidence_score: confidenceScore
          },
          severity,
          status: 'pending'
        });
    }

    // Add to blacklist if highly suspicious
    if (finalStatus === 'forged') {
      await supabaseClient
        .from('blacklist_entries')
        .insert({
          entity_type: 'certificate',
          entity_id: certificate_id,
          reason: `Forgery detected: ${suspiciousPatterns.join(', ')}`,
          evidence: {
            suspicious_patterns: suspiciousPatterns,
            confidence_score: confidenceScore,
            verification_record_id: verificationRecord?.id
          },
          severity,
          is_active: true
        });
    }

    // Create system alert
    if (finalStatus === 'forged' || severity === 'high' || severity === 'critical') {
      await supabaseClient
        .from('system_alerts')
        .insert({
          title: finalStatus === 'forged' ? 'Forged Certificate Detected' : 'Suspicious Certificate Found',
          message: `Certificate ${certificate_id} flagged for review: ${suspiciousPatterns.join(', ')}`,
          severity,
          entity_type: 'certificate',
          entity_id: certificate_id,
          recipient_role: 'admin'
        });
    }

    // Log audit trail
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: (await supabaseClient.auth.getUser()).data.user?.id,
        action: 'FORGERY_DETECTION',
        entity_type: 'certificate',
        entity_id: certificate_id,
        new_values: {
          final_status: finalStatus,
          confidence_score: confidenceScore,
          suspicious_patterns: suspiciousPatterns,
          severity
        }
      });

    return new Response(JSON.stringify({
      success: true,
      certificate_id,
      status: finalStatus,
      confidence_score: confidenceScore,
      suspicious_patterns: suspiciousPatterns,
      severity,
      requires_manual_review: confidenceScore < 70
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in forgery-detection function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to calculate string similarity
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}