import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const createCorsHeaders = (requestOrigin: string | null = null) => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  const normalize = (origin: string | null) => { try { if (!origin) return null; const u = new URL(origin); return `${u.protocol}//${u.host}`; } catch { return null; } };
  const origin = normalize(requestOrigin);
  const isAllowed = (o: string | null) => {
    if (!o) return false;
    try { const { hostname, protocol } = new URL(o); if (protocol !== 'https:') return false; if (hostname.endsWith('.blunari.ai') || ['app.blunari.ai','demo.blunari.ai','admin.blunari.ai','services.blunari.ai','blunari.ai','www.blunari.ai'].includes(hostname)) return true; return false; } catch { return false; }
  };

  let allowedOrigin = '*';
  if (environment === 'production') {
    allowedOrigin = isAllowed(origin) ? (origin as string) : 'https://app.blunari.ai';
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, x-correlation-id, accept, accept-language, content-length',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
};

// Helper functions for CORS responses
function createCorsResponse(data: any, requestOrigin: string | null = null) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...createCorsHeaders(requestOrigin),
    },
  });
}

function createErrorResponse(code: string, message: string, status: number, requestOrigin: string | null = null) {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...createCorsHeaders(requestOrigin),
    },
  });
}

// Type definitions
interface KpiRequest {
  date: string; // YYYY-MM-DD format
}

