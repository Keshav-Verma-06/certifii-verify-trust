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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const adminClient = serviceKey
      ? createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          serviceKey,
          { global: { headers: {} } }
        )
      : supabaseClient;
    const authUser = (await supabaseClient.auth.getUser()).data.user;
    console.log('[bulk-upload] auth user id:', authUser?.id ?? 'null');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const institutionId = (formData.get('institution_id') as string) || null;
    const sessionIdFromClient = (formData.get('session_id') as string) || null;
    const offsetParam = Number((formData.get('offset') as string) || '0');
    const chunkSizeParam = Number((formData.get('chunk_size') as string) || '300');
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;
    const chunkSize = Number.isFinite(chunkSizeParam) && chunkSizeParam > 0 ? Math.min(chunkSizeParam, 1000) : 300;
    console.log('[bulk-upload] chunk params:', { offset, chunkSize, sessionIdFromClient });
    console.log('[bulk-upload] institutionId present:', Boolean(institutionId), 'value:', institutionId ?? 'null');

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing bulk upload:', file.name, file.type, 'size:', (file as any)?.size ?? 'unknown');

    // Upload file to storage for tracking
    const fileName = `${crypto.randomUUID()}-${file.name}`;
    // Only upload the file to storage on the first chunk (offset 0)
    if (offset === 0) {
      const storageRes = await adminClient.storage
        .from('bulk-uploads')
        .upload(fileName, file);
      if ((storageRes as any)?.error) {
        console.error('[bulk-upload] storage upload error:', (storageRes as any).error);
      } else {
        console.log('[bulk-upload] storage upload ok, path:', fileName);
      }
    } else {
      console.log('[bulk-upload] skipping storage upload for offset > 0');
    }

    // Parse CSV/Excel file
    const fileContent = await file.text();
    // Do not skip the first row; we'll detect headers dynamically so both
    // headered and headerless files are supported
    const rows = parse(fileContent, { skipFirstRow: false }) as string[][];
    console.log('[bulk-upload] parsed rows (including potential header):', rows.length);

    // Create or reuse bulk upload session
    let session = null as any;
    if (sessionIdFromClient) {
      const { data: existingSession, error: getErr } = await adminClient
        .from('bulk_upload_sessions')
        .select('*')
        .eq('id', sessionIdFromClient)
        .maybeSingle();
      if (getErr) {
        throw new Error(`Failed to fetch upload session: ${getErr.message}`);
      }
      session = existingSession;
    }
    if (!session) {
      const totalRecords = rows.length; // includes header; we'll store actual total later below
      const { data: newSession, error: sessionError } = await adminClient
        .from('bulk_upload_sessions')
        .insert({
          institution_id: institutionId,
          uploaded_by: (await supabaseClient.auth.getUser()).data.user?.id,
          file_name: file.name,
          total_records: 0, // will set after header detection
          status: 'processing'
        })
        .select()
        .single();
      if (sessionError) {
        throw new Error(`Failed to create upload session: ${sessionError.message}`);
      }
      session = newSession;
      console.log('[bulk-upload] created session id:', session.id);
    } else {
      console.log('[bulk-upload] using existing session id:', session.id);
    }

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    // Detect header style (new student academics vs legacy certificates)
    const firstRow = rows[0] || [];
    const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, '_');
    const normalizedHeaders = firstRow.map(normalize);

    const academicKeys = [
      'name','roll_number','seat_number','division','department',
      'sgpa_sem1','sgpa_sem2','sgpa_sem3','sgpa_sem4',
      'sgpa_sem5','sgpa_sem6','sgpa_sem7','sgpa_sem8'
    ];
    const isAcademicHeader = normalizedHeaders.some(h => academicKeys.includes(h));

    const certificateKeys = ['certificate_id','student_name','course','institution_name','issue_date'];
    const isCertificateHeader = normalizedHeaders.some(h => certificateKeys.includes(h));

    // If the first row looks like headers, skip it when iterating data rows
    const dataStartIndex = (isAcademicHeader || isCertificateHeader) ? 1 : 0;
    console.log('[bulk-upload] header detection:', {
      normalizedHeaders,
      isAcademicHeader,
      isCertificateHeader,
      dataStartIndex,
    });

    // Build a column index map for academics if header present
    const academicIndex: Record<string, number> = {};
    if (isAcademicHeader) {
      for (let i = 0; i < normalizedHeaders.length; i++) {
        academicIndex[normalizedHeaders[i]] = i;
      }
      console.log('[bulk-upload] academicIndex map:', academicIndex);
    }

    // Build a column index map for certificates if header present
    const certificateIndex: Record<string, number> = {};
    if (isCertificateHeader) {
      for (let i = 0; i < normalizedHeaders.length; i++) {
        certificateIndex[normalizedHeaders[i]] = i;
      }
      console.log('[bulk-upload] certificateIndex map:', certificateIndex);
    }

    // Preflight check for student_academics table availability
    if (isAcademicHeader) {
      const preflight = await supabaseClient
        .from('student_academics')
        .select('id')
        .limit(1);
      if (preflight.error) {
        console.error('[bulk-upload] preflight student_academics error:', preflight.error);
      } else {
        console.log('[bulk-upload] preflight student_academics ok');
      }
    }

    // Update total_records on first chunk once we know header offset
    if (offset === 0) {
      const totalDataRows = rows.length - dataStartIndex;
      await adminClient
        .from('bulk_upload_sessions')
        .update({ total_records: totalDataRows })
        .eq('id', session.id);
      console.log('[bulk-upload] set total_records:', totalDataRows);
    }

    // Determine chunk bounds
    const chunkStart = dataStartIndex + offset;
    const chunkEnd = Math.min(chunkStart + chunkSize, rows.length);
    const chunkCount = Math.max(0, chunkEnd - chunkStart);
    console.log('[bulk-upload] processing chunk:', { chunkStart, chunkEnd, chunkCount });

    // Process each row in the chunk
    for (let i = chunkStart; i < chunkEnd; i++) {
      try {
        const row = rows[i];

        if (isAcademicHeader) {
          // Insert into student_academics with flexible, optional columns
          const get = (key: string) => {
            const idx = academicIndex[key];
            return (idx !== undefined && row[idx] !== undefined) ? String(row[idx]).trim() : undefined;
          };

          const parseNum = (val?: string) => {
            if (!val || val === '') return null;
            const n = Number(val);
            return isNaN(n) ? null : Number(n.toFixed(2));
          };

          const name = get('name') ?? get('student_name');
          const roll = get('roll_number') ?? get('seat_number') ?? get('roll');

          if (!name || !roll) {
            throw new Error(`Row ${i + 1}: Missing Name or Roll_Number`);
          }

          const payload: Record<string, unknown> = {
            institution_id: institutionId,
            name,
            roll_number: roll,
            division: get('division') ?? null,
            department: get('department') ?? null,
            sgpa_sem1: parseNum(get('sgpa_sem1') as string | undefined),
            sgpa_sem2: parseNum(get('sgpa_sem2') as string | undefined),
            sgpa_sem3: parseNum(get('sgpa_sem3') as string | undefined),
            sgpa_sem4: parseNum(get('sgpa_sem4') as string | undefined),
            sgpa_sem5: parseNum(get('sgpa_sem5') as string | undefined),
            sgpa_sem6: parseNum(get('sgpa_sem6') as string | undefined),
            sgpa_sem7: parseNum(get('sgpa_sem7') as string | undefined),
            sgpa_sem8: parseNum(get('sgpa_sem8') as string | undefined),
            uploaded_by: (await supabaseClient.auth.getUser()).data.user?.id,
            source_file: fileName,
          };
          console.log('[bulk-upload] upserting student_academics payload keys:', Object.keys(payload));

          const { error: acadError } = await adminClient
            .from('student_academics')
            .upsert(payload, { onConflict: 'institution_id,roll_number' });

          if (acadError) {
            console.error('[bulk-upload] upsert student_academics failed at row', i + 1, 'error:', acadError);
            throw new Error(`Row ${i + 1}: ${acadError.message}`);
          }
        } else {
          // Legacy certificate format (with or without header)
          const get = (key: string, defaultIndex: number) => {
            if (isCertificateHeader && certificateIndex[key] !== undefined) {
              const idx = certificateIndex[key];
              return row[idx];
            }
            return row[defaultIndex];
          };

          const certificateData: CertificateRow = {
            certificate_id: String(get('certificate_id', 0) || '').trim(),
            student_name: String(get('student_name', 1) || '').trim(),
            course: String(get('course', 2) || '').trim(),
            institution_name: String(get('institution_name', 3) || '').trim(),
            issue_date: String(get('issue_date', 4) || '').trim(),
            graduation_date: String(get('graduation_date', 5) || '').trim() || undefined,
            grade: String(get('grade', 6) || '').trim() || undefined,
          };

          // Validate required fields for certificate flow
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
            console.error('[bulk-upload] insert certificates failed at row', i + 1, 'error:', certError);
            throw new Error(`Row ${i + 1}: ${certError.message}`);
          }
          console.log('[bulk-upload] inserted certificate for row', i + 1, 'certificate_id:', certificateData.certificate_id);
        }

        successful++;
        if (((i - dataStartIndex + 1) % 100) === 0) {
          console.log('[bulk-upload] processed rows:', (i - dataStartIndex + 1), 'success:', successful, 'failed:', failed);
        }

      } catch (error) {
        failed++;
        const message = (error as any)?.message || String(error);
        errors.push(`Row ${i + 1}: ${message}`);
        console.error(`[bulk-upload] Error processing row ${i + 1}:`, error);
      }

      // Update progress periodically
      if ((i + 1) % 50 === 0 || i === chunkEnd - 1) {
        // incrementally update progress, adding to any existing counts
        const { data: current, error: curErr } = await adminClient
          .from('bulk_upload_sessions')
          .select('processed_records, successful_records, failed_records')
          .eq('id', session.id)
          .single();
        if (!curErr && current) {
          await adminClient
            .from('bulk_upload_sessions')
            .update({
              processed_records: Math.min((current.processed_records || 0) + 1, (rows.length - dataStartIndex)),
              successful_records: (current.successful_records || 0) + (errors.length > 0 ? 0 : 1),
              failed_records: (current.failed_records || 0) + (errors.length > 0 ? 1 : 0),
              error_log: errors.length > 0 ? { errors } : current.error_log || null
            })
            .eq('id', session.id);
        }
      }
    }

    const moreRemaining = chunkEnd < rows.length;
    if (moreRemaining) {
      // Update session progress cumulatively for this chunk
      const { data: current, error: curErr } = await adminClient
        .from('bulk_upload_sessions')
        .select('processed_records, successful_records, failed_records')
        .eq('id', session.id)
        .single();
      if (!curErr && current) {
        await adminClient
          .from('bulk_upload_sessions')
          .update({
            processed_records: Math.min((current.processed_records || 0) + chunkCount, (rows.length - dataStartIndex)),
            successful_records: (current.successful_records || 0) + successful,
            failed_records: (current.failed_records || 0) + failed,
            error_log: errors.length > 0 ? { errors } : current.error_log || null
          })
          .eq('id', session.id);
      }
      console.log('[bulk-upload] chunk completed; more remaining. Next offset:', offset + chunkCount);
    } else {
      // Finalize session
      const { data: current, error: curErr } = await adminClient
        .from('bulk_upload_sessions')
        .select('processed_records, successful_records, failed_records')
        .eq('id', session.id)
        .single();
      const finalProcessed = (current?.processed_records || 0) + chunkCount;
      const finalSuccess = (current?.successful_records || 0) + successful;
      const finalFailed = (current?.failed_records || 0) + failed;
      await adminClient
        .from('bulk_upload_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          processed_records: Math.min(finalProcessed, (rows.length - dataStartIndex)),
          successful_records: finalSuccess,
          failed_records: finalFailed,
          error_log: errors.length > 0 ? { errors } : null
        })
        .eq('id', session.id);
      console.log('[bulk-upload] completed session', session.id, 'total:', rows.length - dataStartIndex, 'success:', finalSuccess, 'failed:', finalFailed);
    }

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

    const responseBody: any = {
      success: true,
      session_id: session.id,
      total_records: rows.length - dataStartIndex,
      successful_records: successful,
      failed_records: failed,
      errors: errors.slice(0, 10) // Return first 10 errors
    };
    if (moreRemaining) {
      responseBody.next_offset = offset + chunkCount;
      responseBody.more = true;
    } else {
      responseBody.more = false;
    }
    console.log('[bulk-upload] returning 200 OK with summary:', responseBody);
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in bulk-upload function:', error, (error as any)?.stack);
    const errorMessage = (error as any)?.message || 'Unknown error';
    const errBody = { error: errorMessage, success: false };
    return new Response(JSON.stringify(errBody), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});