import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlockchainValidationRequest {
  certificate_id: string;
  blockchain_hash?: string;
  digital_signature?: string;
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

    const { certificate_id, blockchain_hash, digital_signature }: BlockchainValidationRequest = await req.json();

    console.log('Validating blockchain for certificate:', certificate_id);

    // Get certificate from database
    const { data: certificate, error: certError } = await supabaseClient
      .from('certificates')
      .select('*')
      .eq('certificate_id', certificate_id)
      .single();

    if (certError || !certificate) {
      throw new Error('Certificate not found');
    }

    // Validate blockchain hash
    let hashValid = false;
    if (blockchain_hash && certificate.blockchain_hash) {
      hashValid = blockchain_hash === certificate.blockchain_hash;
    } else if (certificate.blockchain_hash) {
      // Re-compute hash and validate
      const computedHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`${certificate.certificate_id}-${new Date(certificate.created_at).getTime()}`)
      );
      const hashArray = Array.from(new Uint8Array(computedHash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      hashValid = hashHex === certificate.blockchain_hash;
    }

    // Validate digital signature
    let signatureValid = false;
    if (digital_signature && certificate.digital_signature) {
      signatureValid = digital_signature === certificate.digital_signature;
    } else if (certificate.digital_signature && certificate.ocr_extracted_data) {
      // Re-compute signature and validate
      const computedSignature = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(certificate.ocr_extracted_data) + certificate.blockchain_hash)
      );
      const sigArray = Array.from(new Uint8Array(computedSignature));
      const sigHex = sigArray.map(b => b.toString(16).padStart(2, '0')).join('');
      signatureValid = sigHex === certificate.digital_signature;
    }

    // Check institution verification status
    let institutionValid = false;
    if (certificate.institution_id) {
      const { data: institution } = await supabaseClient
        .from('institutions')
        .select('is_verified, is_blacklisted')
        .eq('id', certificate.institution_id)
        .single();

      institutionValid = institution?.is_verified && !institution?.is_blacklisted;
    }

    // Check blacklist status
    const { data: blacklistEntry } = await supabaseClient
      .from('blacklist_entries')
      .select('*')
      .eq('entity_type', 'certificate')
      .eq('entity_id', certificate_id)
      .eq('is_active', true)
      .single();

    const isBlacklisted = !!blacklistEntry;

    // Calculate overall validation score
    let validationScore = 0;
    let validationDetails = [];

    if (hashValid) {
      validationScore += 30;
      validationDetails.push('Blockchain hash verified');
    } else {
      validationDetails.push('Blockchain hash verification failed');
    }

    if (signatureValid) {
      validationScore += 30;
      validationDetails.push('Digital signature verified');
    } else {
      validationDetails.push('Digital signature verification failed');
    }

    if (institutionValid) {
      validationScore += 25;
      validationDetails.push('Institution verified');
    } else {
      validationDetails.push('Institution not verified or blacklisted');
    }

    if (!isBlacklisted) {
      validationScore += 15;
      validationDetails.push('Not on blacklist');
    } else {
      validationScore = 0; // Override score if blacklisted
      validationDetails.push('Certificate is blacklisted');
    }

    // Determine validation status
    let validationStatus: 'verified' | 'forged' | 'pending';
    if (isBlacklisted) {
      validationStatus = 'forged';
    } else if (validationScore >= 70) {
      validationStatus = 'verified';
    } else if (validationScore >= 40) {
      validationStatus = 'pending';
    } else {
      validationStatus = 'forged';
    }

    // Update certificate status if needed
    if (certificate.status !== validationStatus) {
      await supabaseClient
        .from('certificates')
        .update({ 
          status: validationStatus,
          verification_method: [...(certificate.verification_method || []), 'blockchain']
        })
        .eq('id', certificate.id);
    }

    // Create verification record
    await supabaseClient
      .from('verification_records')
      .insert({
        certificate_id: certificate.id,
        verification_method: 'blockchain',
        status: validationStatus,
        confidence_score: validationScore,
        verification_data: {
          blockchain_hash_valid: hashValid,
          digital_signature_valid: signatureValid,
          institution_valid: institutionValid,
          blacklisted: isBlacklisted,
          validation_details: validationDetails
        },
        notes: `Blockchain validation completed with ${validationScore}% confidence`
      });

    // Create alert if potentially forged
    if (validationStatus === 'forged' || validationScore < 50) {
      await supabaseClient
        .from('system_alerts')
        .insert({
          title: 'Suspicious Certificate Detected',
          message: `Certificate ${certificate_id} failed blockchain validation`,
          severity: 'high',
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
        action: 'BLOCKCHAIN_VALIDATION',
        entity_type: 'certificate',
        entity_id: certificate_id,
        new_values: {
          validation_status: validationStatus,
          validation_score: validationScore,
          blockchain_hash_valid: hashValid,
          digital_signature_valid: signatureValid
        }
      });

    return new Response(JSON.stringify({
      success: true,
      certificate_id,
      validation_status: validationStatus,
      validation_score: validationScore,
      details: {
        blockchain_hash_valid: hashValid,
        digital_signature_valid: signatureValid,
        institution_valid: institutionValid,
        blacklisted: isBlacklisted,
        validation_details: validationDetails
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in blockchain-validation function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});