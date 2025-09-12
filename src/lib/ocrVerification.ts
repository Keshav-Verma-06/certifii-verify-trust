import Tesseract from 'tesseract.js';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { supabase } from '@/integrations/supabase/client';

export interface OCRExtractedData {
  name?: string;
  seatNumber?: string;
  sgpa?: string;
  semester?: string;
  result?: string;
  institution?: string;
  course?: string;
  certificateId?: string;
}

export interface VerificationResult {
  verification_status: 'VERIFIED' | 'REJECTED_OCR_FAILURE' | 'REJECTED_NOT_FOUND' | 'REJECTED_MISMATCH' | 'ERROR_DB_CHECK';
  ocr_extracted_data: OCRExtractedData;
  is_db_verified: boolean;
  is_tampering_suspected: boolean;
  notes: string;
  image_hash?: string;
  image_url?: string;
  qr_verification?: {
    status: string;
    valid: boolean;
  };
  mismatches?: string[];
}

// Preprocess image for better OCR results
export const preprocessImage = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert to grayscale and enhance contrast
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    
    // Enhance contrast (simple threshold)
    const enhanced = gray > 128 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);
    
    data[i] = enhanced;     // Red
    data[i + 1] = enhanced; // Green
    data[i + 2] = enhanced; // Blue
    // Alpha channel remains unchanged
  }

  context.putImageData(imageData, 0, 0);
};

