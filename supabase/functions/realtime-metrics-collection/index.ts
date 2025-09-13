import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-connection-id, x-correlation-id, x-widget-version, x-widget-id, x-tenant-id, x-batch-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers': 'x-correlation-id, content-type',
  'Access-Control-Allow-Credentials': 'false'
}

function getCorsHeaders(origin?: string) {
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin || '*'
  }
}

interface MetricsCollectionRequest {
  tenantId: string
  connectionId: string
  subscriptionType: 'orders' | 'menu_items' | 'reservations' | 'custom'
  metrics: {
    messagesReceived: number
    messagesSent: number
    avgResponseTime: number
    errorCount: number
    retryCount: number
    bytesTransferred: number
    packetLoss?: number
  }
  healthData?: {
    cpuUsage?: number
    memoryUsage?: number
    connectionCount?: number
    lastError?: string
  }
  clientInfo?: {
    userAgent?: string
    platform?: string
    connectionType?: string
    networkSpeed?: string
  }
}

interface HealthCheckRequest {
  tenantId: string
  subscriptionTypes: string[]
  performDiagnostics?: boolean
}

interface AlertConfiguration {
  tenantId: string
  subscriptionType: string
  thresholds: {
    errorRateThreshold: number
    responseTimeThreshold: number
    connectionCountThreshold: number
    memoryUsageThreshold: number
  }
  notificationChannels: string[]
}

// Utility functions
function generateCorrelationId(): string {
  return 'rmc_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
}

function calculateHealthScore(metrics: any): number {
  const weights = {
    responseTime: 0.3,
    errorRate: 0.4,
    connectionStability: 0.2,
    resourceUsage: 0.1
  };

  // Response time score (lower is better)
  const responseTimeScore = Math.max(0, 100 - (metrics.avgResponseTime / 50)); // 50ms = 100 points

  // Error rate score (lower is better)
  const errorRateScore = Math.max(0, 100 - (metrics.errorRate * 10)); // 10% error = 0 points

  // Connection stability score
  const stabilityScore = Math.max(0, 100 - (metrics.retryCount * 5)); // Each retry reduces score

  // Resource usage score
  const resourceScore = Math.max(0, 100 - (metrics.memoryUsage || 0)); // Percentage

  const totalScore = 
    (responseTimeScore * weights.responseTime) +
    (errorRateScore * weights.errorRate) +
    (stabilityScore * weights.connectionStability) +
    (resourceScore * weights.resourceUsage);

  return Math.round(totalScore);
}

function determineHealthStatus(healthScore: number, errorRate: number, avgResponseTime: number): string {
  if (healthScore >= 80 && errorRate < 0.05 && avgResponseTime < 1000) {
    return 'healthy';
  } else if (healthScore >= 60 && errorRate < 0.15 && avgResponseTime < 2000) {
    return 'degraded';
  } else if (healthScore >= 30 && errorRate < 0.30 && avgResponseTime < 5000) {
    return 'unhealthy';
  } else {
    return 'offline';
  }
}

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Retry attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError!;
}

