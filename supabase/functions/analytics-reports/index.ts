import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsRequest {
  report_type: 'forgery_trends' | 'verification_stats' | 'institution_performance' | 'usage_analytics';
  date_range?: {
    start_date: string;
    end_date: string;
  };
  filters?: Record<string, any>;
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

    const { report_type, date_range, filters }: AnalyticsRequest = await req.json();

    console.log('Generating analytics report:', report_type);

    let reportData: any = {};

    switch (report_type) {
      case 'forgery_trends':
        reportData = await generateForgeryTrendsReport(supabaseClient, date_range, filters);
        break;
      case 'verification_stats':
        reportData = await generateVerificationStatsReport(supabaseClient, date_range, filters);
        break;
      case 'institution_performance':
        reportData = await generateInstitutionPerformanceReport(supabaseClient, date_range, filters);
        break;
      case 'usage_analytics':
        reportData = await generateUsageAnalyticsReport(supabaseClient, date_range, filters);
        break;
      default:
        throw new Error('Invalid report type');
    }

    // Log audit trail
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: (await supabaseClient.auth.getUser()).data.user?.id,
        action: 'ANALYTICS_REPORT_GENERATED',
        entity_type: 'report',
        entity_id: report_type,
        new_values: {
          report_type,
          date_range,
          filters
        }
      });

    return new Response(JSON.stringify({
      success: true,
      report_type,
      generated_at: new Date().toISOString(),
      data: reportData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analytics-reports function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateForgeryTrendsReport(supabaseClient: any, dateRange?: any, filters?: any) {
  const startDate = dateRange?.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = dateRange?.end_date || new Date().toISOString();

  // Get forgery statistics by time period
  const { data: forgeryStats } = await supabaseClient
    .from('verification_records')
    .select('created_at, status, confidence_score')
    .eq('status', 'forged')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Get blacklist entries over time
  const { data: blacklistStats } = await supabaseClient
    .from('blacklist_entries')
    .select('created_at, entity_type, severity')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Get forgery reports by severity
  const { data: reportsBySeverity } = await supabaseClient
    .from('forgery_reports')
    .select('severity, status, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Aggregate data by day
  const dailyStats = {};
  forgeryStats?.forEach(record => {
    const date = new Date(record.created_at).toISOString().split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { forged: 0, total_verifications: 0 };
    }
    dailyStats[date].forged++;
  });

  // Get total verifications for context
  const { data: allVerifications } = await supabaseClient
    .from('verification_records')
    .select('created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  allVerifications?.forEach(record => {
    const date = new Date(record.created_at).toISOString().split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { forged: 0, total_verifications: 0 };
    }
    dailyStats[date].total_verifications++;
  });

  return {
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_forged: forgeryStats?.length || 0,
      total_blacklisted: blacklistStats?.length || 0,
      total_reports: reportsBySeverity?.length || 0,
      forgery_rate: allVerifications?.length ? 
        ((forgeryStats?.length || 0) / allVerifications.length * 100).toFixed(2) + '%' : '0%'
    },
    daily_trends: dailyStats,
    severity_breakdown: {
      critical: reportsBySeverity?.filter(r => r.severity === 'critical').length || 0,
      high: reportsBySeverity?.filter(r => r.severity === 'high').length || 0,
      medium: reportsBySeverity?.filter(r => r.severity === 'medium').length || 0,
      low: reportsBySeverity?.filter(r => r.severity === 'low').length || 0
    }
  };
}

