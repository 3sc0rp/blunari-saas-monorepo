import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MONITOR-SYSTEM] ${step}${detailsStr}`);
};

// Generate sample monitoring data for demonstration
const generateMetrics = () => {
  const now = new Date();
  const metrics = [];
  
  // System health metrics
  metrics.push({
    metric_name: 'response_time',
    metric_value: Math.random() * 200 + 50, // 50-250ms
    metric_unit: 'ms',
    service_name: 'api',
    endpoint: '/api/bookings',
    severity: 'info'
  });
  
  metrics.push({
    metric_name: 'error_rate',
    metric_value: Math.random() * 2, // 0-2%
    metric_unit: 'percentage',
    service_name: 'api',
    severity: 'info'
  });
  
  metrics.push({
    metric_name: 'throughput',
    metric_value: Math.random() * 100 + 50, // 50-150 requests/min
    metric_unit: 'requests_per_minute',
    service_name: 'api',
    severity: 'info'
  });
  
  // Database metrics
  metrics.push({
    metric_name: 'connection_pool_usage',
    metric_value: Math.random() * 40 + 20, // 20-60%
    metric_unit: 'percentage',
    service_name: 'database',
    severity: 'info'
  });
  
  metrics.push({
    metric_name: 'query_time',
    metric_value: Math.random() * 50 + 5, // 5-55ms
    metric_unit: 'ms',
    service_name: 'database',
    severity: 'info'
  });
  
  // Business metrics (occasionally generate critical values to trigger alerts)
  if (Math.random() < 0.1) { // 10% chance of high response time
    metrics.push({
      metric_name: 'response_time',
      metric_value: 1200, // Above threshold
      metric_unit: 'ms',
      service_name: 'api',
      endpoint: '/api/payments',
      severity: 'warning'
    });
  }
  
  if (Math.random() < 0.05) { // 5% chance of high error rate
    metrics.push({
      metric_name: 'error_rate',
      metric_value: 7, // Above threshold
      metric_unit: 'percentage',
      service_name: 'api',
      severity: 'error'
    });
  }
  
  return metrics;
};

const generateErrorLogs = () => {
  const errorTypes = ['application', 'database', 'auth', 'payment'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const endpoints = ['/api/bookings', '/api/payments', '/api/auth/login', '/api/tenants'];
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  
  if (Math.random() < 0.3) { // 30% chance of generating an error
    return {
      error_type: errorTypes[Math.floor(Math.random() * errorTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      message: `Simulated error: ${Math.random() > 0.5 ? 'Connection timeout' : 'Validation failed'}`,
      endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
      method: methods[Math.floor(Math.random() * methods.length)],
      status_code: Math.random() > 0.7 ? 500 : (Math.random() > 0.5 ? 404 : 400),
      response_time_ms: Math.floor(Math.random() * 2000 + 100)
    };
  }
  
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("System monitoring function started");

    // Use service role key for system operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Generate and insert system metrics
    const metrics = generateMetrics();
    logStep("Generated metrics", { count: metrics.length });

    for (const metric of metrics) {
      const { error } = await supabaseClient.rpc('record_system_metric', {
        p_metric_name: metric.metric_name,
        p_metric_value: metric.metric_value,
        p_metric_unit: metric.metric_unit,
        p_service_name: metric.service_name,
        p_endpoint: metric.endpoint || null,
        p_status_code: null,
        p_severity: metric.severity,
        p_metadata: {}
      });
      
      if (error) {
        logStep("Error recording metric", { error: error.message });
      }
    }

    // Generate and insert database metrics
    const dbMetrics = [
      {
        metric_name: 'active_connections',
        metric_value: Math.floor(Math.random() * 20 + 5), // 5-25 connections
        connection_pool_size: 100,
        active_connections: Math.floor(Math.random() * 20 + 5),
        waiting_connections: Math.floor(Math.random() * 3)
      },
      {
        metric_name: 'cache_hit_ratio',
        metric_value: Math.random() * 10 + 90, // 90-100%
        table_name: 'bookings'
      }
    ];

    for (const dbMetric of dbMetrics) {
      const { error } = await supabaseClient
        .from('database_metrics')
        .insert(dbMetric);
      
      if (error) {
        logStep("Error recording database metric", { error: error.message });
      }
    }

    // Generate error logs occasionally
    const errorLog = generateErrorLogs();
    if (errorLog) {
      const { error } = await supabaseClient
        .from('error_logs')
        .insert(errorLog);
      
      if (error) {
        logStep("Error recording error log", { error: error.message });
      } else {
        logStep("Generated error log", { severity: errorLog.severity });
      }
    }

    // Calculate and record business metrics
    const businessMetrics = [
      {
        tenant_id: null, // System-wide metrics
        metric_name: 'booking_success_rate',
        metric_value: Math.random() * 5 + 95, // 95-100%
        metric_unit: 'percentage',
        period_start: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        period_end: new Date().toISOString()
      },
      {
        tenant_id: null,
        metric_name: 'payment_success_rate', 
        metric_value: Math.random() * 3 + 97, // 97-100%
        metric_unit: 'percentage',
        period_start: new Date(Date.now() - 3600000).toISOString(),
        period_end: new Date().toISOString()
      },
      {
        tenant_id: null,
        metric_name: 'user_activity',
        metric_value: Math.floor(Math.random() * 100 + 50), // 50-150 active users
        metric_unit: 'count',
        period_start: new Date(Date.now() - 3600000).toISOString(),
        period_end: new Date().toISOString()
      }
    ];

    for (const businessMetric of businessMetrics) {
      const { error } = await supabaseClient
        .from('business_metrics')
        .insert(businessMetric);
      
      if (error) {
        logStep("Error recording business metric", { error: error.message });
      }
    }

    logStep("System monitoring completed successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      metrics_recorded: metrics.length + dbMetrics.length + businessMetrics.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in system monitoring", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});