// Extract text using OCR
export const extractTextWithOCR = async (file: File): Promise<string> => {
  try {
    console.log('🔍 Starting OCR text extraction...');
    console.log('📄 File details:', { name: file.name, size: file.size, type: file.type });
    
    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`📝 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    const extractedText = result.data.text;
    console.log('✅ OCR extraction completed');
    console.log('📄 Extracted text length:', extractedText.length);
    console.log('📄 First 200 characters:', extractedText.substring(0, 200));
    
    return extractedText;
  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    throw new Error('Failed to extract text from image');
  }
};

// Extract structured certificate data from OCR text
export const extractCertificateData = (text: string): OCRExtractedData => {
  console.log('🔍 Starting structured data extraction from OCR text...');
  
  // Normalize common punctuation and whitespace for better matching
  const normalizedText = text
    .replace(/[\u2010-\u2015]/g, '-') // dashes
    .replace(/[\u2018-\u2019\u02BC]/g, "'") // quotes
    .replace(/[\u201C-\u201D]/g, '"')
    .replace(/\s+/g, ' ');

  const extractedData: OCRExtractedData = {};

  // Name: prefer explicit label
  {
    console.log('🔍 Searching for name...');
    const nameLabel = normalizedText.match(/(?:^|\s)(?:Name|Student'?s Name|Candidate Name)\s*[:\-]?\s*([A-Z][A-Z\s\.\'\,]{3,})/i);
    if (nameLabel) {
      extractedData.name = nameLabel[1].trim().toUpperCase().replace(/\s+/g, ' ');
      console.log(`✅ Found name (label): "${nameLabel[1].trim()}"`);
    } else {
      // Fallback: a long uppercase line near the top (avoid headings like GRADE CARD)
      const lines = text.split(/\n|\r/).map(l => l.trim());
      const candidate = lines.find(l => /[A-Z]{3,}\s+[A-Z]{3,}/.test(l) && !/GRADE CARD|INSTITUTE|INSTITUTION|UNIVERSITY|COLLEGE/i.test(l));
      if (candidate) {
        extractedData.name = candidate.toUpperCase().replace(/\s+/g, ' ');
        console.log(`✅ Found name (fallback): "${candidate}"`);
      } else {
        console.log('❌ No match found for name');
      }
    }

    // Cleanup: remove labels, symbols, and any trailing seat/roll segment from name
    if (extractedData.name) {
      let cleaned = extractedData.name;
      cleaned = cleaned.replace(/^(?:NAME|STUDENT'?S NAME|CANDIDATE NAME)\b[:\-]*\s*/i, '');
      cleaned = cleaned.replace(/[©®™]+/g, '');
      // Remove anything starting from SEAT/ROLL/PRN labels to the end of line, with or without a number following
      cleaned = cleaned.replace(/\b(SEAT\s*NO\.?|ROLL\s*NO\.?|PRN|ENROLLMENT\s*NO\.?).*$/i, '');
      // Heuristic: insert a space before common name parts if missing (handles BAWEJA+RAUNAK etc.)
      const commonNameParts = [
        'SINGH','KAUR','KUMAR','KUMARI','RAO','RAJ','ALI','AHMED','PRASAD','PRAKASH','ANAND','DEVI','LAL',
        'RAUNAK','JASPREET','MOHAMMED','MOHAMMAD','AHMAD','AHMED'
      ];
      for (const part of commonNameParts) {
        const re = new RegExp(`([^\\s])(${part})(\\b)`, 'g');
        cleaned = cleaned.replace(re, '$1 $2$3');
      }
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      extractedData.name = cleaned;
      console.log(`🧹 Cleaned name: "${cleaned}"`);
    }
  }

  // Seat number: ONLY accept label-based patterns to avoid subject codes like OEC11
  {
    console.log('🔍 Searching for seatNumber...');
    // Prefer explicit label capture; capture the value after the label
    const seatMatch = normalizedText.match(/(?:Seat\s*No\.?|Roll\s*No\.?|Enrollment\s*No\.?|Registration\s*No\.?|PRN)\s*[:\-#]?\s*([A-Za-z0-9\/-]{3,})/i);
    if (seatMatch) {
      const value = seatMatch[1].trim();
      // Heuristic: prefer mostly digits (true seat numbers) over alpha course codes
      const digitsRatio = (value.replace(/\D/g, '').length) / value.length;
      if (digitsRatio >= 0.5 || /\d/.test(value)) {
        extractedData.seatNumber = value.toUpperCase();
        console.log(`✅ Found seatNumber: "${value}"`);
      } else {
        console.log(`⚠️ Ignoring unlikely seatNumber candidate: "${value}"`);
      }
    } else {
      console.log('❌ No match found for seatNumber');
    }
  }

  // SGPA
  {
    console.log('🔍 Searching for sgpa...');
    const sgpaMatch = normalizedText.match(/(?:SGPA|CGPA|GPA|Grade\s*Points)\s*[:\-]?\s*(\d+\.\d{1,2})/i);
    if (sgpaMatch) {
      extractedData.sgpa = sgpaMatch[1];
      console.log(`✅ Found sgpa: "${sgpaMatch[1]}"`);
    } else {
      console.log('❌ No match found for sgpa');
    }
  }

  // Semester / Division
  {
    console.log('🔍 Searching for semester...');
    const semMatch = normalizedText.match(/(?:Semester|Sem|SEM)\s*[:\-]?\s*([IVXLCDM1-8]+)/i);
    if (semMatch) {
      extractedData.semester = semMatch[1].toString();
      console.log(`✅ Found semester: "${semMatch[1]}"`);
    } else {
      console.log('❌ No match found for semester');
    }
  }

  // Result
  {
    console.log('🔍 Searching for result...');
    const resMatch = normalizedText.match(/(?:Result|RESULT)\s*[:\-]?\s*(PASS|FAIL|PASSED|FAILED|COMPLETED)/i);
    if (resMatch) {
      extractedData.result = resMatch[1].toUpperCase();
      console.log(`✅ Found result: "${resMatch[1]}"`);
    } else {
      console.log('❌ No match found for result');
    }
  }

  // Institution: look for "Institute of Technology" or upper header line
  {
    console.log('🔍 Searching for institution...');
    // First try to hard match the expected phrase to strip any leading noise
    let instMatch = text.match(/(VIDYALANKAR[ A-Z]*INSTITUTE OF TECHNOLOGY)/i);
    if (!instMatch) {
      instMatch = text.match(/([A-Z][A-Za-z\s\.,'-]*Institute of Technology)/i)
        || text.match(/([A-Z][A-Za-z\s\.,'-]*University)/i);
    }
    if (instMatch) {
      let inst = instMatch[1].trim().toUpperCase();
      // Remove leading single-letter noise like "Y Y "
      inst = inst.replace(/^(?:[A-Z]\s+){1,4}(?=[A-Z])/, '');
      inst = inst.replace(/\s+/g, ' ').trim();
      extractedData.institution = inst;
      console.log(`✅ Found institution: "${instMatch[1].trim()}"`);
    } else {
      // Fallback to prominent header lines containing INSTITUTE or COLLEGE
      const header = text.split(/\n|\r/).find(l => /(INSTITUTE|INSTITUTION|COLLEGE|UNIVERSITY)/i.test(l) && l.trim().length > 10);
      if (header) {
        let inst = header.trim().toUpperCase();
        inst = inst.replace(/^(?:[A-Z]\s+){1,4}(?=[A-Z])/, '');
        inst = inst.replace(/\s+/g, ' ').trim();
        extractedData.institution = inst;
        console.log(`✅ Found institution (fallback): "${header.trim()}"`);
      } else {
        console.log('❌ No match found for institution');
      }
    }
  }

  // Course/Branch: explicitly disable extraction as requested
  extractedData.course = undefined;

  // Certificate ID
  {
    console.log('🔍 Searching for certificateId...');
    const certMatch = normalizedText.match(/(?:Certificate\s*(?:No|ID)|Serial\s*(?:No|Number))\s*[:\-]?\s*([A-Z0-9\-]+)/i);
    if (certMatch) {
      extractedData.certificateId = certMatch[1].trim().toUpperCase();
      console.log(`✅ Found certificateId: "${certMatch[1].trim()}"`);
    } else {
      console.log('❌ No match found for certificateId');
    }
  }

  console.log('📊 Final extracted data:', extractedData);
  return extractedData;
};

// Generate QR code for certificate data
export const generateQRCode = async (data: OCRExtractedData, certificateId: string): Promise<string> => {
  const qrData = {
    certificate_id: certificateId,
    hash: await generateDataHash(data),
    timestamp: new Date().toISOString()
  };

  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
    return qrCodeDataURL;
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
};

// Generate hash for certificate data
const generateDataHash = async (data: OCRExtractedData): Promise<string> => {
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Verify QR code from image
export const verifyQRCode = async (file: File): Promise<{ status: string; valid: boolean; data?: any }> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      context?.drawImage(img, 0, 0);

      const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData) {
        resolve({ status: 'NO_IMAGE_DATA', valid: false });
        return;
      }

      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (!code) {
        resolve({ status: 'NO_QR_CODE', valid: false });
        return;
      }

      try {
        const qrData = JSON.parse(code.data);
        resolve({ status: 'VALID', valid: true, data: qrData });
      } catch (error) {
        resolve({ status: 'INVALID_QR_DATA', valid: false });
      }
    };

    img.onerror = () => resolve({ status: 'IMAGE_LOAD_ERROR', valid: false });
    img.src = URL.createObjectURL(file);
  });
};

// Generate image hash for tampering detection
export const generateImageHash = async (file: File): Promise<string> => {
  console.log('🔐 Generating image hash for tampering detection...');
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const img = new Image();

    img.onload = async () => {
      console.log(`📐 Image dimensions: ${img.width}x${img.height}`);
      canvas.width = img.width;
      canvas.height = img.height;
      context?.drawImage(img, 0, 0);

      // Create a simple perceptual hash
      const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData) {
        console.error('❌ Failed to get image data');
        reject(new Error('Failed to get image data'));
        return;
      }

      console.log(`📊 Processing ${imageData.data.length} pixels for hash generation...`);

      // Convert to grayscale and create hash
      const grayData = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = Math.round(0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2]);
        grayData.push(gray);
      }

      // Simple hash generation (in production, use a proper perceptual hash library)
      const hash = await crypto.subtle.digest('SHA-256', new Uint8Array(grayData));
      const hashArray = Array.from(new Uint8Array(hash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log(`✅ Generated image hash: ${hashHex.substring(0, 16)}...`);
      resolve(hashHex);
    };

    img.onerror = () => {
      console.error('❌ Failed to load image for hashing');
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Upload file to Supabase storage
export const uploadToStorage = async (file: File, path: string): Promise<string> => {
  console.log(`📤 Uploading file to storage: ${path}`);
  console.log(`📄 File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
  
  const { data, error } = await supabase.storage
    .from('certificates')
    .upload(path, file);

  if (error) {
    console.error('❌ Upload failed:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  console.log('✅ File uploaded successfully');

  const { data: urlData } = supabase.storage
    .from('certificates')
    .getPublicUrl(path);

  console.log(`🔗 Public URL generated: ${urlData.publicUrl}`);
  return urlData.publicUrl;
};

// Perform complete verification
export const performMultiLayerVerification = async (
  file: File,
  userInputData?: Partial<OCRExtractedData>
): Promise<VerificationResult> => {
  console.log('🚀 Starting Multi-Layer Verification...');
  
  try {
    // Layer 1: OCR Data Extraction
    console.log('[Layer 1/4] Extracting data from certificate...');
    const fullText = await extractTextWithOCR(file);
    const ocrData = extractCertificateData(fullText);
    
    if (!ocrData.seatNumber && !ocrData.certificateId) {
      return {
        verification_status: 'REJECTED_OCR_FAILURE',
        notes: 'Critical failure: Could not extract Seat Number or Certificate ID from the document.',
        ocr_extracted_data: ocrData,
        is_db_verified: false,
        is_tampering_suspected: false,
      };
    }

    // Layer 2: Image Processing
    console.log('[Layer 2/4] Processing image and generating hash...');
    const imageHash = await generateImageHash(file);
    const timestamp = Date.now();
    const identifier = ocrData.certificateId || ocrData.seatNumber || 'unknown';
    const fileName = `verified/${identifier}_${timestamp}.${file.name.split('.').pop()}`;
    
    console.log(`📁 Generated filename: ${fileName}`);
    
    let imageUrl: string | undefined;
    try {
      imageUrl = await uploadToStorage(file, fileName);
      console.log('✅ Image uploaded successfully');
    } catch (error) {
      console.warn('⚠️ Image upload failed:', error);
    }

    // Layer 3: Database Verification
    console.log('[Layer 3/4] Cross-verifying with database...');
    let dbVerificationResult: any = {
      is_db_verified: false,
      verification_status: 'REJECTED_NOT_FOUND',
      notes: 'No official record found.',
      mismatches: []
    };

    try {
      console.log('🔍 Calling advanced verification edge function...');
      console.log('📤 Sending data:', {
        ocr_data: ocrData,
        user_input_data: userInputData,
        image_hash: imageHash.substring(0, 16) + '...',
        image_url: imageUrl
      });
      
      // Call the verification edge function
      const { data: verificationData, error } = await supabase.functions.invoke('advanced-verification', {
        body: {
          ocr_data: ocrData,
          user_input_data: userInputData,
          image_hash: imageHash,
          image_url: imageUrl
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }
      
      console.log('✅ Database verification response:', verificationData);
      dbVerificationResult = verificationData;
    } catch (error) {
      console.error('❌ Database verification failed:', error);
      dbVerificationResult = {
        is_db_verified: false,
        verification_status: 'ERROR_DB_CHECK',
        notes: `Database verification error: ${error}`,
        mismatches: []
      };
    }

    // Layer 4: QR Code & Tampering Check
    console.log('[Layer 4/4] Checking QR code and tampering...');
    const qrResult = await verifyQRCode(file);
    console.log('🔍 QR Code verification result:', qrResult);
    
    const finalResult: VerificationResult = {
      verification_status: dbVerificationResult.verification_status,
      ocr_extracted_data: ocrData,
      is_db_verified: dbVerificationResult.is_db_verified,
      is_tampering_suspected: dbVerificationResult.is_tampering_suspected || false,
      notes: dbVerificationResult.notes,
      image_hash: imageHash,
      image_url: imageUrl,
      qr_verification: qrResult,
      mismatches: dbVerificationResult.mismatches
    };

    console.log('✅ Verification complete:', finalResult);
    return finalResult;

  } catch (error) {
    console.error('Verification error:', error);
    return {
      verification_status: 'ERROR_DB_CHECK',
      notes: `Verification failed: ${error}`,
      ocr_extracted_data: {},
      is_db_verified: false,
      is_tampering_suspected: false,
    };
  }
};
