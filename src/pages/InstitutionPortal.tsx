import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Database, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const InstitutionPortal = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login
    if (loginData.email && loginData.password) {
      setIsLoggedIn(true);
      toast({
        title: "Login successful",
        description: "Welcome to the Institution Portal",
      });
    }
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

  const handleBulkUpload = () => {
    if (!uploadFile) return;
    
    setUploadStatus("uploading");
    
    // Simulate upload process
    setTimeout(() => {
      setUploadStatus("success");
      toast({
        title: "Upload successful",
        description: "Certificate records have been processed and added to the database",
      });
    }, 2000);
  };

  if (!isLoggedIn) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="max-w-md mx-auto">
          <Card className="p-8">
            <div className="text-center mb-8">
              <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Database className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Institution Login</h1>
              <p className="text-muted-foreground">
                Access your institution portal to manage certificate records
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="institution@university.edu"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Need access? Contact your system administrator
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Institution Portal</h1>
            <p className="text-muted-foreground">Manage your certificate records and integrations</p>
          </div>
          <Button variant="outline" onClick={() => setIsLoggedIn(false)}>
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
                      <li>• Required columns: Name, Roll Number, Certificate ID, Course, Year</li>
                      <li>• Optional columns: Date of Issue, Grade, Additional Details</li>
                      <li>• Maximum file size: 10MB</li>
                      <li>• Supported formats: CSV, XLSX, XLS</li>
                    </ul>
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
                  <div className="flex items-center gap-2 text-success p-4 bg-success-light rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    <span>Certificate records uploaded successfully!</span>
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
                      value="https://api.certvalidator.gov.in/v1/certificates" 
                      readOnly 
                      className="bg-muted"
                    />
                    <Button variant="outline" size="sm">Copy</Button>
                  </div>
                </div>

                <div>
                  <Label>API Key</Label>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      value="cv_live_sk_xxxxxxxxxxxxxxxxxxxx" 
                      readOnly 
                      type="password"
                      className="bg-muted"
                    />
                    <Button variant="outline" size="sm">Regenerate</Button>
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
                {[
                  { file: "certificates_2024_batch1.csv", status: "completed", records: 1250, date: "2024-01-15" },
                  { file: "certificates_2023_final.xlsx", status: "completed", records: 980, date: "2024-01-14" },
                  { file: "certificates_2024_batch2.csv", status: "processing", records: 750, date: "2024-01-15" },
                ].map((upload, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{upload.file}</p>
                        <p className="text-sm text-muted-foreground">
                          {upload.records} records • {upload.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {upload.status === "completed" ? (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle className="h-4 w-4" />
                          Completed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-warning">
                          <AlertCircle className="h-4 w-4" />
                          Processing
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};