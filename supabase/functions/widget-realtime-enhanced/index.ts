import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, getCorsHeaders } from '../_shared/cors'

interface WidgetEvent {
  widget_id: string
  tenant_id: string
  event_type: 'view' | 'interaction' | 'conversion' | 'error' | 'performance'
  event_data: Record<string, any>
  user_session: string
  timestamp: string
  page_url?: string
  user_agent?: string
  performance_metrics?: {
    load_time: number
    render_time: number
    interaction_time: number
  }
}

interface RealtimeMetrics {
  active_sessions: number
  events_per_minute: number
  conversion_rate: number
  average_session_duration: number
  top_events: Array<{
    event_type: string
    count: number
    last_occurred: string
  }>
  performance_summary: {
    avg_load_time: number
    avg_render_time: number
    error_rate: number
  }
  // Enhanced metrics for enterprise monitoring
  connection_health: {
    healthy: number
    degraded: number
    unhealthy: number
    offline: number
  }
  batch_processing_stats: {
    activeBatches: number
    completedBatches: number
    failedBatches: number
    avgProcessingTime: number
  }
  realtime_performance: {
    avgResponseTime: number
    errorRate: number
    retryRate: number
    messagesThroughput: number
  }
}

interface ConnectionMetrics {
  connectionId: string
  channelName: string
  subscriptionType: string
  messagesReceived: number
  messagesSent: number
  avgResponseTime: number
  errorCount: number
  retryCount: number
  connectionQuality: string
  lastHeartbeat: string
  clientInfo?: any
}

interface BatchProcessingRequest {
  batchId: string
  operationType: 'subscribe' | 'unsubscribe' | 'bulk_update' | 'sync' | 'cleanup'
  items: Array<{
    id: string
    data: any
  }>
  tenantId: string
  clientInfo?: any
}

interface HealthStatusUpdate {
  tenantId: string
  subscriptionType: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline'
  activeConnections: number
  errorRate: number
  avgLatency: number
  details?: any
}

// Utility function to generate correlation IDs
function generateCorrelationId(): string {
  return 'rt_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
}

// Enhanced error handling with retry logic
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
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError!;
}

// Connection health assessment
function assessConnectionHealth(metrics: ConnectionMetrics): string {
  const { avgResponseTime, errorCount, messagesReceived, retryCount } = metrics;
  
  if (errorCount > messagesReceived * 0.1 || retryCount > 5) {
    return 'critical';
  } else if (avgResponseTime > 2000 || errorCount > 0) {
    return 'poor';
  } else if (avgResponseTime > 1000) {
    return 'good';
  } else {
    return 'excellent';
  }
}

