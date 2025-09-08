import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std@0.178.0/encoding/csv.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateRow {
  certificate_id: string;
  student_name: string;
  course: string;
  institution_name: string;
  issue_date: string;
  graduation_date?: string;
  grade?: string;
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
    const institutionId = formData.get('institution_id') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing bulk upload:', file.name, file.type);

    // Upload file to storage for tracking
    const fileName = `${crypto.randomUUID()}-${file.name}`;
    await supabaseClient.storage
      .from('bulk-uploads')
      .upload(fileName, file);

    // Parse CSV/Excel file
    const fileContent = await file.text();
    const rows = parse(fileContent, { skipFirstRow: true }) as string[][];

    // Create bulk upload session
    const { data: session, error: sessionError } = await supabaseClient
      .from('bulk_upload_sessions')
      .insert({
        institution_id: institutionId,
        uploaded_by: (await supabaseClient.auth.getUser()).data.user?.id,
        file_name: file.name,
        total_records: rows.length,
        status: 'processing'
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create upload session: ${sessionError.message}`);
    }

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const certificateData: CertificateRow = {
          certificate_id: row[0],
          student_name: row[1],
          course: row[2],
          institution_name: row[3],
          issue_date: row[4],
          graduation_date: row[5] || undefined,
          grade: row[6] || undefined
        };

        // Validate required fields
        if (!certificateData.certificate_id || !certificateData.student_name || 
            !certificateData.course || !certificateData.issue_date) {
          throw new Error(`Row ${i + 1}: Missing required fields`);
        }

        // Generate blockchain hash
        const blockchainHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(`${certificateData.certificate_id}-${Date.now()}`)
        );
        const hashArray = Array.from(new Uint8Array(blockchainHash));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Generate digital signature
        const digitalSignature = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(JSON.stringify(certificateData) + hashHex)
        );
        const sigArray = Array.from(new Uint8Array(digitalSignature));
        const sigHex = sigArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Insert certificate
        const { error: certError } = await supabaseClient
          .from('certificates')
          .insert({
            certificate_id: certificateData.certificate_id,
            student_name: certificateData.student_name,
            course: certificateData.course,
            institution_id: institutionId,
            issue_date: certificateData.issue_date,
            graduation_date: certificateData.graduation_date,
            grade: certificateData.grade,
            blockchain_hash: hashHex,
            digital_signature: sigHex,
            status: 'verified',
            verification_method: ['manual'],
            uploaded_by: (await supabaseClient.auth.getUser()).data.user?.id
          });

        if (certError) {
          throw new Error(`Row ${i + 1}: ${certError.message}`);
        }

        successful++;

      } catch (error) {
        failed++;
        errors.push(`Row ${i + 1}: ${error.message}`);
        console.error(`Error processing row ${i + 1}:`, error);
      }

      // Update progress periodically
      if ((i + 1) % 10 === 0 || i === rows.length - 1) {
        await supabaseClient
          .from('bulk_upload_sessions')
          .update({
            processed_records: i + 1,
            successful_records: successful,
            failed_records: failed,
            error_log: errors.length > 0 ? { errors } : null
          })
          .eq('id', session.id);
      }
    }

    // Mark session as completed
    await supabaseClient
      .from('bulk_upload_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        successful_records: successful,
        failed_records: failed,
        error_log: errors.length > 0 ? { errors } : null
      })
      .eq('id', session.id);

    // Create system alert for completion
    await supabaseClient
      .from('system_alerts')
      .insert({
        title: 'Bulk Upload Completed',
        message: `Bulk upload completed: ${successful} successful, ${failed} failed`,
        severity: failed > 0 ? 'medium' : 'low',
        entity_type: 'bulk_upload_session',
        entity_id: session.id,
        recipient_role: 'institution'
      });

    // Log audit trail
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: (await supabaseClient.auth.getUser()).data.user?.id,
        action: 'BULK_UPLOAD_COMPLETED',
        entity_type: 'bulk_upload_session',
        entity_id: session.id,
        new_values: {
          total_records: rows.length,
          successful_records: successful,
          failed_records: failed
        }
      });

    return new Response(JSON.stringify({
      success: true,
      session_id: session.id,
      total_records: rows.length,
      successful_records: successful,
      failed_records: failed,
      errors: errors.slice(0, 10) // Return first 10 errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in bulk-upload function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});