async function collectConnectionMetrics(
  supabase: any,
  request: MetricsCollectionRequest,
  correlationId: string
): Promise<{ success: boolean; healthScore: number; status: string; details?: any }> {
  try {
    const now = new Date().toISOString();
    const { tenantId, connectionId, subscriptionType, metrics, healthData, clientInfo } = request;

    // Calculate connection quality and health score
    const errorRate = metrics.messagesReceived > 0 ? metrics.errorCount / metrics.messagesReceived : 0;
    const healthScore = calculateHealthScore({
      avgResponseTime: metrics.avgResponseTime,
      errorRate,
      retryCount: metrics.retryCount,
      memoryUsage: healthData?.memoryUsage || 0
    });

    const connectionQuality = healthScore >= 80 ? 'excellent' : 
                             healthScore >= 60 ? 'good' : 
                             healthScore >= 40 ? 'poor' : 'critical';

    // Update connection metrics
    await executeWithRetry(async () => {
      await supabase
        .from('realtime_connection_metrics')
        .upsert({
          tenant_id: tenantId,
          connection_id: connectionId,
          channel_name: `${subscriptionType}_${tenantId}`,
          subscription_type: subscriptionType,
          total_messages_received: metrics.messagesReceived,
          total_messages_sent: metrics.messagesSent,
          avg_response_time_ms: metrics.avgResponseTime,
          error_count: metrics.errorCount,
          retry_count: metrics.retryCount,
          connection_quality: connectionQuality,
          bandwidth_usage_kb: metrics.bytesTransferred / 1024,
          packet_loss_rate: metrics.packetLoss || 0,
          last_heartbeat_at: now,
          client_info: clientInfo || {},
          connection_meta: {
            healthScore,
            errorRate: Math.round(errorRate * 10000) / 100, // Convert to percentage
            correlationId
          },
          updated_at: now
        }, {
          onConflict: 'connection_id'
        });
    });

    // Log the metrics collection event
    await supabase
      .from('realtime_subscription_events')
      .insert({
        tenant_id: tenantId,
        connection_id: connectionId,
        event_type: 'heartbeat',
        channel_name: `${subscriptionType}_${tenantId}`,
        subscription_type: subscriptionType,
        response_time_ms: metrics.avgResponseTime,
        message_data: {
          healthScore,
          connectionQuality,
          metrics,
          correlationId
        }
      });

    // Update aggregated health status
    const healthStatus = determineHealthStatus(healthScore, errorRate, metrics.avgResponseTime);
    await updateAggregatedHealthStatus(supabase, tenantId, subscriptionType, healthStatus, correlationId);

    // Check alert thresholds
    await checkAlertThresholds(supabase, tenantId, subscriptionType, {
      errorRate,
      avgResponseTime: metrics.avgResponseTime,
      connectionCount: 1, // This would be calculated from active connections
      healthScore
    }, correlationId);

    return {
      success: true,
      healthScore,
      status: healthStatus,
      details: {
        connectionQuality,
        errorRate: Math.round(errorRate * 10000) / 100,
        correlationId
      }
    };

  } catch (error) {
    console.error('Metrics collection failed:', error, 'correlationId:', correlationId);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      healthScore: 0,
      status: 'offline',
      details: { error: errorMessage, correlationId }
    };
  }
}

async function updateAggregatedHealthStatus(
  supabase: any,
  tenantId: string,
  subscriptionType: string,
  status: string,
  correlationId: string
) {
  try {
    // Get current metrics for this tenant and subscription type
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: connections } = await supabase
      .from('realtime_connection_metrics')
      .select('avg_response_time_ms, error_count, total_messages_received, connection_quality')
      .eq('tenant_id', tenantId)
      .eq('subscription_type', subscriptionType)
      .gte('last_heartbeat_at', oneHourAgo);

    const activeConnections = connections?.length || 0;
    const healthyConnections = connections?.filter((c: any) => 
      c.connection_quality === 'excellent' || c.connection_quality === 'good'
    ).length || 0;

    const avgLatency = connections?.length > 0 
      ? connections.reduce((sum: number, c: any) => sum + (c.avg_response_time_ms || 0), 0) / connections.length
      : 0;

    const totalMessages = connections?.reduce((sum: number, c: any) => sum + (c.total_messages_received || 0), 0) || 0;
    const totalErrors = connections?.reduce((sum: number, c: any) => sum + (c.error_count || 0), 0) || 0;
    const errorRate = totalMessages > 0 ? totalErrors / totalMessages : 0;

    const successRate = activeConnections > 0 ? healthyConnections / activeConnections : 0;

    await executeWithRetry(async () => {
      await supabase
        .from('realtime_health_status')
        .upsert({
          tenant_id: tenantId,
          subscription_type: subscriptionType,
          status,
          active_connections: activeConnections,
          success_rate: successRate,
          avg_latency_ms: avgLatency,
          error_rate: errorRate,
          last_health_check_at: new Date().toISOString(),
          health_details: {
            healthyConnections,
            totalConnections: activeConnections,
            avgLatency,
            errorRate: Math.round(errorRate * 10000) / 100,
            correlationId
          }
        }, {
          onConflict: 'tenant_id,subscription_type'
        });
    });

  } catch (error) {
    console.error('Failed to update aggregated health status:', error, 'correlationId:', correlationId);
  }
}