// Batch processing handler
async function processBatch(
  supabaseClient: any,
  request: BatchProcessingRequest
): Promise<{ success: boolean; processedCount: number; errorCount: number; details: any }> {
  const startTime = Date.now();
  let processedCount = 0;
  let errorCount = 0;
  const errors: any[] = [];

  try {
    // Log batch start
    await supabaseClient
      .from("batch_processing_logs")
      .insert({
        tenant_id: request.tenantId,
        batch_id: request.batchId,
        operation_type: request.operationType,
        item_count: request.items.length,
        status: 'processing',
        client_info: request.clientInfo || {},
        batch_data: { operation: request.operationType, itemCount: request.items.length }
      });

    // Process items in chunks for better performance
    const chunkSize = 10;
    for (let i = 0; i < request.items.length; i += chunkSize) {
      const chunk = request.items.slice(i, i + chunkSize);
      
      try {
        // Process chunk based on operation type
        switch (request.operationType) {
          case 'subscribe':
            await handleSubscribeOperations(supabaseClient, request.tenantId, chunk);
            break;
          case 'unsubscribe':
            await handleUnsubscribeOperations(supabaseClient, request.tenantId, chunk);
            break;
          case 'bulk_update':
            await handleBulkUpdateOperations(supabaseClient, request.tenantId, chunk);
            break;
          case 'sync':
            await handleSyncOperations(supabaseClient, request.tenantId, chunk);
            break;
          case 'cleanup':
            await handleCleanupOperations(supabaseClient, request.tenantId, chunk);
            break;
        }
        
        processedCount += chunk.length;
        
        // Update progress
        const progressPercent = Math.round((processedCount / request.items.length) * 100);
        await supabaseClient
          .from("batch_processing_logs")
          .update({
            processed_count: processedCount,
            progress_percent: progressPercent,
            updated_at: new Date().toISOString()
          })
          .eq('batch_id', request.batchId);
          
      } catch (chunkError) {
        console.error(`Error processing chunk ${i}-${i+chunkSize}:`, chunkError);
        errorCount += chunk.length;
        errors.push({
          chunkStart: i,
          chunkEnd: i + chunkSize,
          error: chunkError instanceof Error ? chunkError.message : String(chunkError)
        });
      }
    }

    const processingTime = Date.now() - startTime;
    const finalStatus = errorCount === 0 ? 'completed' : (processedCount > 0 ? 'completed' : 'failed');

    // Update final batch status
    await supabaseClient
      .from("batch_processing_logs")
      .update({
        processed_count: processedCount,
        success_count: processedCount,
        error_count: errorCount,
        status: finalStatus,
        completed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        error_details: errors.length > 0 ? { errors } : {},
        progress_percent: 100
      })
      .eq('batch_id', request.batchId);

    return {
      success: errorCount === 0,
      processedCount,
      errorCount,
      details: {
        processingTimeMs: processingTime,
        errors: errors.length > 0 ? errors : undefined
      }
    };

  } catch (error) {
    console.error('Batch processing failed:', error);
    
    // Log failure
    await supabaseClient
      .from("batch_processing_logs")
      .update({
        status: 'failed',
        error_count: request.items.length,
        completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        error_details: { generalError: error instanceof Error ? error.message : String(error) }
      })
      .eq('batch_id', request.batchId);

    return {
      success: false,
      processedCount: 0,
      errorCount: request.items.length,
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

// Batch operation handlers
async function handleSubscribeOperations(supabaseClient: any, tenantId: string, items: any[]) {
  for (const item of items) {
    await supabaseClient
      .from("realtime_subscription_events")
      .insert({
        tenant_id: tenantId,
        connection_id: item.data.connectionId,
        event_type: 'subscription_started',
        channel_name: item.data.channelName,
        subscription_type: item.data.subscriptionType,
        message_data: item.data
      });
  }
}

async function handleUnsubscribeOperations(supabaseClient: any, tenantId: string, items: any[]) {
  for (const item of items) {
    await supabaseClient
      .from("realtime_subscription_events")
      .insert({
        tenant_id: tenantId,
        connection_id: item.data.connectionId,
        event_type: 'subscription_ended',
        channel_name: item.data.channelName,
        subscription_type: item.data.subscriptionType,
        message_data: item.data
      });
  }
}

async function handleBulkUpdateOperations(supabaseClient: any, tenantId: string, items: any[]) {
  // Process bulk updates for connection metrics
  for (const item of items) {
    if (item.data.connectionId) {
      await supabaseClient
        .from("realtime_connection_metrics")
        .upsert({
          tenant_id: tenantId,
          connection_id: item.data.connectionId,
          channel_name: item.data.channelName,
          subscription_type: item.data.subscriptionType,
          total_messages_received: item.data.messagesReceived || 0,
          total_messages_sent: item.data.messagesSent || 0,
          avg_response_time_ms: item.data.avgResponseTime || 0,
          error_count: item.data.errorCount || 0,
          retry_count: item.data.retryCount || 0,
          connection_quality: item.data.connectionQuality || 'good',
          last_heartbeat_at: new Date().toISOString(),
          client_info: item.data.clientInfo || {}
        }, {
          onConflict: 'connection_id'
        });
    }
  }
}

async function handleSyncOperations(supabaseClient: any, tenantId: string, items: any[]) {
  // Synchronize health status
  for (const item of items) {
    await supabaseClient
      .from("realtime_health_status")
      .upsert({
        tenant_id: tenantId,
        subscription_type: item.data.subscriptionType,
        status: item.data.status,
        active_connections: item.data.activeConnections || 0,
        success_rate: item.data.successRate || 1.0,
        avg_latency_ms: item.data.avgLatency || 0,
        error_rate: item.data.errorRate || 0,
        last_health_check_at: new Date().toISOString(),
        health_details: item.data.details || {}
      }, {
        onConflict: 'tenant_id,subscription_type'
      });
  }
}

async function handleCleanupOperations(supabaseClient: any, tenantId: string, items: any[]) {
  // Clean up old metrics and events
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  
  await supabaseClient
    .from("realtime_subscription_events")
    .delete()
    .eq('tenant_id', tenantId)
    .lt('created_at', cutoffDate.toISOString());
    
  await supabaseClient
    .from("realtime_connection_metrics")
    .delete()
    .eq('tenant_id', tenantId)
    .lt('created_at', cutoffDate.toISOString())
    .not('disconnected_at', 'is', null);
}

serve(async (req) => {
  // Get origin for CORS handling
  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin || undefined);
  
  // Handle CORS preflight requests FIRST - before any other logic
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request from origin:', origin);
    return new Response(null, { 
      status: 204, // Use 204 No Content for OPTIONS
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
    )

    const authHeader = req.headers.get('Authorization')
    const connectionId = req.headers.get('x-connection-id')
    const batchId = req.headers.get('x-batch-id')

    // Make authentication optional for realtime connections
    let user = null;
    let authValidated = false;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      
      if (!authError && authUser) {
        user = authUser;
        authValidated = true;
      }
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const widgetId = url.searchParams.get('widget_id')
    const tenantId = url.searchParams.get('tenant_id')

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenant_id parameter required', correlationId }),
        { 
          status: 400, 
          headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle POST requests with enhanced functionality
    if (req.method === 'POST') {
      const requestBody = await req.json();
      const { 
        batch_request,
        health_update,
        connection_metrics,
        event_data 
      } = requestBody;

      // Handle batch processing requests
      if (batch_request) {
        const batchResult = await processBatch(supabase, {
          ...batch_request,
          tenantId
        });

        return new Response(
          JSON.stringify({
            success: batchResult.success,
            correlationId,
            batch: {
              id: batch_request.batchId,
              processedCount: batchResult.processedCount,
              errorCount: batchResult.errorCount,
              details: batchResult.details
            }
          }),
          { 
            headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Handle health status updates
      if (health_update) {
        await executeWithRetry(async () => {
          await supabase
            .from("realtime_health_status")
            .upsert({
              tenant_id: tenantId,
              subscription_type: health_update.subscriptionType,
              status: health_update.status,
              active_connections: health_update.activeConnections || 0,
              error_rate: health_update.errorRate || 0,
              avg_latency_ms: health_update.avgLatency || 0,
              last_health_check_at: new Date().toISOString(),
              health_details: health_update.details || {}
            }, {
              onConflict: 'tenant_id,subscription_type'
            });
        });

        return new Response(
          JSON.stringify({
            success: true,
            correlationId,
            healthStatus: 'updated'
          }),
          { 
            headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Handle connection metrics updates
      if (connection_metrics) {
        const quality = assessConnectionHealth(connection_metrics);
        
        await executeWithRetry(async () => {
          await supabase
            .from("realtime_connection_metrics")
            .upsert({
              tenant_id: tenantId,
              connection_id: connection_metrics.connectionId,
              channel_name: connection_metrics.channelName,
              subscription_type: connection_metrics.subscriptionType,
              total_messages_received: connection_metrics.messagesReceived || 0,
              total_messages_sent: connection_metrics.messagesSent || 0,
              avg_response_time_ms: connection_metrics.avgResponseTime || 0,
              error_count: connection_metrics.errorCount || 0,
              retry_count: connection_metrics.retryCount || 0,
              connection_quality: quality,
              last_heartbeat_at: new Date().toISOString(),
              client_info: connection_metrics.clientInfo || {}
            }, {
              onConflict: 'connection_id'
            });
        });

        // Log the connection event
        await supabase
          .from("realtime_subscription_events")
          .insert({
            tenant_id: tenantId,
            connection_id: connection_metrics.connectionId,
            event_type: 'heartbeat',
            channel_name: connection_metrics.channelName,
            subscription_type: connection_metrics.subscriptionType,
            response_time_ms: connection_metrics.avgResponseTime,
            message_data: { quality, metrics: connection_metrics }
          });

        return new Response(
          JSON.stringify({
            success: true,
            correlationId,
            connectionHealth: quality
          }),
          { 
            headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Handle standard event tracking with enhanced logging
      if (event_data) {
        return await handleTrackEvent(req, supabase, tenantId, connectionId, correlationId);
      }
    }

    // Handle GET requests (existing functionality)
    switch (action) {
      case 'track_event':
        return await handleTrackEvent(req, supabase, tenantId, connectionId, correlationId)
      
      case 'get_realtime_metrics':
        return await getEnhancedRealtimeMetrics(supabase, tenantId, widgetId, correlationId)
      
      case 'get_live_sessions':
        return await getLiveSessions(supabase, tenantId, widgetId)
      
      case 'get_connection_health':
        return await getConnectionHealth(supabase, tenantId, correlationId)
      
      case 'get_batch_status':
        return await getBatchStatus(supabase, tenantId, batchId, correlationId)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action parameter', correlationId }),
          { 
            status: 400, 
            headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Widget realtime error:', error, 'correlationId:', correlationId);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        correlationId,
        processingTimeMs: processingTime
      }),
      { 
        status: 500, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleTrackEvent(req: Request, supabase: any, tenantId: string, connectionId?: string | null, correlationId?: string) {
  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin || undefined);
  
  const eventData: WidgetEvent = await req.json()
  
  // Validate required fields
  if (!eventData.widget_id || !eventData.event_type || !eventData.user_session) {
    return new Response(
      JSON.stringify({ error: 'Missing required event fields', correlationId }),
      { 
        status: 400, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Insert event into database with retry logic
  await executeWithRetry(async () => {
    await supabase
      .from('widget_events')
      .insert({
        widget_id: eventData.widget_id,
        tenant_id: tenantId,
        event_type: eventData.event_type,
        event_data: eventData.event_data,
        user_session: eventData.user_session,
        page_url: eventData.page_url,
        user_agent: eventData.user_agent,
        performance_metrics: eventData.performance_metrics,
        created_at: new Date().toISOString()
      });
  });

  // Log the event in the new events table if connection_id is provided
  if (connectionId) {
    await supabase
      .from("realtime_subscription_events")
      .insert({
        tenant_id: tenantId,
        connection_id: connectionId,
        event_type: eventData.event_type === 'conversion' ? 'message_received' : 'message_sent',
        event_timestamp: new Date().toISOString(),
        message_data: eventData.event_data || {},
        session_id: eventData.user_session
      });
  }

  // Trigger real-time update
  await supabase
    .channel(`widget_${eventData.widget_id}`)
    .send({
      type: 'broadcast',
      event: 'widget_event',
      payload: {
        widget_id: eventData.widget_id,
        event_type: eventData.event_type,
        timestamp: new Date().toISOString(),
        correlationId
      }
    })

  return new Response(
    JSON.stringify({ success: true, correlationId }),
    { 
      status: 200, 
      headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function getEnhancedRealtimeMetrics(supabase: any, tenantId: string, widgetId?: string | null, correlationId?: string): Promise<Response> {
  const responseHeaders = getCorsHeaders();
  
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  let query = supabase
    .from('widget_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', oneHourAgo.toISOString())

  if (widgetId) {
    query = query.eq('widget_id', widgetId)
  }

  const { data: events, error } = await query

  if (error) {
    console.error('Metrics query error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch metrics', correlationId }),
      { 
        status: 500, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Calculate standard metrics (existing logic)
  const activeSessions = new Set(events.map((e: any) => e.user_session)).size
  const eventsPerMinute = events.length / 60
  
  const conversions = events.filter((e: any) => e.event_type === 'conversion').length
  const views = events.filter((e: any) => e.event_type === 'view').length
  const conversionRate = views > 0 ? (conversions / views) * 100 : 0

  // Get enhanced metrics from new tables
  const [healthData, batchStats, connectionMetrics] = await Promise.all([
    supabase
      .from("realtime_health_status")
      .select("status")
      .eq("tenant_id", tenantId),
    
    supabase
      .from("batch_processing_logs")
      .select("status, processing_time_ms")
      .eq("tenant_id", tenantId)
      .gte("created_at", oneHourAgo.toISOString()),
    
    supabase
      .from("realtime_connection_metrics")
      .select("avg_response_time_ms, error_count, total_messages_received, retry_count")
      .eq("tenant_id", tenantId)
      .gte("last_heartbeat_at", oneHourAgo.toISOString())
  ]);

  // Process health data
  const healthCounts = { healthy: 0, degraded: 0, unhealthy: 0, offline: 0 };
  healthData.data?.forEach((h: any) => {
    healthCounts[h.status as keyof typeof healthCounts]++;
  });

  // Process batch stats
  const activeBatches = batchStats.data?.filter((b: any) => b.status === 'processing').length || 0;
  const completedBatches = batchStats.data?.filter((b: any) => b.status === 'completed').length || 0;
  const failedBatches = batchStats.data?.filter((b: any) => b.status === 'failed').length || 0;
  const avgProcessingTime = batchStats.data?.length > 0 
    ? batchStats.data.reduce((sum: number, b: any) => sum + (b.processing_time_ms || 0), 0) / batchStats.data.length 
    : 0;

  // Process connection metrics
  const connections = connectionMetrics.data || [];
  const avgResponseTime = connections.length > 0 
    ? connections.reduce((sum: number, c: any) => sum + (c.avg_response_time_ms || 0), 0) / connections.length 
    : 0;
  
  const totalMessages = connections.reduce((sum: number, c: any) => sum + (c.total_messages_received || 0), 0);
  const totalErrors = connections.reduce((sum: number, c: any) => sum + (c.error_count || 0), 0);
  const totalRetries = connections.reduce((sum: number, c: any) => sum + (c.retry_count || 0), 0);
  
  const errorRate = totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0;
  const retryRate = totalMessages > 0 ? (totalRetries / totalMessages) * 100 : 0;

  // Calculate session durations (existing logic)
  const sessionDurations = new Map<string, { start: Date; end: Date }>()
  events.forEach((event: any) => {
    const sessionId = event.user_session
    const eventTime = new Date(event.created_at)
    
    if (!sessionDurations.has(sessionId)) {
      sessionDurations.set(sessionId, { start: eventTime, end: eventTime })
    } else {
      const session = sessionDurations.get(sessionId)!
      if (eventTime < session.start) session.start = eventTime
      if (eventTime > session.end) session.end = eventTime
    }
  })

  const avgSessionDuration = sessionDurations.size > 0 
    ? Array.from(sessionDurations.values())
        .map(session => session.end.getTime() - session.start.getTime())
        .reduce((sum, duration) => sum + duration, 0) / sessionDurations.size / 1000 / 60 // minutes
    : 0;

  // Top events (existing logic)
  const eventCounts = new Map<string, number>()
  events.forEach((event: any) => {
    eventCounts.set(event.event_type, (eventCounts.get(event.event_type) || 0) + 1)
  })

  const topEvents = Array.from(eventCounts.entries())
    .map(([eventType, count]) => ({
      event_type: eventType,
      count,
      last_occurred: events
        .filter((e: any) => e.event_type === eventType)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at || ''
    }))
    .sort((a, b) => b.count - a.count)

  // Performance summary (existing logic)
  const performanceEvents = events.filter((e: any) => e.performance_metrics)
  const avgLoadTime = performanceEvents.length > 0 
    ? performanceEvents.reduce((sum: number, e: any) => sum + (e.performance_metrics?.load_time || 0), 0) / performanceEvents.length
    : 0

  const avgRenderTime = performanceEvents.length > 0
    ? performanceEvents.reduce((sum: number, e: any) => sum + (e.performance_metrics?.render_time || 0), 0) / performanceEvents.length
    : 0

  const errorEvents = events.filter((e: any) => e.event_type === 'error').length
  const performanceErrorRate = events.length > 0 ? (errorEvents / events.length) * 100 : 0

  const metrics: RealtimeMetrics = {
    active_sessions: activeSessions,
    events_per_minute: Math.round(eventsPerMinute * 100) / 100,
    conversion_rate: Math.round(conversionRate * 100) / 100,
    average_session_duration: Math.round(avgSessionDuration * 100) / 100,
    top_events: topEvents,
    performance_summary: {
      avg_load_time: Math.round(avgLoadTime),
      avg_render_time: Math.round(avgRenderTime),
      error_rate: Math.round(performanceErrorRate * 100) / 100
    },
    // Enhanced metrics
    connection_health: healthCounts,
    batch_processing_stats: {
      activeBatches,
      completedBatches,
      failedBatches,
      avgProcessingTime: Math.round(avgProcessingTime)
    },
    realtime_performance: {
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      retryRate: Math.round(retryRate * 100) / 100,
      messagesThroughput: Math.round(totalMessages / 60 * 100) / 100 // messages per minute
    }
  }

  return new Response(
    JSON.stringify({ ...metrics, correlationId }),
    { 
      status: 200, 
      headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function getLiveSessions(supabase: any, tenantId: string, widgetId?: string | null): Promise<Response> {
  const responseHeaders = getCorsHeaders();
  
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

  let query = supabase
    .from('widget_events')
    .select('user_session, page_url, user_agent, created_at, event_type')
    .eq('tenant_id', tenantId)
    .gte('created_at', fiveMinutesAgo.toISOString())

  if (widgetId) {
    query = query.eq('widget_id', widgetId)
  }

  const { data: events, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Live sessions query error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch live sessions' }),
      { 
        status: 500, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Group by session and get latest activity
  const sessions = new Map()
  events.forEach((event: any) => {
    const sessionId = event.user_session
    if (!sessions.has(sessionId) || new Date(event.created_at) > new Date(sessions.get(sessionId).last_activity)) {
      sessions.set(sessionId, {
        session_id: sessionId,
        page_url: event.page_url,
        user_agent: event.user_agent,
        last_activity: event.created_at,
        last_event_type: event.event_type
      })
    }
  })

  const liveSessions = Array.from(sessions.values())
    .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())

  return new Response(
    JSON.stringify(liveSessions),
    { 
      status: 200, 
      headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function getConnectionHealth(supabase: any, tenantId: string, correlationId?: string): Promise<Response> {
  const responseHeaders = getCorsHeaders();
  
  const { data: healthData, error } = await supabase
    .from("realtime_health_status")
    .select("*")
    .eq("tenant_id", tenantId);

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch connection health', correlationId }),
      { 
        status: 500, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ health: healthData || [], correlationId }),
    { 
      status: 200, 
      headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function getBatchStatus(supabase: any, tenantId: string, batchId?: string | null, correlationId?: string): Promise<Response> {
  const responseHeaders = getCorsHeaders();
  
  if (!batchId) {
    return new Response(
      JSON.stringify({ error: 'batch_id required', correlationId }),
      { 
        status: 400, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const { data: batchData, error } = await supabase
    .from("batch_processing_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("batch_id", batchId)
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch batch status', correlationId }),
      { 
        status: 500, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ batch: batchData, correlationId }),
    { 
      status: 200, 
      headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
    }
  );
}