interface Booking {
  id: string;
  tenant_id: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  party_size: number;
  duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

interface KpiData {
  id: string;
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'default';
  spark: number[];
  hint: string;
  format: 'percentage' | 'number';
}

serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: createCorsHeaders(requestOrigin) });
  }

  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return createErrorResponse('METHOD_NOT_ALLOWED', 'Only GET and POST requests are allowed', 405, requestOrigin);
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return createErrorResponse('CONFIG_ERROR', 'Server configuration error', 500, requestOrigin);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate authorization
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return createErrorResponse('AUTH_REQUIRED', 'Authorization header required', 401, requestOrigin);
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return createErrorResponse('AUTH_INVALID', 'Invalid authorization token', 401, requestOrigin);
    }

    // Resolve tenant id
    let tenantId: string | null = null;

    const { data: userTenantAccess } = await supabaseClient
      .from('user_tenant_access')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (userTenantAccess) {
      tenantId = (userTenantAccess as any).tenant_id;
    }

    if (!tenantId) {
      const { data: autoProvisionData } = await supabaseClient
        .from('auto_provisioning')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .single()

      if (autoProvisionData) {
        tenantId = (autoProvisionData as any).tenant_id;
      }
    }

    if (!tenantId) {
      console.error('No tenant found for user:', user.id)
      return createErrorResponse('TENANT_NOT_FOUND', 'No tenant found for user', 404, requestOrigin);
    }

    // Parse and validate request parameters from URL or body
    let dateParam: string;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    } else {
      try {
        const body = await req.json();
        dateParam = body.date || new Date().toISOString().split('T')[0];
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        return createErrorResponse('INVALID_JSON', 'Invalid JSON in request body', 400, requestOrigin);
      }
    }
    
    // Build date range for the requested date
    const startDate = new Date(dateParam);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateParam);
    endDate.setHours(23, 59, 59, 999);

    // Fetch table count
    const { data: tablesCountData, error: tablesCountError } = await supabaseClient
      .from('restaurant_tables')
      .select('id', { count: 'estimated', head: true })
      .eq('tenant_id', tenantId)
      .eq('active', true);

    if (tablesCountError) {
      console.error('Tables count error:', tablesCountError);
    }

    const totalTables = (tablesCountData as any)?.length ?? (tablesCountError ? 0 : (tablesCountData as any));

    // Fetch bookings for the specified date
    const { data: bookingsData, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        tenant_id,
        booking_time,
        status,
        party_size,
        duration_minutes,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .gte('booking_time', startDate.toISOString())
      .lte('booking_time', endDate.toISOString());

    if (bookingsError) {
      console.error('Bookings query error:', bookingsError);
      return createErrorResponse('DATABASE_ERROR', 'Failed to fetch bookings data', 500, requestOrigin);
    }

    const bookings: Booking[] = bookingsData || [];

    // Derive KPIs from real data
    const now = new Date();
    const confirmedOrSeated = bookings.filter((b) => b.status === 'confirmed' || b.status === 'seated');
    const completed = bookings.filter((b) => b.status === 'completed');
    const cancelled = bookings.filter((b) => b.status === 'cancelled');

    // Current occupancy (tables with a seated booking at current time)
    const occupiedTables = new Set<string>();
    for (const b of bookings) {
      if (b.status !== 'seated') continue;
      const start = new Date(b.booking_time);
      const dur = b.duration_minutes || 90;
      const end = new Date(start.getTime() + dur * 60 * 1000);
      if (start <= now && now <= end) {
        // we don't have table_id from this query; quick join-less approximation via count of seated bookings
        occupiedTables.add(b.id); // placeholder for count; size used below
      }
    }
    const occupancyPct = totalTables > 0 ? Math.round((occupiedTables.size / totalTables) * 100) : 0;

    const covers = confirmedOrSeated.reduce((sum, b) => sum + (b.party_size || 0), 0);

    // No-show risk: ratio of pending/confirmed upcoming vs total day bookings
    const upcomingConfirmed = bookings.filter((b) => {
      const t = new Date(b.booking_time);
      return (b.status === 'confirmed') && t > now;
    }).length;
    const noShowRisk = Math.min(100, Math.round((upcomingConfirmed / Math.max(1, bookings.length)) * 100));

    const avgPartySize = confirmedOrSeated.length > 0 ? Math.round((covers / confirmedOrSeated.length) * 10) / 10 : 0;

    // Kitchen load: seated bookings in current hour scaled to percentage
    const currentHour = now.getHours();
    const currentHourSeated = bookings.filter((b) => {
      if (b.status !== 'seated') return false;
      const hour = new Date(b.booking_time).getHours();
      return hour === currentHour;
    }).length;
    const kitchenPacing = Math.min(100, currentHourSeated * 20);

    // Build sparkline series from hourly bookings counts (no randomness)
    const hourlyCounts = Array.from({ length: 12 }, (_, i) => i).map((i) => {
      const hour = i + 10; // 10:00 to 21:00 typical service window
      return bookings.filter((b) => new Date(b.booking_time).getHours() === hour).length;
    });

    const kpis: KpiData[] = [
      {
        id: 'occupancy',
        label: 'Occupancy',
        value: `${occupancyPct}%`,
        tone: occupancyPct > 80 ? 'success' : occupancyPct > 60 ? 'default' : 'warning',
        spark: hourlyCounts,
        hint: `${occupiedTables.size} of ${totalTables} tables occupied`,
        format: 'percentage'
      },
      {
        id: 'covers',
        label: 'Covers',
        value: covers.toString(),
        tone: 'default',
        spark: hourlyCounts,
        hint: `${confirmedOrSeated.length} confirmed/seated reservations`,
        format: 'number'
      },
      {
        id: 'no-show-risk',
        label: 'No-Show Risk',
        value: `${noShowRisk}%`,
        tone: noShowRisk > 20 ? 'danger' : noShowRisk > 10 ? 'warning' : 'success',
        spark: hourlyCounts,
        hint: `Based on ${upcomingConfirmed} upcoming confirmed reservations`,
        format: 'percentage'
      },
      {
        id: 'avg-party',
        label: 'Avg Party Size',
        value: avgPartySize.toString(),
        tone: 'default',
        spark: hourlyCounts,
        hint: 'Average guests per reservation',
        format: 'number'
      },
      {
        id: 'kitchen-pacing',
        label: 'Kitchen Load',
        value: `${kitchenPacing}%`,
        tone: kitchenPacing > 80 ? 'danger' : kitchenPacing > 60 ? 'warning' : 'success',
        spark: hourlyCounts,
        hint: `${currentHourSeated} seated this hour`,
        format: 'percentage'
      }
    ];

    const responseData = {
      data: kpis,
      meta: {
        date: dateParam,
        tenant_id: tenantId,
        total_bookings: bookings.length,
        confirmed_bookings: confirmedOrSeated.length,
        completed_bookings: completed.length,
        cancelled_bookings: cancelled.length,
        calculated_at: new Date().toISOString()
      }
    };

    return createCorsResponse(responseData, requestOrigin);

  } catch (error) {
    console.error('KPI calculation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse('INTERNAL_ERROR', `Internal server error: ${errorMessage}`, 500, requestOrigin);
  }
});
