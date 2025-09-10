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
    const result = await Tesseract.recognize(file, 'eng', {
      logger: m => console.log(m), // Optional: log progress
    });
    return result.data.text;
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error('Failed to extract text from image');
  }
};

// Extract structured certificate data from OCR text
export const extractCertificateData = (text: string): OCRExtractedData => {
  const patterns = {
    name: [
      /(?:Name|NAME|Student['\s]s Name|Candidate Name)[\s:\-]*([A-Z\s\.\'\,]+)/i,
      /^[\s]*([A-Z][A-Z\s\.\'\,]{5,})[\s]*$/m
    ],
    seatNumber: [
      /(?:Seat No|Seat Number|Roll No|Roll Number|Enrollment No|Registration No|PRN)[\s:\-]*([A-Z0-9\-]+)/i,
      /\b([A-Z]{2,}\d{2,}[A-Z\d]*)\b/
    ],
    sgpa: [
      /(?:SGPA|CGPA|GPA|Grade Points)[\s:\-]*(\d+\.\d{2})/i,
      /\b(\d+\.\d{2})\b/
    ],
    semester: [
      /(?:Semester|Sem|SEM)[\s:\-]*([IVXLCDM1-6]+)/i,
      /\b([IVXLCDM]+)\s+Semester\b/i
    ],
    result: [
      /(?:Result|RESULT)[\s:\-]*(PASS|FAIL|PASSED|FAILED|COMPLETED)/i,
      /\b(PASS|FAIL|PASSED|FAILED)\b/i
    ],
    institution: [
      /(?:University|College|Institute|Institution|Board)[\s:\-]*([A-Za-z\s\.\-\,]+)/i,
      /^[\s]*([A-Z][A-Za-z\s\.\-\,]{10,})[\s]*$/m
    ],
    course: [
      /(?:Course|Program|Degree|Branch)[\s:\-]*([A-Za-z\s\.\-\,]+)/i,
      /\b(B\.Tech|B\.E\.|M\.Tech|M\.B\.A|B\.C\.A|B\.Sc|M\.Sc|B\.Com|M\.Com)\b/i
    ],
    certificateId: [
      /(?:Certificate No|Certificate ID|Serial No|Serial Number)[\s:\-]*([A-Z0-9\-]+)/i,
      /\b([A-Z]{2,}\d{4,}[A-Z\d]*)\b/
    ]
  };

  const extractedData: OCRExtractedData = {};

  for (const [key, regexList] of Object.entries(patterns)) {
    for (const pattern of regexList) {
      const match = text.match(pattern);
      if (match) {
        extractedData[key as keyof OCRExtractedData] = match[1].trim().toUpperCase();
        break;
      }
    }
  }

  // Clean up name field
  if (extractedData.name) {
    extractedData.name = extractedData.name.replace(/\s+/g, ' ').trim();
  }

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
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const img = new Image();

    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;
      context?.drawImage(img, 0, 0);

      // Create a simple perceptual hash
      const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData) {
        reject(new Error('Failed to get image data'));
        return;
      }

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
      
      resolve(hashHex);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Upload file to Supabase storage
export const uploadToStorage = async (file: File, path: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('certificates')
    .upload(path, file);

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('certificates')
    .getPublicUrl(path);

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
    
    let imageUrl: string | undefined;
    try {
      imageUrl = await uploadToStorage(file, fileName);
    } catch (error) {
      console.warn('Image upload failed:', error);
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
      // Call the verification edge function
      const { data: verificationData, error } = await supabase.functions.invoke('advanced-verification', {
        body: {
          ocr_data: ocrData,
          user_input_data: userInputData,
          image_hash: imageHash,
          image_url: imageUrl
        }
      });

      if (error) throw error;
      dbVerificationResult = verificationData;
    } catch (error) {
      console.error('Database verification failed:', error);
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