async function checkAlertThresholds(
  supabase: any,
  tenantId: string,
  subscriptionType: string,
  metrics: any,
  correlationId: string
) {
  try {
    // Get alert configuration for this tenant and subscription type
    const { data: alertRules } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('subscription_type', subscriptionType)
      .eq('enabled', true);

    if (!alertRules || alertRules.length === 0) {
      return; // No alert rules configured
    }

    for (const rule of alertRules) {
      let shouldAlert = false;
      let alertMessage = '';

      switch (rule.metric_name) {
        case 'error_rate':
          if (metrics.errorRate > rule.threshold_value / 100) {
            shouldAlert = true;
            alertMessage = `Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold ${rule.threshold_value}%`;
          }
          break;
        case 'response_time':
          if (metrics.avgResponseTime > rule.threshold_value) {
            shouldAlert = true;
            alertMessage = `Response time ${metrics.avgResponseTime}ms exceeds threshold ${rule.threshold_value}ms`;
          }
          break;
        case 'health_score':
          if (metrics.healthScore < rule.threshold_value) {
            shouldAlert = true;
            alertMessage = `Health score ${metrics.healthScore} below threshold ${rule.threshold_value}`;
          }
          break;
      }

      if (shouldAlert) {
        // Create alert instance
        await supabase
          .from('alert_instances')
          .insert({
            tenant_id: tenantId,
            rule_id: rule.id,
            subscription_type: subscriptionType,
            severity: rule.severity,
            message: alertMessage,
            metric_value: metrics[rule.metric_name.replace('_', '')],
            threshold_value: rule.threshold_value,
            correlation_id: correlationId,
            created_at: new Date().toISOString()
          });

        console.log(`Alert triggered for ${tenantId}:`, alertMessage, 'correlationId:', correlationId);
      }
    }

  } catch (error) {
    console.error('Failed to check alert thresholds:', error, 'correlationId:', correlationId);
  }
}

async function performHealthCheck(
  supabase: any,
  request: HealthCheckRequest,
  correlationId: string
): Promise<{ success: boolean; healthData: any; diagnostics?: any }> {
  try {
    const { tenantId, subscriptionTypes, performDiagnostics } = request;
    const healthData: any = {};

    for (const subscriptionType of subscriptionTypes) {
      // Get recent connection metrics
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const [connectionsResult, healthResult, eventsResult] = await Promise.all([
        supabase
          .from('realtime_connection_metrics')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('subscription_type', subscriptionType)
          .gte('last_heartbeat_at', oneHourAgo),
        
        supabase
          .from('realtime_health_status')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('subscription_type', subscriptionType)
          .single(),
        
        supabase
          .from('realtime_subscription_events')
          .select('event_type, created_at')
          .eq('tenant_id', tenantId)
          .eq('subscription_type', subscriptionType)
          .gte('event_timestamp', oneHourAgo)
      ]);

      const connections = connectionsResult.data || [];
      const health = healthResult.data;
      const events = eventsResult.data || [];

      // Calculate real-time metrics
      const activeConnections = connections.filter((c: any) => 
        new Date(c.last_heartbeat_at) > new Date(Date.now() - 5 * 60 * 1000)
      ).length;

      const avgResponseTime = connections.length > 0 
        ? connections.reduce((sum: number, c: any) => sum + (c.avg_response_time_ms || 0), 0) / connections.length
        : 0;

      const totalMessages = connections.reduce((sum: number, c: any) => sum + (c.total_messages_received || 0), 0);
      const totalErrors = connections.reduce((sum: number, c: any) => sum + (c.error_count || 0), 0);
      const errorRate = totalMessages > 0 ? totalErrors / totalMessages : 0;

      const healthScore = calculateHealthScore({
        avgResponseTime,
        errorRate,
        retryCount: connections.reduce((sum: number, c: any) => sum + (c.retry_count || 0), 0),
        memoryUsage: 0 // Would be collected from actual metrics
      });

      healthData[subscriptionType] = {
        status: health?.status || 'unknown',
        activeConnections,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 10000) / 100,
        healthScore,
        eventCount: events.length,
        lastUpdate: health?.last_health_check_at || new Date().toISOString(),
        connectionQuality: {
          excellent: connections.filter((c: any) => c.connection_quality === 'excellent').length,
          good: connections.filter((c: any) => c.connection_quality === 'good').length,
          poor: connections.filter((c: any) => c.connection_quality === 'poor').length,
          critical: connections.filter((c: any) => c.connection_quality === 'critical').length
        }
      };
    }

    let diagnostics = undefined;
    if (performDiagnostics) {
      diagnostics = await runDiagnostics(supabase, tenantId, correlationId);
    }

    return {
      success: true,
      healthData,
      diagnostics
    };

  } catch (error) {
    console.error('Health check failed:', error, 'correlationId:', correlationId);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      healthData: {},
      diagnostics: { error: errorMessage }
    };
  }
}

