import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, CheckCircle, Clock, Eye, Database, Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { performMultiLayerVerification, type VerificationResult, type OCRExtractedData } from "@/lib/ocrVerification";

interface FormData {
  name: string;
  rollNumber: string;
  certificateId: string;
  institution: string;
}

interface VerificationProgress {
  step: number;
  total: number;
  message: string;
}

export const VerifyCertificate = () => {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    rollNumber: "",
    certificateId: "",
    institution: "",
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState<VerificationProgress>({ step: 0, total: 4, message: "" });
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [extractedData, setExtractedData] = useState<OCRExtractedData>({});
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      // Only allow image files for OCR processing
      if (uploadedFile.type.startsWith('image/')) {
        setFile(uploadedFile);
        toast({
          title: "File uploaded successfully",
          description: `${uploadedFile.name} is ready for verification.`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, GIF, BMP, WEBP). PDF files are not supported for OCR.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      // Only allow image files for OCR processing
      if (droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        toast({
          title: "File uploaded successfully", 
          description: `${droppedFile.name} is ready for verification.`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, GIF, BMP, WEBP). PDF files are not supported for OCR.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a certificate file first.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setResult(null);
    
    try {
      // Progress tracking
      setProgress({ step: 1, total: 4, message: "Extracting text from certificate..." });
      
      // Convert form data to OCR format
      const userInputData: Partial<OCRExtractedData> = {
        name: formData.name || undefined,
        seatNumber: formData.rollNumber || undefined,
        certificateId: formData.certificateId || undefined,
        institution: formData.institution || undefined,
      };

      setProgress({ step: 2, total: 4, message: "Processing image and generating fingerprint..." });
      
      // Perform the advanced verification
      const verificationResult = await performMultiLayerVerification(file, userInputData);
      
      setProgress({ step: 3, total: 4, message: "Cross-checking with database..." });
      
      // Update extracted data for display
      setExtractedData(verificationResult.ocr_extracted_data);
      
      setProgress({ step: 4, total: 4, message: "Finalizing verification..." });
      
      // Set final result
      setResult(verificationResult);
      
      // Show appropriate toast
      const isVerified = verificationResult.verification_status === 'VERIFIED';
      toast({
        title: "Verification Complete",
        description: isVerified 
          ? "Certificate has been successfully verified and matches official records." 
          : verificationResult.notes,
        variant: isVerified ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification Failed", 
        description: `An error occurred during verification: ${error}`,
        variant: "destructive",
      });
      setResult({
        verification_status: 'ERROR_DB_CHECK',
        notes: `Verification failed: ${error}`,
        ocr_extracted_data: {},
        is_db_verified: false,
        is_tampering_suspected: false,
      });
    } finally {
      setIsVerifying(false);
      setProgress({ step: 0, total: 4, message: "" });
    }
  };

  const getStatusBadge = () => {
    if (!result) return null;
    
    switch (result.verification_status) {
      case "VERIFIED":
        return (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">VERIFIED</span>
          </div>
        );
      case "REJECTED_MISMATCH":
      case "REJECTED_NOT_FOUND":
      case "REJECTED_OCR_FAILURE":
        return (
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">REJECTED</span>
          </div>
        );
      case "ERROR_DB_CHECK":
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span className="font-semibold">ERROR</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="heading-lg text-foreground mb-4">
            Certificate Verification
          </h1>
          <p className="body-lg text-muted-foreground">
            Upload your academic certificate and enter details for instant verification
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload and Form Section */}
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div>
                <Label htmlFor="file-upload" className="text-sm font-medium mb-3 block">
                  Upload Certificate
                </Label>
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">Drop certificate here</p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse (JPG, PNG, GIF, BMP, WEBP)
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Certificate Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Certificate Details</h3>
                
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter full name as on certificate"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="rollNumber">Roll Number</Label>
                  <Input
                    id="rollNumber"
                    type="text"
                    placeholder="Enter roll number"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="certificateId">Certificate ID</Label>
                  <Input
                    id="certificateId"
                    type="text"
                    placeholder="Enter certificate ID"
                    value={formData.certificateId}
                    onChange={(e) => setFormData({...formData, certificateId: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="institution">Issuing Institution</Label>
                  <Input
                    id="institution"
                    type="text"
                    placeholder="Enter institution name"
                    value={formData.institution}
                    onChange={(e) => setFormData({...formData, institution: e.target.value})}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isVerifying} 
                className="w-full"
              >
                {isVerifying ? "Verifying..." : "Verify Certificate"}
              </Button>
            </form>
          </Card>

          {/* Results Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Verification Results</h3>
            
            {isVerifying && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{progress.message}</p>
                <div className="mt-4 bg-muted rounded-full h-2 w-full max-w-xs mx-auto">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.step / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Step {progress.step} of {progress.total}
                </p>
                <div className="mt-4 grid grid-cols-4 gap-2 max-w-xs mx-auto">
                  <div className={`flex items-center gap-1 text-xs ${progress.step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Scan className="h-3 w-3" />
                    <span>OCR</span>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${progress.step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Eye className="h-3 w-3" />
                    <span>Hash</span>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${progress.step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Database className="h-3 w-3" />
                    <span>DB</span>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${progress.step >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
                    <CheckCircle className="h-3 w-3" />
                    <span>Final</span>
                  </div>
                </div>
              </div>
            )}

            {result && !isVerifying && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  {getStatusBadge()}
                </div>

                {/* Verification Notes */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Verification Notes:</h4>
                  <p className="text-sm text-muted-foreground">{result.notes}</p>
                </div>

                {/* OCR Extracted Data */}
                {Object.keys(extractedData).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">OCR Extracted Details:</h4>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      {extractedData.name && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Name:</span>
                          <span className="text-sm font-medium">{extractedData.name}</span>
                        </div>
                      )}
                      {extractedData.seatNumber && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Seat Number:</span>
                          <span className="text-sm font-medium">{extractedData.seatNumber}</span>
                        </div>
                      )}
                      {extractedData.certificateId && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Certificate ID:</span>
                          <span className="text-sm font-medium">{extractedData.certificateId}</span>
                        </div>
                      )}
                      {extractedData.institution && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Institution:</span>
                          <span className="text-sm font-medium">{extractedData.institution}</span>
                        </div>
                      )}
                      {extractedData.course && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Course:</span>
                          <span className="text-sm font-medium">{extractedData.course}</span>
                        </div>
                      )}
                      {extractedData.sgpa && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">SGPA:</span>
                          <span className="text-sm font-medium">{extractedData.sgpa}</span>
                        </div>
                      )}
                      {extractedData.semester && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Semester:</span>
                          <span className="text-sm font-medium">{extractedData.semester}</span>
                        </div>
                      )}
                      {extractedData.result && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Result:</span>
                          <span className="text-sm font-medium">{extractedData.result}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Database Verification Status */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                  <Database className={`h-5 w-5 ${result.is_db_verified ? 'text-success' : 'text-warning'}`} />
                  <span className="text-sm font-medium">
                    Database Verification: {result.is_db_verified ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                {/* Tampering Check */}
                {result.is_tampering_suspected && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    <span className="text-sm font-medium text-warning">
                      Potential tampering detected - duplicate submission with different image
                    </span>
                  </div>
                )}

                {/* QR Code Verification */}
                {result.qr_verification && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                    <CheckCircle className={`h-5 w-5 ${result.qr_verification.valid ? 'text-success' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-medium">
                      QR Code: {result.qr_verification.status}
                    </span>
                  </div>
                )}

                {/* Mismatches */}
                {result.mismatches && result.mismatches.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-warning">Data Mismatches Found:</h4>
                    <div className="bg-warning/10 p-4 rounded-lg border border-warning">
                      <ul className="space-y-1">
                        {result.mismatches.map((mismatch, index) => (
                          <li key={index} className="text-sm text-warning flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {mismatch}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!result && !isVerifying && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload a certificate to begin verification</p>
                <p className="text-sm mt-2">
                  Our advanced OCR system will extract data and cross-verify with official records
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};