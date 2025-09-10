import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRData {
  name?: string;
  seatNumber?: string;
  sgpa?: string;
  semester?: string;
  result?: string;
  institution?: string;
  course?: string;
  certificateId?: string;
}

interface VerificationRequest {
  ocr_data: OCRData;
  user_input_data?: Partial<OCRData>;
  image_hash: string;
  image_url?: string;
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

    const { ocr_data, user_input_data, image_hash, image_url }: VerificationRequest = await req.json();

    console.log('Advanced verification request:', { ocr_data, user_input_data, image_hash });

    // Combine OCR data with user input data (user input takes precedence)
    const combinedData = { ...ocr_data, ...user_input_data };
    
    const seatNumber = combinedData.seatNumber;
    const certificateId = combinedData.certificateId;

    if (!seatNumber && !certificateId) {
      return new Response(JSON.stringify({
        is_db_verified: false,
        verification_status: 'REJECTED_OCR_FAILURE',
        notes: 'No seat number or certificate ID provided for verification.',
        mismatches: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search in student_academics table
    let query = supabaseClient
      .from('student_academics')
      .select('*');

    if (certificateId) {
      // First try to find by certificate ID in the certificates table
      const { data: certData } = await supabaseClient
        .from('certificates')
        .select('*')
        .eq('certificate_id', certificateId)
        .single();
      
      if (certData) {
        // Found in certificates table, now get student data
        query = query.eq('certificate_id', certData.id);
      } else if (seatNumber) {
        // Fallback to seat number search
        query = query.eq('roll_number', seatNumber);
      }
    } else if (seatNumber) {
      query = query.eq('roll_number', seatNumber);
    }

    const { data: studentRecords, error: dbError } = await query;

    if (dbError) {
      console.error('Database query error:', dbError);
      return new Response(JSON.stringify({
        is_db_verified: false,
        verification_status: 'ERROR_DB_CHECK',
        notes: `Database error: ${dbError.message}`,
        mismatches: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!studentRecords || studentRecords.length === 0) {
      // Check tampering by looking for same image hash
      await checkTamperingAttempts(supabaseClient, image_hash, seatNumber || certificateId);
      
      return new Response(JSON.stringify({
        is_db_verified: false,
        verification_status: 'REJECTED_NOT_FOUND',
        notes: `No official record found for ${certificateId ? 'Certificate ID: ' + certificateId : 'Seat No: ' + seatNumber}.`,
        mismatches: [],
        is_tampering_suspected: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const officialRecord = studentRecords[0];
    console.log('Found official record:', officialRecord);

    // Compare extracted data with database record
    const mismatches: string[] = [];

    // Compare Name
    if (combinedData.name && officialRecord.name) {
      const ocrName = normalizeText(combinedData.name);
      const dbName = normalizeText(officialRecord.name);
      if (ocrName !== dbName) {
        mismatches.push(`Name (OCR: '${combinedData.name}', DB: '${officialRecord.name}')`);
      }
    }

    // Compare SGPA (check multiple semester SGPAs)
    if (combinedData.sgpa) {
      const ocrSgpa = parseFloat(combinedData.sgpa);
      let sgpaMatched = false;
      
      // Check against all semester SGPAs
      for (let i = 1; i <= 8; i++) {
        const dbSgpa = officialRecord[`sgpa_sem${i}`];
        if (dbSgpa && Math.abs(ocrSgpa - parseFloat(dbSgpa)) <= 0.01) {
          sgpaMatched = true;
          break;
        }
      }
      
      if (!sgpaMatched) {
        mismatches.push(`SGPA (OCR: ${combinedData.sgpa}, not found in any semester records)`);
      }
    }

    // Compare Department/Course
    if (combinedData.course && officialRecord.department) {
      const ocrCourse = normalizeText(combinedData.course);
      const dbDepartment = normalizeText(officialRecord.department);
      if (!ocrCourse.includes(dbDepartment) && !dbDepartment.includes(ocrCourse)) {
        mismatches.push(`Course/Department (OCR: '${combinedData.course}', DB: '${officialRecord.department}')`);
      }
    }

    // Compare Division
    if (combinedData.semester && officialRecord.division) {
      const ocrSem = normalizeText(combinedData.semester);
      const dbDiv = normalizeText(officialRecord.division);
      if (ocrSem !== dbDiv) {
        mismatches.push(`Division/Semester (OCR: '${combinedData.semester}', DB: '${officialRecord.division}')`);
      }
    }

    // Check for tampering attempts
    const isTamperingAttempt = await checkTamperingAttempts(supabaseClient, image_hash, seatNumber || certificateId);

    // Determine final verification status
    let verificationStatus: string;
    let notes: string;
    let isDbVerified: boolean;

    if (mismatches.length === 0) {
      verificationStatus = 'VERIFIED';
      notes = 'All extracted details perfectly match the official database record.';
      isDbVerified = true;
    } else {
      verificationStatus = 'REJECTED_MISMATCH';
      notes = `Mismatch found in fields: ${mismatches.join(', ')}`;
      isDbVerified = false;
    }

    // Log the verification attempt
    const verificationLog = {
      verification_status: verificationStatus,
      ocr_extracted_data: combinedData,
      user_input_data: user_input_data,
      is_db_verified: isDbVerified,
      is_tampering_suspected: isTamperingAttempt,
      notes: notes,
      image_hash: image_hash,
      image_url: image_url,
      student_record_id: officialRecord.id,
      created_at: new Date().toISOString()
    };

    // Save verification log
    const { error: logError } = await supabaseClient
      .from('verification_logs')
      .insert(verificationLog);

    if (logError) {
      console.error('Failed to save verification log:', logError);
    }

    return new Response(JSON.stringify({
      is_db_verified: isDbVerified,
      verification_status: verificationStatus,
      notes: notes,
      mismatches: mismatches,
      is_tampering_suspected: isTamperingAttempt,
      official_record: officialRecord
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in advanced-verification function:', error);
    return new Response(JSON.stringify({
      is_db_verified: false,
      verification_status: 'ERROR_DB_CHECK',
      notes: `Verification failed: ${error.message}`,
      mismatches: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to normalize text for comparison
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Helper function to check for tampering attempts
async function checkTamperingAttempts(
  supabaseClient: any, 
  imageHash: string, 
  identifier: string
): Promise<boolean> {
  try {
    // Check if there are previous logs with same identifier but different image hash
    const { data: previousLogs } = await supabaseClient
      .from('verification_logs')
      .select('image_hash')
      .or(`ocr_extracted_data->>seatNumber.eq.${identifier},ocr_extracted_data->>certificateId.eq.${identifier}`)
      .neq('image_hash', imageHash);

    return previousLogs && previousLogs.length > 0;
  } catch (error) {
    console.error('Error checking tampering attempts:', error);
    return false;
  }
}