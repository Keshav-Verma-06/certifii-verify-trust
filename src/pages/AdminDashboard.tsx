import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileCheck, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Search,
  MoreHorizontal,
  Shield,
  Database
} from "lucide-react";
import { AdminLogin } from "@/components/auth/AdminLogin";
import { CertificateDetailsModal } from "@/components/modals/CertificateDetailsModal";
// Import Supabase client for database operations
import { supabase } from "@/integrations/supabase/client";

export const AdminDashboard = () => {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [blacklistedCertificates, setBlacklistedCertificates] = useState<any[]>([
    {
      certificateId: "FAKE123456",
      institution: "Fraudulent University",
      reason: "Confirmed forgery",
      dateAdded: "2024-01-10"
    },
    {
      certificateId: "INVALID789",
      institution: "Non-existent College",
      reason: "Invalid institution",
      dateAdded: "2024-01-08"
    },
    {
      certificateId: "CERT2023001",
      institution: "Verified Institute of Technology",
      reason: "Verification successful",
      dateAdded: "2023-12-15",
      status: "verified"
    },
    {
      certificateId: "CERT2023002",
      institution: "Global Education Center",
      reason: "Verification successful",
      dateAdded: "2023-11-20",
      status: "verified"
    },
    {
      certificateId: "CERT2023003",
      institution: "Advanced Learning Academy",
      reason: "Verification successful",
      dateAdded: "2023-10-05",
      status: "verified"
    }
  ]);
  const [blacklistedInstitutions, setBlacklistedInstitutions] = useState<any[]>([
    {
      name: "Fake Degree Mill",
      location: "Unknown",
      reason: "Issuing fraudulent certificates",
      dateAdded: "2024-01-05"
    },
    {
      name: "Diploma Factory Ltd",
      location: "Undisclosed",
      reason: "Commercial certificate fraud",
      dateAdded: "2024-01-03"
    }
  ]);
  const [flaggedCertificatesState, setFlaggedCertificatesState] = useState<any[]>([]);

  // Initialize flagged certificates data and fetch blacklist data from database
  useEffect(() => {
    const initialFlaggedCertificates = [
      {
        id: "CERT001",
        certificateId: "BC123456",
        reason: "Digital signature mismatch",
        institution: "Unknown Institution",
        reportCount: 5,
        severity: "high"
      },
      {
        id: "CERT002", 
        certificateId: "MBA789012",
        reason: "Invalid seal pattern",
        institution: "Fake Business School",
        reportCount: 3,
        severity: "medium"
      },
      {
        id: "CERT003",
        certificateId: "BTech345678",
        reason: "Certificate ID not found",
        institution: "Non-existent College",
        reportCount: 8,
        severity: "high"
      }
    ];
    
    setFlaggedCertificatesState(initialFlaggedCertificates);
    
    // Backend → Frontend flow: Fetch blacklist data from database
    const fetchBlacklistData = async () => {
      try {
        // Fetch blacklisted certificates
        const { data: certificateData, error: certError } = await supabase
          .from('blacklist_entries')
          .select('*')
          .eq('entity_type', 'certificate')
          .eq('is_active', true);
          
        if (certError) throw certError;
        
        // Transform certificate data from backend response
        const formattedCertificates = certificateData && certificateData.length > 0 ? 
          certificateData.map(entry => ({
            certificateId: entry.entity_id,
            institution: entry.evidence?.institution || 'Unknown Institution',
            reason: entry.reason,
            dateAdded: new Date(entry.created_at).toISOString().split('T')[0]
          })) : [];
        
        // Fetch blacklisted institutions
        const { data: institutionData, error: instError } = await supabase
          .from('blacklist_entries')
          .select('*')
          .eq('entity_type', 'institution')
          .eq('is_active', true);
          
        if (instError) throw instError;
        
        // Transform institution data from backend response
        const formattedInstitutions = institutionData && institutionData.length > 0 ?
          institutionData.map(entry => ({
            name: entry.entity_id,
            location: entry.evidence?.location || 'Undisclosed',
            reason: entry.reason,
            dateAdded: new Date(entry.created_at).toISOString().split('T')[0]
          })) : [];
        
        // Update frontend state with data from backend
        // Merge with our initial state data to maintain demo data
        setBlacklistedCertificates(prev => {
          // Keep only entries that aren't in the backend response
          const backendIds = formattedCertificates.map(c => c.certificateId);
          const filteredPrev = prev.filter(p => !backendIds.includes(p.certificateId) && p.status !== 'verified');
          return [...filteredPrev, ...formattedCertificates];
        });
        
        setBlacklistedInstitutions(prev => {
          // Keep only entries that aren't in the backend response
          const backendNames = formattedInstitutions.map(i => i.name);
          const filteredPrev = prev.filter(p => !backendNames.includes(p.name));
          return [...filteredPrev, ...formattedInstitutions];
        });
        
        console.log('Blacklist data fetched successfully from backend');
      } catch (error) {
        console.error('Error fetching blacklist data:', error);
        // Don't show alert to avoid disrupting user experience with demo data
      }
    };
    
    fetchBlacklistData();
  }, []);

  const handleAuthSuccess = (user: any) => {
    setAdminUser(user);
  };

  if (!adminUser) {
    return <AdminLogin onSuccess={handleAuthSuccess} />;
  }

  const stats = [
    {
      title: "Total Verifications",
      value: "12,547",
      change: "+12.5%",
      icon: FileCheck,
      color: "text-primary"
    },
    {
      title: "Forged Certificates",
      value: "247",
      change: "+3.2%",
      icon: AlertTriangle,
      color: "text-warning"
    },
    {
      title: "Partner Institutions",
      value: "156",
      change: "+8.1%",
      icon: Users,
      color: "text-success"
    },
    {
      title: "Success Rate",
      value: "98.1%",
      change: "+0.3%",
      icon: TrendingUp,
      color: "text-success"
    }
  ];

  const recentVerifications = [
    {
      id: "VER001",
      name: "John Doe",
      certificate: "BSc Computer Science",
      institution: "State University",
      status: "verified",
      date: "2024-01-15",
      time: "14:30"
    },
    {
      id: "VER002",
      name: "Jane Smith",
      certificate: "MBA Finance",
      institution: "Business College",
      status: "forged",
      date: "2024-01-15",
      time: "14:15"
    },
    {
      id: "VER003",
      name: "Mike Johnson",
      certificate: "BTech Civil",
      institution: "Tech Institute",
      status: "verified",
      date: "2024-01-15",
      time: "14:00"
    },
    {
      id: "VER004",
      name: "Sarah Wilson",
      certificate: "MA English",
      institution: "Arts University",
      status: "pending",
      date: "2024-01-15",
      time: "13:45"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="status-verified">Verified</Badge>;
      case "forged":
        return <Badge className="status-forged">Forged</Badge>;
      case "pending":
        return <Badge className="status-pending">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">High Risk</Badge>;
      case "medium":
        return <Badge className="bg-warning/10 text-warning">Medium Risk</Badge>;
      case "low":
        return <Badge variant="secondary">Low Risk</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  // Function to add certificate to blacklist
  const addToBlacklist = async (cert: any) => {
    try {
      // Frontend → Backend → Database flow
      // First, send data to backend (Supabase in this case)
      const { data, error } = await supabase
        .from('blacklist_entries')
        .insert({
          entity_type: 'certificate',
          entity_id: cert.certificateId,
          reason: cert.reason,
          is_active: true,
          severity: 'high',
          evidence: { flagged_data: cert }
        })
        .select();
      
      if (error) throw error;
      
      // Backend → Frontend flow
      // After successful database operation, update the UI
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Create a new blacklist entry with data from backend response
      const newBlacklistEntry = {
        certificateId: cert.certificateId,
        institution: cert.institution,
        reason: cert.reason,
        dateAdded: formattedDate
      };
      
      // Add to blacklist in local state
      setBlacklistedCertificates(prev => [...prev, newBlacklistEntry]);
      
      // Remove from flagged certificates
      setFlaggedCertificatesState(prev => 
        prev.filter(flagged => flagged.id !== cert.id)
      );
      
      // Show success message
      alert(`Certificate ${cert.certificateId} has been added to the blacklist.`);
    } catch (error) {
      console.error('Error adding certificate to blacklist:', error);
      alert('Failed to add certificate to blacklist. Please try again.');
    }
  };
  
  // Function to add institution to blacklist
  const addInstitutionToBlacklist = async (institution: any) => {
    try {
      // Frontend → Backend → Database flow
      // First, send data to backend (Supabase in this case)
      const { data, error } = await supabase
        .from('blacklist_entries')
        .insert({
          entity_type: 'institution',
          entity_id: institution.name,
          reason: institution.reason,
          is_active: true,
          severity: 'high',
          evidence: { institution_data: institution }
        })
        .select();
      
      if (error) throw error;
      
      // Backend → Frontend flow
      // After successful database operation, update the UI
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Create a new blacklist entry with data from backend response
      const newBlacklistEntry = {
        name: institution.name,
        location: institution.location || 'Undisclosed',
        reason: institution.reason,
        dateAdded: formattedDate
      };
      
      // Add to blacklist in local state
      setBlacklistedInstitutions(prev => [...prev, newBlacklistEntry]);
      
      // Show success message
      alert(`Institution ${institution.name} has been added to the blacklist.`);
    } catch (error) {
      console.error('Error adding institution to blacklist:', error);
      alert('Failed to add institution to blacklist. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome, {adminUser.full_name} - Monitor verification activity and system security
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Export Report</Button>
            <Button>Security Scan</Button>
            <Button variant="outline" onClick={() => setAdminUser(null)}>
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-success mt-1">{stat.change}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity">Verification Activity</TabsTrigger>
            <TabsTrigger value="flagged">Flagged Certificates</TabsTrigger>
            <TabsTrigger value="blacklist">Blacklist Management</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Recent Verification Attempts</h3>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search verifications..." className="pl-10 w-64" />
                  </div>
                  <Button variant="outline">Filter</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Certificate</th>
                      <th className="text-left p-3 font-medium">Institution</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Date & Time</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVerifications.map((verification) => (
                      <tr key={verification.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-mono text-sm">{verification.id}</td>
                        <td className="p-3">{verification.name}</td>
                        <td className="p-3">{verification.certificate}</td>
                        <td className="p-3">{verification.institution}</td>
                        <td className="p-3">{getStatusBadge(verification.status)}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {verification.date} at {verification.time}
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="flagged">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Flagged Forged Certificates</h3>
                <Button variant="outline">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Certificate
                </Button>
              </div>

              <div className="space-y-4">
                {flaggedCertificatesState.map((cert) => (
                  <div key={cert.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-warning" />
                        <div>
                          <p className="font-semibold">Certificate ID: {cert.certificateId}</p>
                          <p className="text-sm text-muted-foreground">{cert.institution}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getSeverityBadge(cert.severity)}
                        <Badge variant="outline">{cert.reportCount} reports</Badge>
                      </div>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-lg mb-3">
                      <p className="text-sm">
                        <span className="font-medium">Reason: </span>
                        {cert.reason}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedCertificate(cert);
                          setIsDetailsModalOpen(true);
                        }}
                      >
                        View Details
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => addToBlacklist(cert)}
                      >
                        Add to Blacklist
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="blacklist">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Blacklist Management</h3>
                <Button onClick={() => {
                  // Get institution details from user
                  const name = prompt("Enter institution name:");
                  if (!name) return;
                  
                  const location = prompt("Enter institution location (optional):");
                  const reason = prompt("Enter reason for blacklisting:") || "Suspicious activity";
                  
                  // Add to blacklist
                  addInstitutionToBlacklist({
                    name,
                    location: location || "Undisclosed",
                    reason
                  });
                }}>
                  <Database className="h-4 w-4 mr-2" />
                  Add to Blacklist
                </Button>
              </div>

              <Tabs defaultValue="certificates" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="certificates">Certificates</TabsTrigger>
                  <TabsTrigger value="institutions">Institutions</TabsTrigger>
                </TabsList>

                <TabsContent value="certificates">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search blacklisted certificates..." className="pl-10" />
                      </div>
                      <Button variant="outline">Filter</Button>
                    </div>

                    <div className="border rounded-lg">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Certificate ID</th>
                            <th className="text-left p-3 font-medium">Institution</th>
                            <th className="text-left p-3 font-medium">Reason</th>
                            <th className="text-left p-3 font-medium">Date Added</th>
                            <th className="text-left p-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blacklistedCertificates.map((cert, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-3 font-mono">{cert.certificateId}</td>
                              <td className="p-3">{cert.institution}</td>
                              <td className="p-3">{cert.reason}</td>
                              <td className="p-3">{cert.dateAdded}</td>
                              <td className="p-3">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      // Get the certificate to remove
                                      const removedCert = blacklistedCertificates[index];
                                      
                                      // Frontend → Backend → Database flow
                                      // First, send data to backend (Supabase in this case)
                                      const { data, error } = await supabase
                                        .from('blacklist_entries')
                                        .update({ is_active: false })
                                        .eq('entity_type', 'certificate')
                                        .eq('entity_id', removedCert.certificateId)
                                        .select();
                                      
                                      if (error) throw error;
                                      
                                      // Backend → Frontend flow
                                      // After successful database operation, update the UI
                                      setBlacklistedCertificates(prev => 
                                        prev.filter((_, i) => i !== index)
                                      );
                                      
                                      // Show success message
                                      alert(`Certificate ${removedCert.certificateId} has been removed from the blacklist.`);
                                    } catch (error) {
                                      console.error('Error removing certificate from blacklist:', error);
                                      alert('Failed to remove certificate from blacklist. Please try again.');
                                    }
                                  }}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="institutions">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search blacklisted institutions..." className="pl-10" />
                      </div>
                      <Button variant="outline">Filter</Button>
                    </div>

                    <div className="border rounded-lg">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Institution Name</th>
                            <th className="text-left p-3 font-medium">Location</th>
                            <th className="text-left p-3 font-medium">Reason</th>
                            <th className="text-left p-3 font-medium">Date Added</th>
                            <th className="text-left p-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blacklistedInstitutions.map((institution, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-3">{institution.name}</td>
                              <td className="p-3">{institution.location}</td>
                              <td className="p-3">{institution.reason}</td>
                              <td className="p-3">{institution.dateAdded}</td>
                              <td className="p-3">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      // Get the institution to remove
                                      const removedInstitution = blacklistedInstitutions[index];
                                      
                                      // Frontend → Backend → Database flow
                                      // First, send data to backend (Supabase in this case)
                                      const { data, error } = await supabase
                                        .from('blacklist_entries')
                                        .update({ is_active: false })
                                        .eq('entity_type', 'institution')
                                        .eq('entity_id', removedInstitution.name)
                                        .select();
                                      
                                      if (error) throw error;
                                      
                                      // Backend → Frontend flow
                                      // After successful database operation, update the UI
                                      setBlacklistedInstitutions(prev => 
                                        prev.filter((_, i) => i !== index)
                                      );
                                      
                                      // Show success message
                                      alert(`Institution ${removedInstitution.name} has been removed from the blacklist.`);
                                    } catch (error) {
                                      console.error('Error removing institution from blacklist:', error);
                                      alert('Failed to remove institution from blacklist. Please try again.');
                                    }
                                  }}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CertificateDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        certificate={selectedCertificate}
        onAddToBlacklist={() => {
          if (selectedCertificate) {
            addToBlacklist(selectedCertificate);
            setIsDetailsModalOpen(false);
          }
        }}
      />
    </div>
  );
};
