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
      // Use env names that are allowed for functions (cannot start with SUPABASE_)
      Deno.env.get('PROJECT_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    const { ocr_data, user_input_data, image_hash, image_url }: VerificationRequest = await req.json();

    console.log('🚀 Advanced verification request received');
    console.log('📊 OCR Data:', ocr_data);
    console.log('👤 User Input Data:', user_input_data);
    console.log('🔐 Image Hash:', image_hash?.substring(0, 16) + '...');

    // Combine OCR data with user input data (user input takes precedence)
    const combinedData = { ...ocr_data, ...user_input_data };
    console.log('🔗 Combined data for verification:', combinedData);
    
    const seatNumber = combinedData.seatNumber;
    const certificateId = combinedData.certificateId;

    if (!seatNumber && !certificateId) {
      console.log('❌ No seat number or certificate ID provided');
      return new Response(JSON.stringify({
        is_db_verified: false,
        verification_status: 'REJECTED_OCR_FAILURE',
        notes: 'No seat number or certificate ID provided for verification.',
        mismatches: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Searching with: Certificate ID: ${certificateId}, Seat Number: ${seatNumber}`);

    // Search in student_academics table
    let query = supabaseClient
      .from('student_academics')
      .select('*');

    if (certificateId) {
      console.log(`🔍 Searching by certificate ID: ${certificateId}`);
      // First try to find by certificate ID in the certificates table
      const { data: certData } = await supabaseClient
        .from('certificates')
        .select('*')
        .eq('certificate_id', certificateId)
        .single();
      
      if (certData) {
        console.log('✅ Found certificate in certificates table:', certData.id);
        // Found in certificates table, now get student data
        query = query.eq('certificate_id', certData.id);
      } else if (seatNumber) {
        console.log('❌ Certificate ID not found, falling back to seat number search');
        // Fallback to seat number search
        query = query.eq('roll_number', seatNumber);
      } else {
        console.log('❌ Certificate ID not found and no seat number available');
      }
    } else if (seatNumber) {
      console.log(`🔍 Searching by seat number: ${seatNumber}`);
      query = query.eq('roll_number', seatNumber);
    }

    const { data: studentRecords, error: dbError } = await query;

    if (dbError) {
      console.error('❌ Database query error:', dbError);
      return new Response(JSON.stringify({
        is_db_verified: false,
        verification_status: 'ERROR_DB_CHECK',
        notes: `Database error: ${dbError.message}`,
        mismatches: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📊 Database query returned ${studentRecords?.length || 0} records`);

    if (!studentRecords || studentRecords.length === 0) {
      console.log('❌ No student records found in database');
      // Check tampering by looking for same image hash
      const isTampering = await checkTamperingAttempts(supabaseClient, image_hash, (seatNumber || certificateId) as string);
      console.log(`🔐 Tampering check result: ${isTampering}`);

      // Persist verification outcome for not-found case
      const nfStatusText = 'REJECTED_NOT_FOUND';
      const nfNotes = `No official record found for ${certificateId ? 'Certificate ID: ' + certificateId : 'Roll No: ' + seatNumber}.`;

      // Save verification log (no student_record_id available)
      try {
        await supabaseClient
          .from('verification_logs')
          .insert({
            verification_status: nfStatusText,
            ocr_extracted_data: { ...ocr_data, ...user_input_data },
            user_input_data,
            is_db_verified: false,
            is_tampering_suspected: isTampering,
            notes: nfNotes,
            image_hash: image_hash,
            image_url: image_url,
            mismatches: [],
            created_at: new Date().toISOString()
          });
        console.log('✅ Not-found verification_log saved');
      } catch (e) {
        console.error('❌ Failed to save not-found verification_log:', e);
      }

      // Save verification record with forged status (enum)
      try {
        await supabaseClient
          .from('verification_records')
          .insert({
            certificate_id: null,
            verification_method: 'ocr',
            status: 'forged',
            confidence_score: null,
            verification_data: {
              ocr_extracted_data: { ...ocr_data, ...user_input_data },
              mismatches: [],
              image_hash,
              image_url
            },
            notes: nfNotes
          });
        console.log('✅ Not-found verification_record saved');
      } catch (e) {
        console.error('❌ Failed to save not-found verification_record:', e);
      }

      return new Response(JSON.stringify({
        is_db_verified: false,
        verification_status: nfStatusText,
        notes: nfNotes,
        mismatches: [],
        is_tampering_suspected: isTampering
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const officialRecord = studentRecords[0];
    console.log('✅ Found official record:', {
      id: officialRecord.id,
      name: officialRecord.name,
      department: officialRecord.department,
      roll_number: officialRecord.roll_number
    });

    // Compare extracted data with database record
    const mismatches: string[] = [];
    console.log('🔍 Starting field comparison...');

    // Compare Name with tolerance for minor OCR errors
    if (combinedData.name && officialRecord.name) {
      const ocrName = normalizeText(combinedData.name);
      const dbName = normalizeText(officialRecord.name);
      console.log(`👤 Name comparison - OCR: "${ocrName}" vs DB: "${dbName}"`);
      if (ocrName !== dbName) {
        const distance = levenshteinDistance(ocrName, dbName);
        const maxLen = Math.max(ocrName.length, dbName.length) || 1;
        const similarity = 1 - distance / maxLen;
        console.log(`📐 Name similarity: ${Math.round(similarity * 100)}% (distance=${distance})`);
        // Accept if highly similar (>= 90%) to account for single-character OCR glitches
        if (similarity < 0.9) {
          const mismatch = `Name (OCR: '${combinedData.name}', DB: '${officialRecord.name}')`;
          mismatches.push(mismatch);
          console.log(`❌ Name mismatch: ${mismatch}`);
        } else {
          console.log('✅ Name considered match (tolerated minor OCR error)');
        }
      } else {
        console.log('✅ Name matches');
      }
    }

    // Compare SGPA (check multiple semester SGPAs)
    if (combinedData.sgpa) {
      const ocrSgpa = parseFloat(combinedData.sgpa);
      let sgpaMatched = false;
      console.log(`📊 SGPA comparison - OCR: ${ocrSgpa}`);
      
      // Check against all semester SGPAs
      for (let i = 1; i <= 8; i++) {
        const dbSgpa = officialRecord[`sgpa_sem${i}`];
        if (dbSgpa) {
          const dbSgpaFloat = parseFloat(dbSgpa);
          console.log(`📊 Checking semester ${i} SGPA: ${dbSgpaFloat}`);
          if (Math.abs(ocrSgpa - dbSgpaFloat) <= 0.01) {
            sgpaMatched = true;
            console.log(`✅ SGPA match found in semester ${i}`);
            break;
          }
        }
      }
      
      if (!sgpaMatched) {
        const mismatch = `SGPA (OCR: ${combinedData.sgpa}, not found in any semester records)`;
        mismatches.push(mismatch);
        console.log(`❌ SGPA mismatch: ${mismatch}`);
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

    // Division vs Semester: avoid comparing numeric/roman semester with letter division (skip to prevent false mismatches)
    if (combinedData.semester && officialRecord.division) {
      const ocrSem = normalizeText(combinedData.semester);
      const dbDiv = normalizeText(officialRecord.division);
      const ocrLooksNumericOrRoman = /^(?:[ivxlcdm]+|\d+)$/i.test(ocrSem);
      const dbLooksLetterDivision = /^[a-z]$/i.test(dbDiv);
      if (!(ocrLooksNumericOrRoman && dbLooksLetterDivision)) {
        if (ocrSem !== dbDiv) {
          mismatches.push(`Division/Semester (OCR: '${combinedData.semester}', DB: '${officialRecord.division}')`);
        }
      } else {
        console.log('ℹ️ Skipping semester vs division comparison (different field types)');
      }
    }

    // Check for tampering attempts
    console.log('🔐 Checking for tampering attempts...');
    const isTamperingAttempt = await checkTamperingAttempts(supabaseClient, image_hash, (seatNumber || certificateId) as string);
    console.log(`🔐 Tampering check result: ${isTamperingAttempt}`);

    // Determine final verification status
    let verificationStatus: string;
    let notes: string;
    let isDbVerified: boolean;

    console.log(`📊 Total mismatches found: ${mismatches.length}`);
    if (mismatches.length === 0) {
      verificationStatus = 'VERIFIED';
      notes = 'All extracted details perfectly match the official database record.';
      isDbVerified = true;
      console.log('✅ Verification PASSED - all fields match');
    } else {
      verificationStatus = 'REJECTED_MISMATCH';
      notes = `Mismatch found in fields: ${mismatches.join(', ')}`;
      isDbVerified = false;
      console.log(`❌ Verification FAILED - mismatches: ${mismatches.join(', ')}`);
    }

    // Determine enum-compatible status for verification_records
    const enumStatus = verificationStatus === 'VERIFIED'
      ? 'verified'
      : (verificationStatus === 'REJECTED_MISMATCH' || verificationStatus === 'REJECTED_NOT_FOUND')
        ? 'forged'
        : 'pending';

    // Attempt to resolve certificate UUID for linkage
    let linkedCertificateId: string | null = null;
    try {
      const candidate = await supabaseClient
        .from('certificates')
        .select('id')
        .eq('certificate_id', certificateId as string)
        .maybeSingle();
      linkedCertificateId = candidate.data?.id || officialRecord?.certificate_id || null;
    } catch (_) {
      linkedCertificateId = officialRecord?.certificate_id || null;
    }

    // Insert a verification record (ocr method)
    try {
      await supabaseClient
        .from('verification_records')
        .insert({
          certificate_id: linkedCertificateId,
          verification_method: 'ocr',
          status: enumStatus as any,
          confidence_score: null,
          verification_data: {
            ocr_extracted_data: combinedData,
            mismatches,
            image_hash,
            image_url
          },
          notes
        });
    } catch (e) {
      console.error('❌ Failed to insert verification_records:', e);
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
    console.log('💾 Saving verification log to database...');
    const { error: logError } = await supabaseClient
      .from('verification_logs')
      .insert(verificationLog);

    if (logError) {
      console.error('❌ Failed to save verification log:', logError);
    } else {
      console.log('✅ Verification log saved successfully');
    }

    const finalResponse = {
      is_db_verified: isDbVerified,
      verification_status: verificationStatus,
      notes: notes,
      mismatches: mismatches,
      is_tampering_suspected: isTamperingAttempt,
      official_record: officialRecord
    };

    console.log('📤 Sending final response:', finalResponse);
    
    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Critical error in advanced-verification function:', error);
    console.error('Stack trace:', error.stack);
    
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

// Simple Levenshtein distance for fuzzy matching of names
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

// Helper function to check for tampering attempts
async function checkTamperingAttempts(
  supabaseClient: any, 
  imageHash: string, 
  identifier: string
): Promise<boolean> {
  try {
    console.log(`🕵️ Checking tampering attempts for identifier: ${identifier}`);
    console.log(`🔐 Current image hash: ${imageHash.substring(0, 16)}...`);
    
    // Check if there are previous logs with same identifier but different image hash
    const { data: previousLogs, error } = await supabaseClient
      .from('verification_logs')
      .select('image_hash, created_at')
      .or(`ocr_extracted_data->>seatNumber.eq.${identifier},ocr_extracted_data->>certificateId.eq.${identifier}`)
      .neq('image_hash', imageHash);

    if (error) {
      console.error('❌ Error querying verification logs:', error);
      return false;
    }

    console.log(`📊 Found ${previousLogs?.length || 0} previous logs with different hashes`);
    
    if (previousLogs && previousLogs.length > 0) {
      console.log('🚨 TAMPERING DETECTED: Same identifier with different image hashes found');
      previousLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. Hash: ${log.image_hash.substring(0, 16)}... at ${log.created_at}`);
      });
      return true;
    } else {
      console.log('✅ No tampering detected');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking tampering attempts:', error);
    return false;
  }
}