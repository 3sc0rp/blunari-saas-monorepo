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
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const widgetId = url.searchParams.get('widget_id')
    const tenantId = url.searchParams.get('tenant_id')

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenant_id parameter required' }),
        { 
          status: 400, 
          headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    switch (action) {
      case 'track_event':
        return await handleTrackEvent(req, supabase, tenantId)
      
      case 'get_realtime_metrics':
        return await getRealtimeMetrics(supabase, tenantId, widgetId)
      
      case 'get_live_sessions':
        return await getLiveSessions(supabase, tenantId, widgetId)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action parameter' }),
          { 
            status: 400, 
            headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    console.error('Widget realtime error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleTrackEvent(req: Request, supabase: any, tenantId: string) {
  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin || undefined);
  
  const eventData: WidgetEvent = await req.json()
  
  // Validate required fields
  if (!eventData.widget_id || !eventData.event_type || !eventData.user_session) {
    return new Response(
      JSON.stringify({ error: 'Missing required event fields' }),
      { 
        status: 400, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Insert event into database
  const { error: insertError } = await supabase
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
    })

  if (insertError) {
    console.error('Event insertion error:', insertError)
    return new Response(
      JSON.stringify({ error: 'Failed to track event' }),
      { 
        status: 500, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    )
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
        timestamp: new Date().toISOString()
      }
    })

  return new Response(
    JSON.stringify({ success: true }),
    { 
      status: 200, 
      headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function getRealtimeMetrics(supabase: any, tenantId: string, widgetId?: string | null): Promise<Response> {
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
      JSON.stringify({ error: 'Failed to fetch metrics' }),
      { 
        status: 500, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Calculate real-time metrics
  const activeSessions = new Set(events.map((e: any) => e.user_session)).size
  const eventsPerMinute = events.length / 60
  
  const conversions = events.filter((e: any) => e.event_type === 'conversion').length
  const views = events.filter((e: any) => e.event_type === 'view').length
  const conversionRate = views > 0 ? (conversions / views) * 100 : 0

  // Calculate session durations
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

  const avgSessionDuration = Array.from(sessionDurations.values())
    .map(session => session.end.getTime() - session.start.getTime())
    .reduce((sum, duration) => sum + duration, 0) / sessionDurations.size / 1000 / 60 // minutes

  // Top events
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

  // Performance summary
  const performanceEvents = events.filter((e: any) => e.performance_metrics)
  const avgLoadTime = performanceEvents.length > 0 
    ? performanceEvents.reduce((sum: number, e: any) => sum + (e.performance_metrics?.load_time || 0), 0) / performanceEvents.length
    : 0

  const avgRenderTime = performanceEvents.length > 0
    ? performanceEvents.reduce((sum: number, e: any) => sum + (e.performance_metrics?.render_time || 0), 0) / performanceEvents.length
    : 0

  const errorEvents = events.filter((e: any) => e.event_type === 'error').length
  const errorRate = events.length > 0 ? (errorEvents / events.length) * 100 : 0

  const metrics: RealtimeMetrics = {
    active_sessions: activeSessions,
    events_per_minute: Math.round(eventsPerMinute * 100) / 100,
    conversion_rate: Math.round(conversionRate * 100) / 100,
    average_session_duration: Math.round(avgSessionDuration * 100) / 100,
    top_events: topEvents,
    performance_summary: {
      avg_load_time: Math.round(avgLoadTime),
      avg_render_time: Math.round(avgRenderTime),
      error_rate: Math.round(errorRate * 100) / 100
    }
  }

  return new Response(
    JSON.stringify(metrics),
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
