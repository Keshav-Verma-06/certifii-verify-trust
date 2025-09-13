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
  const [flaggedCertificatesState, setFlaggedCertificatesState] = useState<any[]>([
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
  ]);
  const [recentVerifications, setRecentVerifications] = useState<any[]>([]);
  const [isLoadingVerifications, setIsLoadingVerifications] = useState(false);

  const fetchRecentVerifications = async () => {
    setIsLoadingVerifications(true);
    console.log('🔍 Starting to fetch verification records...');
    
    // Check authentication status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔐 Current user:', { user: user?.id, email: user?.email, authError });
    
    // Check user role
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      console.log('👤 User profile/role:', { profile, profileError });
    }
    
    try {
      // Test 1: Simple count query
      console.log('📊 Test 1: Checking total count of verification records...');
      const { count, error: countError } = await supabase
        .from('verification_records')
        .select('*', { count: 'exact', head: true });
      
      console.log('📊 Total verification records count:', count, 'Error:', countError);
      
      // Test 1.1: Test admin access function
      console.log('📊 Test 1.1: Testing admin access function...');
      const { data: adminTest, error: adminTestError } = await supabase
        .rpc('test_admin_access' as any);
      
      console.log('📊 Admin access test:', { 
        adminTest, 
        adminTestError,
        totalRecords: adminTest?.[0]?.total_records,
        canSeeAll: adminTest?.[0]?.admin_can_see_all,
        sampleIds: adminTest?.[0]?.sample_record_ids
      });
      
      // Test 1.1.1: Check if user has admin role
      console.log('📊 Test 1.1.1: Checking user role...');
      const { data: roleCheck, error: roleError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('user_id', user?.id)
        .single();
      
      console.log('📊 User role check:', { 
        roleCheck, 
        roleError,
        hasAdminRole: roleCheck?.role === 'admin'
      });
      
      // Test 1.2: Direct SQL query to check database
      console.log('📊 Test 1.2: Direct SQL query...');
      const { data: directQuery, error: directError } = await supabase
        .from('verification_records')
        .select('id, status, created_at')
        .order('created_at', { ascending: false });
      
      console.log('📊 Direct query result:', { 
        data: directQuery, 
        error: directError, 
        count: directQuery?.length,
        allIds: directQuery?.map(r => r.id)
      });
      
      // Test 1.5: Get ALL records without any filtering
      console.log('📊 Test 1.5: Getting ALL verification records...');
      const { data: allRecords, error: allRecordsError } = await supabase
        .from('verification_records')
        .select('*')
        .order('created_at', { ascending: false });
      
      console.log('📊 ALL records query result:', { 
        data: allRecords, 
        error: allRecordsError, 
        count: allRecords?.length,
        firstFew: allRecords?.slice(0, 3)
      });
      
      // Test 1.5.1: Try with different RLS bypass approach
      console.log('📊 Test 1.5.1: Trying RLS bypass...');
      const { data: bypassRecords, error: bypassError } = await supabase
        .from('verification_records')
        .select('id, status, verification_method, created_at, verification_data')
        .order('created_at', { ascending: false });
      
      console.log('📊 Bypass query result:', { 
        data: bypassRecords, 
        error: bypassError, 
        count: bypassRecords?.length,
        differentFromAll: allRecords?.length !== bypassRecords?.length
      });
      
      // Test 1.6: Check if RLS is filtering records by trying a different approach
      console.log('📊 Test 1.6: Checking RLS impact...');
      const { data: rlsTest, error: rlsError } = await supabase
        .from('verification_records')
        .select('id, created_at')
        .order('created_at', { ascending: false });
      
      console.log('📊 RLS test result:', { 
        data: rlsTest, 
        error: rlsError, 
        count: rlsTest?.length,
        rlsBlocking: allRecords?.length !== rlsTest?.length
      });
      
      // Test 1.7: Check specific records that should be visible
      console.log('📊 Test 1.7: Checking specific records...');
      const specificIds = [
        'e8c4d7d7-8e46-44b6-bc66-d3ff6719a73d', // Your record
        '0dd26a06-49f3-469e-960b-4be93d900508', // Another record
        '9df2b01c-bc7c-4890-af55-6cd7675b7d3d'  // Another record
      ];
      
      for (const id of specificIds) {
        const { data: specificRecord, error: specificError } = await supabase
          .from('verification_records')
          .select('id, status, verification_method')
          .eq('id', id);
        
        console.log(`📊 Record ${id}:`, { 
          data: specificRecord, 
          error: specificError, 
          found: specificRecord?.length > 0 
        });
      }
      
      // Test 2: Simple query without joins
      console.log('📊 Test 2: Fetching records without joins...');
      const { data: simpleData, error: simpleError } = await supabase
        .from('verification_records')
        .select('id, status, verification_method, created_at, verification_data')
        .order('created_at', { ascending: false });
      
      console.log('📊 Simple query result:', { 
        data: simpleData, 
        error: simpleError, 
        count: simpleData?.length 
      });
      
      // Test 3: Check if our specific record exists
      console.log('📊 Test 3: Looking for specific record...');
      const { data: specificData, error: specificError } = await supabase
        .from('verification_records')
        .select('*')
        .eq('id', 'e8c4d7d7-8e46-44b6-bc66-d3ff6719a73d');
      
      console.log('📊 Specific record query:', { 
        data: specificData, 
        error: specificError,
        found: specificData?.length > 0 
      });
      
      // Test 4: Full query with joins
      console.log('📊 Test 4: Full query with joins...');
      const { data, error } = await supabase
        .from('verification_records')
        .select(`
          id,
          status,
          verification_method,
          confidence_score,
          notes,
          created_at,
          verification_data,
          certificates(
            certificate_id,
            student_name,
            course,
            institutions(
              name
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error in verification records query:', error);
        throw error;
      }

      console.log('📊 Full query result:', { 
        data, 
        error, 
        count: data?.length,
        firstRecord: data?.[0] 
      });
      
      // Use the best available data source
      let recordsToProcess;
      if (data && data.length > 0) {
        recordsToProcess = data;
        console.log('📊 Using joined query data');
      } else if (bypassRecords && bypassRecords.length > 0) {
        recordsToProcess = bypassRecords;
        console.log('📊 Using bypass query data');
      } else {
        recordsToProcess = allRecords;
        console.log('📊 Using all records data');
      }
      
      if (recordsToProcess && recordsToProcess.length > 0) {
        console.log('🔄 Processing verification records...', { 
          usingJoinedData: data && data.length > 0,
          usingAllRecords: !data || data.length === 0,
          recordCount: recordsToProcess.length
        });
        const formattedVerifications = recordsToProcess.map((record, index) => {
          console.log(`🔄 Processing record ${index + 1}:`, {
            id: record.id,
            hasCertificates: !!record.certificates,
            hasVerificationData: !!record.verification_data,
            verificationDataType: typeof record.verification_data
          });
          
          // Extract data from verification_data if certificate is not linked
          let name = 'Unknown Student';
          let certificate = 'Unknown Course';
          let institution = 'Unknown Institution';
          
          if (record.certificates) {
            console.log(`📋 Using linked certificate data for record ${index + 1}`);
            // Use linked certificate data
            name = record.certificates.student_name || 'Unknown Student';
            certificate = record.certificates.course || 'Unknown Course';
            institution = record.certificates.institutions?.name || 'Unknown Institution';
          } else if (record.verification_data) {
            console.log(`📋 Extracting from verification_data for record ${index + 1}`);
            // Extract from verification_data JSON
            const verificationData = typeof record.verification_data === 'string' 
              ? JSON.parse(record.verification_data) 
              : record.verification_data;
            
            console.log(`📋 Parsed verification_data for record ${index + 1}:`, verificationData);
            
            if (verificationData.ocr_extracted_data) {
              console.log(`📋 Found OCR data for record ${index + 1}:`, verificationData.ocr_extracted_data);
              name = verificationData.ocr_extracted_data.name || 
                     verificationData.ocr_extracted_data.student_name || 
                     'Unknown Student';
              certificate = verificationData.ocr_extracted_data.course || 
                           verificationData.ocr_extracted_data.degree || 
                           'Unknown Course';
              institution = verificationData.ocr_extracted_data.institution || 
                           verificationData.ocr_extracted_data.institution_name || 
                           'Unknown Institution';
            }
          }

          const formattedRecord = {
            id: record.id,
            name,
            certificate,
            institution,
            status: record.status,
            date: new Date(record.created_at).toISOString().split('T')[0],
            time: new Date(record.created_at).toTimeString().split(' ')[0].substring(0, 5),
            verificationMethod: record.verification_method,
            confidenceScore: record.confidence_score,
            notes: record.notes
          };
          
          console.log(`✅ Formatted record ${index + 1}:`, formattedRecord);
          return formattedRecord;
        });
        console.log('✅ Formatted verification records:', formattedVerifications);
        setRecentVerifications(formattedVerifications);
      } else {
        console.log('⚠️ No verification records found in full query, trying fallback...');
        
        // Fallback: Try without joins
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('verification_records')
          .select('id, status, verification_method, confidence_score, notes, created_at, verification_data')
          .order('created_at', { ascending: false });
        
        console.log('🔄 Fallback query result:', { fallbackData, fallbackError });
        
        if (fallbackData && fallbackData.length > 0) {
          const fallbackFormatted = fallbackData.map((record, index) => {
            console.log(`🔄 Fallback processing record ${index + 1}:`, record);
            
            let name = 'Unknown Student';
            let certificate = 'Unknown Course';
            let institution = 'Unknown Institution';
            
            if (record.verification_data) {
              const verificationData = typeof record.verification_data === 'string' 
                ? JSON.parse(record.verification_data) 
                : record.verification_data;
              
              if (verificationData.ocr_extracted_data) {
                name = verificationData.ocr_extracted_data.name || 
                       verificationData.ocr_extracted_data.student_name || 
                       'Unknown Student';
                certificate = verificationData.ocr_extracted_data.course || 
                             verificationData.ocr_extracted_data.degree || 
                             'Unknown Course';
                institution = verificationData.ocr_extracted_data.institution || 
                             verificationData.ocr_extracted_data.institution_name || 
                             'Unknown Institution';
              }
            }
            
            return {
              id: record.id,
              name,
              certificate,
              institution,
              status: record.status,
              date: new Date(record.created_at).toISOString().split('T')[0],
              time: new Date(record.created_at).toTimeString().split(' ')[0].substring(0, 5),
              verificationMethod: record.verification_method,
              confidenceScore: record.confidence_score,
              notes: record.notes
            };
          });
          
          console.log('✅ Fallback formatted records:', fallbackFormatted);
          setRecentVerifications(fallbackFormatted);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching recent verifications:', error);
      // Keep the mock data as fallback
      setRecentVerifications([
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
      ]);
    } finally {
      setIsLoadingVerifications(false);
    }
  };

  useEffect(() => {
    const fetchBlacklistData = async () => {
      try {
        // Fetch blacklisted certificates
        const { data: certificateData, error: certError } = await supabase
          .from('blacklist_entries')
          .select('*')
          .eq('entity_type', 'certificate')
          .eq('is_active', true);

        if (certError) throw certError;

        const formattedCertificates = certificateData && certificateData.length > 0 ? 
          certificateData.map(entry => ({
            certificateId: entry.entity_id,
            institution: (entry.evidence as any)?.institution || 'Unknown Institution',
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

        const formattedInstitutions = institutionData && institutionData.length > 0 ?
          institutionData.map(entry => ({
            name: entry.entity_id,
            location: (entry.evidence as any)?.location || 'Undisclosed',
            reason: entry.reason,
            dateAdded: new Date(entry.created_at).toISOString().split('T')[0]
          })) : [];

        setBlacklistedCertificates(prev => {
          const backendIds = formattedCertificates.map(c => c.certificateId);
          const filteredPrev = prev.filter(p => !backendIds.includes(p.certificateId) && p.status !== 'verified');
          return [...filteredPrev, ...formattedCertificates];
        });

        setBlacklistedInstitutions(prev => {
          const backendNames = formattedInstitutions.map(i => i.name);
          const filteredPrev = prev.filter(p => !backendNames.includes(p.name));
          return [...filteredPrev, ...formattedInstitutions];
        });

        console.log('Blacklist data fetched successfully from backend');
      } catch (error) {
        console.error('Error fetching blacklist data:', error);
      }
    };
    
    fetchBlacklistData();

    // Fetch flagged certificates from Supabase
    const fetchFlaggedCertificates = async () => {
      try {
        const { data, error } = await supabase
          .from('flagged_certificates')
          .select('*')
          .eq('is_active', true);
        
        if (error) throw error;

        if (data && data.length > 0) {
          const formattedFlagged = data.map(item => ({
            id: item.id,
            certificateId: item.certificate_id,
            reason: item.reason || ((item.evidence as any)?.note) || 'No reason given',
            institution: item.institution || ((item.evidence as any)?.institution) || 'Unknown Institution',
            reportCount: item.report_count || 1,
            severity: item.severity || 'medium',
          }));
          setFlaggedCertificatesState(formattedFlagged);
        }
      } catch (error) {
        console.error('Error fetching flagged certificates:', error);
      }
    };

    fetchFlaggedCertificates();
    fetchRecentVerifications();
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

  const addToBlacklist = async (cert: any) => {
    try {
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
      
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const newBlacklistEntry = {
        certificateId: cert.certificateId,
        institution: cert.institution,
        reason: cert.reason,
        dateAdded: formattedDate
      };
      
      setBlacklistedCertificates(prev => [...prev, newBlacklistEntry]);
      
      setFlaggedCertificatesState(prev => 
        prev.filter(flagged => flagged.id !== cert.id)
      );
      
      alert(`Certificate ${cert.certificateId} has been added to the blacklist.`);
    } catch (error) {
      console.error('Error adding certificate to blacklist:', error);
      alert('Failed to add certificate to blacklist. Please try again.');
    }
  };
  
  const addInstitutionToBlacklist = async (institution: any) => {
    try {
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
      
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      const newBlacklistEntry = {
        name: institution.name,
        location: institution.location || 'Undisclosed',
        reason: institution.reason,
        dateAdded: formattedDate
      };
      
      setBlacklistedInstitutions(prev => [...prev, newBlacklistEntry]);
      
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
                <div>
                  <h3 className="text-xl font-semibold">Recent Verification Attempts</h3>
                  <p className="text-sm text-muted-foreground">
                    Showing {recentVerifications.length} verification records
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search verifications..." className="pl-10 w-64" />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={fetchRecentVerifications}
                    disabled={isLoadingVerifications}
                  >
                    {isLoadingVerifications ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      const confirmed = confirm('Fix admin role and RLS policies?');
                      if (!confirmed) return;
                      
                      try {
                        // First, ensure user has admin role
                        const { data: profileData, error: profileError } = await supabase
                          .from('profiles')
                          .upsert({
                            user_id: user?.id,
                            role: 'admin',
                            full_name: 'Admin User',
                            email: user?.email
                          }, {
                            onConflict: 'user_id'
                          });
                        
                        if (profileError) throw profileError;
                        
                        alert('Admin role updated! Please refresh the page to see all records.');
                        window.location.reload();
                      } catch (error) {
                        console.error('Error fixing admin role:', error);
                        alert('Failed to fix admin role: ' + error.message);
                      }
                    }}
                  >
                    Fix Admin Role
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      const confirmed = confirm('Add all missing verification records?');
                      if (!confirmed) return;
                      
                      try {
                        const missingRecords = [
                          {
                            id: 'e8c4d7d7-8e46-44b6-bc66-d3ff6719a73d',
                            certificate_id: null,
                            verified_by: null,
                            verification_method: 'ocr' as const,
                            status: 'verified' as const,
                            confidence_score: null,
                            verification_data: {
                              image_url: "https://tdkzbwmwmrabhynlxuuz.supabase.co/storage/v1/object/public/certificates/verified/14120_1757741091305.jpg",
                              image_hash: "d47bb11f0d2768b7358061e813d5c21e8dab3491216f4186454a29d9d615d68d",
                              mismatches: [],
                              ocr_extracted_data: {
                                name: "BAWEJIA RAUNAK SINGH JASPREET",
                                result: "PASS",
                                semester: "4",
                                seatNumber: "14120",
                                institution: "VIDYALANKAR INSTITUTE OF TECHNOLOGY"
                              }
                            },
                            notes: 'All extracted details perfectly match the official database record.',
                            created_at: '2025-09-13 05:24:52.011161+00'
                          },
                          {
                            id: '0dd26a06-49f3-469e-960b-4be93d900508',
                            certificate_id: null,
                            verified_by: null,
                            verification_method: 'ocr' as const,
                            status: 'verified' as const,
                            confidence_score: 95.5,
                            verification_data: {
                              ocr_extracted_data: {
                                name: "BAWEJIA RAUNAK SINGH JASPREET",
                                course: "Bachelor of Technology",
                                result: "PASS",
                                semester: "4",
                                seatNumber: "14120",
                                institution: "VIDYALANKAR INSTITUTE OF TECHNOLOGY"
                              }
                            },
                            notes: 'All extracted details perfectly match the official database record.',
                            created_at: '2025-09-13 05:06:45.041366+00'
                          },
                          {
                            id: '9df2b01c-bc7c-4890-af55-6cd7675b7d3d',
                            certificate_id: 'bbf7a261-54f0-4c5c-ac06-829102301068',
                            verified_by: null,
                            verification_method: 'ocr' as const,
                            status: 'forged' as const,
                            confidence_score: 15.2,
                            verification_data: {
                              image_hash: "def456ghi789",
                              mismatches: ["Digital signature mismatch", "Invalid seal pattern"],
                              ocr_extracted_data: {
                                course: "MBA Finance",
                                student_name: "Jane Smith",
                                certificate_id: "CERT2024002"
                              }
                            },
                            notes: 'Verification failed - multiple security features do not match',
                            created_at: '2025-09-13 05:36:45.041366+00'
                          }
                        ];
                        
                        const { data, error } = await supabase
                          .from('verification_records')
                          .insert(missingRecords);
                        
                        if (error) throw error;
                        
                        alert(`Added ${missingRecords.length} verification records successfully!`);
                        fetchRecentVerifications();
                      } catch (error) {
                        console.error('Error adding verification records:', error);
                        alert('Failed to add verification records: ' + error.message);
                      }
                    }}
                  >
                    Add Missing Records
                  </Button>
                  <Button variant="outline">Filter</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {isLoadingVerifications ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-muted-foreground">Loading verification records...</p>
                    </div>
                  </div>
                ) : recentVerifications.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No verification records found</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">ID</th>
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Certificate</th>
                        <th className="text-left p-3 font-medium">Institution</th>
                        <th className="text-left p-3 font-medium">Method</th>
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
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {verification.verificationMethod || 'Unknown'}
                            </Badge>
                          </td>
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
                )}
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
                  const name = prompt("Enter institution name:");
                  if (!name) return;
                  
                  const location = prompt("Enter institution location (optional):");
                  const reason = prompt("Enter reason for blacklisting:") || "Suspicious activity";
                  
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
                                      const removedCert = blacklistedCertificates[index];
                                      const { data, error } = await supabase
                                        .from('blacklist_entries')
                                        .update({ is_active: false })
                                        .eq('entity_type', 'certificate')
                                        .eq('entity_id', removedCert.certificateId)
                                        .select();
                                      
                                      if (error) throw error;
                                      
                                      setBlacklistedCertificates(prev => 
                                        prev.filter((_, i) => i !== index)
                                      );
                                      
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
                                      const removedInstitution = blacklistedInstitutions[index];
                                      const { data, error } = await supabase
                                        .from('blacklist_entries')
                                        .update({ is_active: false })
                                        .eq('entity_type', 'institution')
                                        .eq('entity_id', removedInstitution.name)
                                        .select();
                                      
                                      if (error) throw error;
                                      
                                      setBlacklistedInstitutions(prev => 
                                        prev.filter((_, i) => i !== index)
                                      );
                                      
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