async function generateVerificationStatsReport(supabaseClient: any, dateRange?: any, filters?: any) {
  const startDate = dateRange?.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = dateRange?.end_date || new Date().toISOString();

  // Get verification statistics
  const { data: verifications } = await supabaseClient
    .from('verification_records')
    .select('status, verification_method, confidence_score, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Get certificate status distribution
  const { data: certificates } = await supabaseClient
    .from('certificates')
    .select('status, verification_method, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const statusBreakdown = {
    verified: verifications?.filter(v => v.status === 'verified').length || 0,
    pending: verifications?.filter(v => v.status === 'pending').length || 0,
    forged: verifications?.filter(v => v.status === 'forged').length || 0
  };

  const methodBreakdown = {};
  verifications?.forEach(v => {
    if (!methodBreakdown[v.verification_method]) {
      methodBreakdown[v.verification_method] = 0;
    }
    methodBreakdown[v.verification_method]++;
  });

  const avgConfidence = verifications?.length ? 
    (verifications.reduce((sum, v) => sum + (v.confidence_score || 0), 0) / verifications.length).toFixed(2) : 0;

  return {
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_verifications: verifications?.length || 0,
      average_confidence: avgConfidence + '%',
      success_rate: verifications?.length ? 
        (statusBreakdown.verified / verifications.length * 100).toFixed(2) + '%' : '0%'
    },
    status_breakdown: statusBreakdown,
    method_breakdown: methodBreakdown,
    certificates_processed: certificates?.length || 0
  };
}

async function generateInstitutionPerformanceReport(supabaseClient: any, dateRange?: any, filters?: any) {
  const startDate = dateRange?.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = dateRange?.end_date || new Date().toISOString();

  // Get institution statistics
  const { data: institutions } = await supabaseClient
    .from('institutions')
    .select(`
      *,
      certificates!inner(status, created_at),
      blacklist_entries!inner(is_active, created_at)
    `)
    .gte('certificates.created_at', startDate)
    .lte('certificates.created_at', endDate);

  const institutionStats = institutions?.map(inst => {
    const certs = inst.certificates || [];
    const blacklistEntries = inst.blacklist_entries?.filter(entry => entry.is_active) || [];
    
    return {
      id: inst.id,
      name: inst.name,
      is_verified: inst.is_verified,
      is_blacklisted: inst.is_blacklisted,
      total_certificates: certs.length,
      verified_certificates: certs.filter(c => c.status === 'verified').length,
      forged_certificates: certs.filter(c => c.status === 'forged').length,
      blacklist_entries: blacklistEntries.length,
      performance_score: certs.length > 0 ? 
        (certs.filter(c => c.status === 'verified').length / certs.length * 100).toFixed(2) : 0
    };
  }) || [];

  return {
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_institutions: institutions?.length || 0,
      verified_institutions: institutions?.filter(i => i.is_verified).length || 0,
      blacklisted_institutions: institutions?.filter(i => i.is_blacklisted).length || 0
    },
    institution_performance: institutionStats
  };
}

async function generateUsageAnalyticsReport(supabaseClient: any, dateRange?: any, filters?: any) {
  const startDate = dateRange?.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = dateRange?.end_date || new Date().toISOString();

  // Get usage statistics from audit logs
  const { data: auditLogs } = await supabaseClient
    .from('audit_logs')
    .select('action, created_at, user_id')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Get bulk upload sessions
  const { data: bulkUploads } = await supabaseClient
    .from('bulk_upload_sessions')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Aggregate actions by type
  const actionBreakdown = {};
  auditLogs?.forEach(log => {
    if (!actionBreakdown[log.action]) {
      actionBreakdown[log.action] = 0;
    }
    actionBreakdown[log.action]++;
  });

  // Get unique users
  const uniqueUsers = new Set(auditLogs?.map(log => log.user_id) || []).size;

  return {
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_actions: auditLogs?.length || 0,
      unique_users: uniqueUsers,
      bulk_uploads: bulkUploads?.length || 0,
      avg_actions_per_user: uniqueUsers > 0 ? 
        ((auditLogs?.length || 0) / uniqueUsers).toFixed(2) : 0
    },
    action_breakdown: actionBreakdown,
    bulk_upload_stats: {
      total_sessions: bulkUploads?.length || 0,
      completed_sessions: bulkUploads?.filter(s => s.status === 'completed').length || 0,
      total_records_processed: bulkUploads?.reduce((sum, s) => sum + (s.total_records || 0), 0) || 0,
      successful_records: bulkUploads?.reduce((sum, s) => sum + (s.successful_records || 0), 0) || 0
    }
  };
}