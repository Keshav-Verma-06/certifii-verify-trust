import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VerificationResult {
  status: "verified" | "forged" | "pending" | null;
  details?: {
    name?: string;
    rollNumber?: string;
    certificateId?: string;
    institution?: string;
    course?: string;
    year?: string;
  };
  mismatches?: string[];
}

export const VerifyCertificate = () => {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    rollNumber: "",
    certificateId: "",
    institution: "",
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult>({ status: null });
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      if (uploadedFile.type.includes('pdf') || uploadedFile.type.includes('image')) {
        setFile(uploadedFile);
        toast({
          title: "File uploaded successfully",
          description: `${uploadedFile.name} is ready for verification.`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file.",
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
      if (droppedFile.type.includes('pdf') || droppedFile.type.includes('image')) {
        setFile(droppedFile);
        toast({
          title: "File uploaded successfully", 
          description: `${droppedFile.name} is ready for verification.`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file.",
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
    
    // Simulate verification process
    setTimeout(() => {
      // Simulate different verification results
      const outcomes = [
        {
          status: "verified" as const,
          details: {
            name: formData.name || "John Doe",
            rollNumber: formData.rollNumber || "2020001",
            certificateId: formData.certificateId || "CERT123456",
            institution: formData.institution || "Sample University",
            course: "Bachelor of Computer Science",
            year: "2024"
          }
        },
        {
          status: "forged" as const,
          details: {
            name: formData.name || "John Doe",
            rollNumber: formData.rollNumber || "2020001",
            certificateId: formData.certificateId || "CERT123456",
            institution: formData.institution || "Sample University",
          },
          mismatches: [
            "Certificate ID not found in institutional database",
            "Digital signature mismatch",
            "Invalid seal pattern detected"
          ]
        }
      ];

      const randomResult = outcomes[Math.floor(Math.random() * outcomes.length)];
      setResult(randomResult);
      setIsVerifying(false);

      toast({
        title: randomResult.status === "verified" ? "Verification Complete" : "Verification Complete",
        description: randomResult.status === "verified" 
          ? "Certificate has been successfully verified." 
          : "Certificate verification failed.",
        variant: randomResult.status === "verified" ? "default" : "destructive",
      });
    }, 3000);
  };

  const getStatusBadge = () => {
    switch (result.status) {
      case "verified":
        return (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">VERIFIED</span>
          </div>
        );
      case "forged":
        return (
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">FORGED</span>
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span className="font-semibold">PENDING</span>
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
                        or click to browse (PDF, JPG, PNG)
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
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
                <p className="text-muted-foreground">Verifying certificate...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Please wait while we validate your document
                </p>
              </div>
            )}

            {result.status && !isVerifying && (
              <div className="space-y-6">
                <div className="flex justify-center">
                  {getStatusBadge()}
                </div>

                {result.details && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Extracted Details:</h4>
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Name:</span>
                        <span className="text-sm font-medium">{result.details.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Roll Number:</span>
                        <span className="text-sm font-medium">{result.details.rollNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Certificate ID:</span>
                        <span className="text-sm font-medium">{result.details.certificateId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Institution:</span>
                        <span className="text-sm font-medium">{result.details.institution}</span>
                      </div>
                      {result.details.course && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Course:</span>
                          <span className="text-sm font-medium">{result.details.course}</span>
                        </div>
                      )}
                      {result.details.year && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Year:</span>
                          <span className="text-sm font-medium">{result.details.year}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {result.mismatches && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-warning">Issues Found:</h4>
                    <div className="bg-warning-light p-4 rounded-lg">
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

            {!result.status && !isVerifying && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload a certificate to begin verification</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};