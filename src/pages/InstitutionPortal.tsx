import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InstitutionAuth } from "@/components/auth/InstitutionAuth";
import { supabase } from "@/integrations/supabase/client";

export const InstitutionPortal = () => {
  const [institutionUser, setInstitutionUser] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSessions, setUploadSessions] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState<string>("");
  const [generatingKey, setGeneratingKey] = useState(false);
  const { toast } = useToast();

  const handleAuthSuccess = (user: any) => {
    setInstitutionUser(user);
    loadUploadSessions();
    loadApiKey();
  };

  const loadUploadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('bulk_upload_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUploadSessions(data || []);
    } catch (error) {
      console.error('Error loading upload sessions:', error);
    }
  };

  const loadApiKey = async () => {
    // In a real implementation, you'd generate and store API keys per institution
    // For now, we'll use a placeholder
    setApiKey(`cv_live_sk_${Math.random().toString(36).substring(2, 15)}`);
  };

  const generateNewApiKey = async () => {
    setGeneratingKey(true);
    try {
      // Simulate API key generation
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newKey = `cv_live_sk_${Math.random().toString(36).substring(2, 15)}`;
      setApiKey(newKey);
      toast({
        title: "API Key Generated",
        description: "Your new API key has been generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate new API key",
        variant: "destructive",
      });
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        setUploadFile(file);
        toast({
          title: "File selected",
          description: `${file.name} is ready for upload`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV or Excel file",
          variant: "destructive",
        });
      }
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile || !institutionUser) return;
    
    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      // Try to resolve institution id; if not found, continue without blocking
      let resolvedInstitutionId: string | undefined;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('institution_name')
          .eq('user_id', institutionUser.id)
          .maybeSingle();

        if (profile?.institution_name) {
          const { data: institution } = await supabase
            .from('institutions')
            .select('id')
            .eq('name', profile.institution_name)
            .maybeSingle();
          if (institution?.id) {
            resolvedInstitutionId = institution.id as string;
          }
        }
      } catch (_) {
        // Non-fatal; we'll proceed without institution_id
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      if (resolvedInstitutionId) {
        formData.append('institution_id', resolvedInstitutionId);
      }

      // Progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.functions.invoke('bulk-upload', {
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) throw error;

      setUploadStatus("success");
      loadUploadSessions(); // Refresh the sessions list
      
      toast({
        title: "Upload successful",
        description: `Processed ${data.total_records} records: ${data.successful_records} successful, ${data.failed_records} failed`,
      });

      // Reset file after successful upload
      setUploadFile(null);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus("error");
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process the upload",
        variant: "destructive",
      });
    }
  };

  if (!institutionUser) {
    return <InstitutionAuth onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Institution Portal</h1>
            <p className="text-muted-foreground">
              Welcome, {institutionUser.institution_name} - Manage your certificate records
            </p>
          </div>
          <Button variant="outline" onClick={() => setInstitutionUser(null)}>
            Logout
          </Button>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Bulk Upload</TabsTrigger>
            <TabsTrigger value="api">API Integration</TabsTrigger>
            <TabsTrigger value="status">Upload Status</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Bulk Certificate Upload</h3>
              <p className="text-muted-foreground mb-6">
                Upload certificate records in bulk using CSV or Excel files
              </p>

              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Upload Certificate Records
                  </Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-success" />
                        <div>
                          <p className="font-medium">{uploadFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(uploadFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">Drop CSV/Excel file here</p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse
                        </p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="bulk-upload"
                    />
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => document.getElementById('bulk-upload')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                </div>

                {uploadFile && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">File Format Requirements:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• New academic headers (preferred): <strong>Name</strong>, <strong>Roll_Number</strong>, Division, Department, SGPA_Sem1..SGPA_Sem8</li>
                      <li>• Legacy certificate format is still supported: Certificate ID, Student Name, Course, Institution Name, Issue Date</li>
                      <li>• Headings are optional; if present they must match exactly for auto-mapping</li>
                      <li>• Maximum file size: 10MB</li>
                      <li>• Supported formats: CSV, XLSX, XLS</li>
                    </ul>
                  </div>
                )}

                {uploadStatus === "uploading" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                <Button 
                  onClick={handleBulkUpload}
                  disabled={!uploadFile || uploadStatus === "uploading"}
                  className="w-full"
                >
                  {uploadStatus === "uploading" ? "Processing..." : "Upload Records"}
                </Button>

                {uploadStatus === "success" && (
                  <div className="flex items-center gap-2 text-success p-4 bg-success/10 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    <span>Certificate records uploaded successfully!</span>
                  </div>
                )}

                {uploadStatus === "error" && (
                  <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <span>Upload failed. Please try again.</span>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">API Integration</h3>
              <p className="text-muted-foreground mb-6">
                Integrate with your existing systems using our REST API
              </p>

              <div className="space-y-6">
                <div>
                  <Label>API Endpoint</Label>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      value={`https://tdkzbwmwmrabhynlxuuz.supabase.co/functions/v1/bulk-upload`}
                      readOnly 
                      className="bg-muted"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(`https://tdkzbwmwmrabhynlxuuz.supabase.co/functions/v1/bulk-upload`)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>API Key</Label>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      value={apiKey} 
                      readOnly 
                      type="password"
                      className="bg-muted"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={generateNewApiKey}
                      disabled={generatingKey}
                    >
                      {generatingKey ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Regenerate"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Example API Call:</h4>
                  <pre className="text-sm overflow-x-auto">
{`curl -X POST https://api.certvalidator.gov.in/v1/certificates \\
  -H "Authorization: Bearer cv_live_sk_xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "roll_number": "2020001",
    "certificate_id": "CERT123456",
    "course": "Bachelor of Computer Science",
    "year": "2024"
  }'`}
                  </pre>
                </div>

                <Button>Download API Documentation</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="status">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Upload Status</h3>
              <p className="text-muted-foreground mb-6">
                Monitor the status of your recent uploads
              </p>

              <div className="space-y-4">
                {uploadSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No upload sessions found</p>
                    <p className="text-sm">Upload your first batch to see the status here</p>
                  </div>
                ) : (
                  uploadSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{session.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.total_records} total • {session.successful_records} successful • {session.failed_records} failed
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {session.status === "completed" ? (
                            <span className="flex items-center gap-1 text-success">
                              <CheckCircle className="h-4 w-4" />
                              Completed
                            </span>
                          ) : session.status === "processing" ? (
                            <span className="flex items-center gap-1 text-warning">
                              <AlertCircle className="h-4 w-4" />
                              Processing
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive">
                              <AlertCircle className="h-4 w-4" />
                              Error
                            </span>
                          )}
                        </div>
                        {session.status === "processing" && (
                          <div className="w-32">
                            <Progress 
                              value={(session.processed_records / session.total_records) * 100} 
                              className="h-2" 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {session.processed_records}/{session.total_records}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};