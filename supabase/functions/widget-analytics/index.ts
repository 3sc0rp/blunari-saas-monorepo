/// <reference path="./types.d.ts" />

// @ts-ignore - Deno ESM imports are not recognized by standard TypeScript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// @ts-ignore - .ts extension required for Deno
import { corsHeaders } from '../_shared/cors.ts';

const FUNCTION_VERSION = '2025-10-13.1'; // Updated for real-time data fetching

interface WidgetAnalyticsRequest {
  tenantId: string;
  widgetType: 'booking' | 'catering';
  timeRange?: '1d' | '7d' | '30d';
  version?: string;
}

interface ErrorResponse {
  success: false;
  code: string;
  error: string;
  details?: any;
  correlationId: string;
}

interface SuccessResponse {
  success: true;
  data: any;
  meta: {
    tenantId: string;
    widgetType: string;
    timeRange: string;
    authMethod: 'anonymous' | 'authenticated';
    generatedAt: string;
    durationMs: number;
    version: string;
    correlationId: string;
    estimation?: Record<string, boolean>;
  };
}

// @ts-ignore - Deno.serve is available in Deno runtime
Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
  const origin = req.headers.get('origin') || '';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        ...corsHeaders,
        'x-correlation-id': correlationId 
      } 
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    const errorResponse: ErrorResponse = {
      success: false,
      code: 'METHOD_NOT_ALLOWED',
      error: 'Only POST method is allowed',
      correlationId
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 405,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'x-correlation-id': correlationId
      }
    });
  }

  try {
    // Parse request body
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'UNSUPPORTED_MEDIA_TYPE',
        error: 'Content-Type must be application/json',
        details: { received: contentType },
        correlationId
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 415,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId
        }
      });
    }

    const body = await req.text();
    if (!body || body.trim() === '') {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'EMPTY_BODY',
        error: 'Request body is empty',
        correlationId
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId
        }
      });
    }

    let requestData: WidgetAnalyticsRequest;
    try {
      requestData = JSON.parse(body);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'JSON_PARSE_ERROR',
        error: 'Invalid JSON in request body',
        details: { message: errorMessage },
        correlationId
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId
        }
      });
    }

    // Validate request data
    if (typeof requestData !== 'object' || requestData === null) {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'INVALID_BODY',
        error: 'Request body must be an object',
        details: { received: typeof requestData },
        correlationId
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId
        }
      });
    }

    // Validate tenantId
    if (!requestData.tenantId || requestData.tenantId.trim() === '') {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'MISSING_TENANT_ID',
        error: 'Missing or invalid required parameter: tenantId',
        details: { received: requestData.tenantId, type: typeof requestData.tenantId },
        correlationId
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId
        }
      });
    }

    // Validate tenantId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(requestData.tenantId)) {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'INVALID_TENANT_ID',
        error: 'tenantId must be a valid UUID',
        details: { received: requestData.tenantId },
        correlationId
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId
        }
      });
    }

    // Validate widgetType
    if (!requestData.widgetType || requestData.widgetType.trim() === '') {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'MISSING_WIDGET_TYPE',
        error: 'Missing or invalid required parameter: widgetType',
        details: { received: requestData.widgetType },
        correlationId
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId
        }
      });
    }

    if (!['booking', 'catering'].includes(requestData.widgetType)) {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'INVALID_WIDGET_TYPE',
        error: 'widgetType must be "booking" or "catering"',
        details: { received: requestData.widgetType },
        correlationId
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId
        }
      });
    }

    // Validate timeRange
    const timeRange = requestData.timeRange || '7d';
    if (!['1d', '7d', '30d'].includes(timeRange)) {
      const errorResponse: ErrorResponse = {
        success: false,
        code: 'INVALID_TIME_RANGE',
        error: 'timeRange must be "1d", "7d", or "30d"',
        details: { received: timeRange },
        correlationId
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId
        }
      });
    }

    // Determine auth method
    const authHeader = req.headers.get('authorization');
    const authMethod = authHeader && authHeader.startsWith('Bearer ') ? 'authenticated' : 'anonymous';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate analytics data
    const analyticsData = await generateAnalytics(
      supabase,
      requestData.tenantId,
      requestData.widgetType,
      timeRange
    );

    const durationMs = Date.now() - startTime;

    const response: SuccessResponse = {
      success: true,
      data: analyticsData.data,
      meta: {
        tenantId: requestData.tenantId,
        widgetType: requestData.widgetType,
        timeRange,
        authMethod,
        generatedAt: new Date().toISOString(),
        durationMs,
        version: FUNCTION_VERSION,
        correlationId,
        estimation: analyticsData.estimation
      }
    };

    // Log to database (optional)
    try {
      await supabase.from('widget_analytics_logs').insert({
        correlation_id: correlationId,
        tenant_id: requestData.tenantId,
        widget_type: requestData.widgetType,
        time_range: timeRange,
        auth_method: authMethod,
        duration_ms: durationMs,
        success: true,
        request_origin: origin,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });
    } catch (logError) {
      console.warn('Failed to log analytics request:', logError);
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'x-correlation-id': correlationId
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorResponse: ErrorResponse = {
      success: false,
      code: 'INTERNAL_ERROR',
      error: 'An unexpected error occurred',
      details: { message: errorMessage },
      correlationId
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'x-correlation-id': correlationId
      }
    });
  }
});