async function runDiagnostics(
  supabase: any,
  tenantId: string,
  correlationId: string
): Promise<any> {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    correlationId,
    tests: []
  };

  // Database connectivity test
  try {
    const start = Date.now();
    await supabase.from('tenants').select('id').eq('id', tenantId).single();
    diagnostics.tests.push({
      name: 'database_connectivity',
      status: 'passed',
      responseTime: Date.now() - start,
      message: 'Database connection successful'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    diagnostics.tests.push({
      name: 'database_connectivity',
      status: 'failed',
      error: errorMessage,
      message: 'Database connection failed'
    });
  }

  // Realtime channel test
  try {
    const start = Date.now();
    const channel = supabase.channel(`test_${correlationId}`);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Channel connection timeout')), 5000);
      channel.on('system', {}, () => {
        clearTimeout(timeout);
        resolve(true);
      }).subscribe();
    });
    diagnostics.tests.push({
      name: 'realtime_channel',
      status: 'passed',
      responseTime: Date.now() - start,
      message: 'Realtime channel connection successful'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    diagnostics.tests.push({
      name: 'realtime_channel',
      status: 'failed',
      error: errorMessage,
      message: 'Realtime channel connection failed'
    });
  }

  // Memory and performance test
  const memoryUsage = (performance as any).memory ? {
    used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
    total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
    limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
  } : null;

  diagnostics.tests.push({
    name: 'memory_usage',
    status: memoryUsage && memoryUsage.used < memoryUsage.limit * 0.8 ? 'passed' : 'warning',
    data: memoryUsage,
    message: memoryUsage ? `Memory usage: ${memoryUsage.used}MB / ${memoryUsage.limit}MB` : 'Memory metrics unavailable'
  });

  return diagnostics;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin || undefined);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: responseHeaders 
    });
  }

  const correlationId = generateCorrelationId();
  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (req.method === 'POST') {
      const requestBody = await req.json();

      switch (action) {
        case 'collect_metrics':
          const metricsResult = await collectConnectionMetrics(supabase, requestBody, correlationId);
          return new Response(
            JSON.stringify({
              success: metricsResult.success,
              correlationId,
              healthScore: metricsResult.healthScore,
              status: metricsResult.status,
              details: metricsResult.details,
              processingTimeMs: Date.now() - startTime
            }),
            { 
              status: metricsResult.success ? 200 : 500,
              headers: { ...responseHeaders, 'Content-Type': 'application/json' }
            }
          );

        case 'health_check':
          const healthResult = await performHealthCheck(supabase, requestBody, correlationId);
          return new Response(
            JSON.stringify({
              success: healthResult.success,
              correlationId,
              health: healthResult.healthData,
              diagnostics: healthResult.diagnostics,
              processingTimeMs: Date.now() - startTime
            }),
            { 
              status: healthResult.success ? 200 : 500,
              headers: { ...responseHeaders, 'Content-Type': 'application/json' }
            }
          );

        case 'configure_alerts':
          // Handle alert configuration
          await supabase
            .from('alert_rules')
            .upsert(requestBody, { onConflict: 'tenant_id,subscription_type,metric_name' });
          
          return new Response(
            JSON.stringify({
              success: true,
              correlationId,
              message: 'Alert configuration updated',
              processingTimeMs: Date.now() - startTime
            }),
            { 
              headers: { ...responseHeaders, 'Content-Type': 'application/json' }
            }
          );

        default:
          return new Response(
            JSON.stringify({ 
              error: 'Invalid action', 
              correlationId,
              availableActions: ['collect_metrics', 'health_check', 'configure_alerts']
            }),
            { 
              status: 400,
              headers: { ...responseHeaders, 'Content-Type': 'application/json' }
            }
          );
      }
    }

    return new Response(
      JSON.stringify({ 
        error: 'Method not allowed', 
        correlationId,
        allowedMethods: ['POST', 'OPTIONS']
      }),
      { 
        status: 405,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Realtime metrics collection error:', error, 'correlationId:', correlationId);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        correlationId,
        message: errorMessage,
        processingTimeMs: processingTime
      }),
      { 
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});