async function generateAnalytics(
  supabase: any,
  tenantId: string,
  widgetType: string,
  timeRange: string
) {
  const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Fetch real-time bookings data
  const tableName = widgetType === 'booking' ? 'bookings' : 'catering_orders';
  const { data: bookings, error: bookingsError } = await supabase
    .from(tableName)
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (bookingsError) {
    console.error(`Error fetching ${tableName}:`, bookingsError);
    throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
  }

  // Fetch widget_events for views and interactions
  const { data: widgetEvents, error: eventsError } = await supabase
    .from('widget_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('widget_type', widgetType)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (eventsError) {
    console.error('Error fetching widget events:', eventsError);
  }

  // Calculate real-time metrics from actual data
  const totalBookings = bookings?.length || 0;
  const totalViews = widgetEvents?.filter((e: any) => e.event_type === 'view' || e.event_type === 'load').length || 0;
  const totalClicks = widgetEvents?.filter((e: any) => e.event_type === 'click' || e.event_type === 'interaction').length || 0;
  
  // Real completion rate from actual bookings
  const completedBookings = bookings?.filter((b: any) => 
    b.status === 'completed' || b.status === 'confirmed'
  ).length || 0;
  const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

  // Real conversion rate (bookings / views)
  const conversionRate = totalViews > 0 ? (totalBookings / totalViews) * 100 : 0;

  // Calculate real average party size from bookings
  let avgPartySize = null;
  if (widgetType === 'booking' && bookings && bookings.length > 0) {
    const partySizes = bookings
      .map((b: any) => b.party_size || b.guest_count || 0)
      .filter((s: number) => s > 0);
    
    if (partySizes.length > 0) {
      avgPartySize = partySizes.reduce((a: number, b: number) => a + b, 0) / partySizes.length;
    }
  }

  // Calculate real average order value from catering orders
  let avgOrderValue = null;
  if (widgetType === 'catering' && bookings && bookings.length > 0) {
    const orderValues = bookings
      .map((b: any) => parseFloat(b.total_amount) || parseFloat(b.amount) || 0)
      .filter((v: number) => v > 0);
    
    if (orderValues.length > 0) {
      avgOrderValue = orderValues.reduce((a: number, b: number) => a + b, 0) / orderValues.length;
    }
  }

  // Calculate real session duration from widget events
  let avgSessionDuration = 0;
  const sessionEvents = widgetEvents?.filter((e: any) => e.session_duration && e.session_duration > 0) || [];
  if (sessionEvents.length > 0) {
    const totalDuration = sessionEvents.reduce((sum: number, e: any) => sum + (e.session_duration || 0), 0);
    avgSessionDuration = Math.round(totalDuration / sessionEvents.length);
  }

  // Generate daily stats from real data
  const dailyStats = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateStr = date.toISOString().split('T')[0];

    const dayViews = widgetEvents?.filter((e: any) => 
      (e.event_type === 'view' || e.event_type === 'load') && e.created_at.startsWith(dateStr)
    ).length || 0;

    const dayClicks = widgetEvents?.filter((e: any) => 
      (e.event_type === 'click' || e.event_type === 'interaction') && e.created_at.startsWith(dateStr)
    ).length || 0;

    const dayBookings = bookings?.filter((b: any) => 
      b.created_at.startsWith(dateStr)
    ).length || 0;

    dailyStats.push({
      date: dateStr,
      views: dayViews,
      clicks: dayClicks,
      bookings: dayBookings,
      conversionRate: dayViews > 0 ? (dayBookings / dayViews) * 100 : 0
    });
  }

  // Top traffic sources from real widget events
  const sources = widgetEvents?.map((e: any) => e.source || e.referrer || 'direct') || [];
  const sourceCounts: Record<string, number> = {};
  sources.forEach((s: string) => {
    sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  });
  const topSources = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));

  // Peak booking hours from real booking data
  let peakHours = null;
  if (widgetType === 'booking' && bookings && bookings.length > 0) {
    const hourCounts: Record<number, number> = {};
    bookings.forEach((b: any) => {
      const bookingTime = b.booking_time || b.reservation_time || b.created_at;
      if (bookingTime) {
        const hour = new Date(bookingTime).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), bookings: count }));
  }

  return {
    data: {
      totalViews,
      totalClicks,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      avgSessionDuration,
      totalBookings,
      completionRate: parseFloat(completionRate.toFixed(2)),
      avgPartySize: avgPartySize ? parseFloat(avgPartySize.toFixed(1)) : null,
      avgOrderValue: avgOrderValue ? parseFloat(avgOrderValue.toFixed(2)) : null,
      peakHours,
      topSources: topSources.length > 0 ? topSources : [],
      dailyStats
    },
    estimation: undefined // No estimations - all real-time data
  };
}
