import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const createCorsHeaders = (requestOrigin: string | null = null) => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  // Normalize and validate origin
  const normalize = (origin: string | null) => {
    try { if (!origin) return null; const u = new URL(origin); return `${u.protocol}//${u.host}`; } catch { return null; }
  };
  const origin = normalize(requestOrigin);

  // Hostname-level allowlist with wildcard support for subdomains
  const isAllowed = (o: string | null) => {
    if (!o) return false;
    try {
      const { hostname, protocol } = new URL(o);
      if (protocol !== 'https:') return false;
      if (hostname === 'app.blunari.ai' || hostname === 'demo.blunari.ai' || hostname === 'admin.blunari.ai' || hostname === 'services.blunari.ai' || hostname === 'blunari.ai' || hostname === 'www.blunari.ai') return true;
      // Allow any *.blunari.ai subdomain in production
      if (hostname.endsWith('.blunari.ai')) return true;
      return false;
    } catch {
      return false;
    }
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

interface ListReservationsRequest {
  date: string; // YYYY-MM-DD format
  filters?: {
    section?: 'all' | 'Patio' | 'Bar' | 'Main';
    status?: 'all' | 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED';
    channel?: 'all' | 'WEB' | 'PHONE' | 'WALKIN';
  };
}

serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: createCorsHeaders(requestOrigin) })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate user and get tenant
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authHeader) {
      return createErrorResponse('AUTH_REQUIRED', 'Authorization header required', 401, requestOrigin)
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader)
    if (authError || !user) {
      return createErrorResponse('AUTH_INVALID', 'Invalid authorization token', 401, requestOrigin)
    }

    // Get user's tenant
    const { data: tenantData, error: tenantError } = await supabaseClient
      .from('auto_provisioning')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single()

    if (tenantError || !tenantData) {
      return createErrorResponse('TENANT_NOT_FOUND', 'No tenant found for user', 404, requestOrigin)
    }

    const tenantId = tenantData.tenant_id
    const body: ListReservationsRequest = await req.json()

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(body.date)) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid date format. Use YYYY-MM-DD', 400)
    }

    // Build date range
    const startDate = new Date(body.date)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(body.date)
    endDate.setHours(23, 59, 59, 999)

    // Build query with table join for real table metadata; support both schemas
    const baseSelect = `
        id,
        tenant_id,
        table_id,
        guest_name,
        guest_phone,
        guest_email,
        party_size,
        duration_minutes,
        status,
        special_requests,
        deposit_amount,
        created_at,
        updated_at
      `

    let useTimestampSchema = true
    let query = supabaseClient
      .from('bookings')
      .select(baseSelect + `, booking_time`)
      .eq('tenant_id', tenantId)
      .gte('booking_time', startDate.toISOString())
      .lte('booking_time', endDate.toISOString())
      .order('booking_time', { ascending: true })

    // Apply filters
    if (body.filters?.status && body.filters.status !== 'all') {
      query = query.eq('status', body.filters.status.toLowerCase())
    }

    let { data: bookingsData, error: bookingsError } = await query

    if (bookingsError) {
      // Fallback to schema with booking_date (DATE) + booking_time (TIME)
      useTimestampSchema = false
      let query2 = supabaseClient
        .from('bookings')
        .select(baseSelect + `, booking_date, booking_time`)
        .eq('tenant_id', tenantId)
        .eq('booking_date', body.date)
        .order('booking_time', { ascending: true })

      if (body.filters?.status && body.filters.status !== 'all') {
        query2 = query2.eq('status', body.filters.status.toLowerCase())
      }

      const r2 = await query2
      bookingsData = r2.data as any[]
      bookingsError = r2.error
    }

    if (bookingsError) {
      console.error('Database error:', bookingsError)
      return createErrorResponse('DATABASE_ERROR', 'Failed to fetch reservations', 500, requestOrigin)
    }

    // Transform bookings; fetch table section per-row safely (async)
    const reservations = await Promise.all(
      (bookingsData || [])
        .filter((booking: any) => !!booking.table_id)
        .map(async (booking: any) => {
          const startTime = useTimestampSchema
            ? new Date(booking.booking_time)
            : new Date(`${booking.booking_date}T${booking.booking_time}`)
          const durationMinutes = booking.duration_minutes || 90
          const endTime = new Date(startTime.getTime() + (durationMinutes * 60 * 1000))

          let section = 'Main'
          try {
            const { data: t } = await supabaseClient
              .from('restaurant_tables')
              .select('location_zone, section')
              .eq('id', booking.table_id)
              .maybeSingle()
            section = (t?.location_zone || t?.section || 'Main') as string
          } catch {}

          return {
            id: booking.id,
            tenantId: booking.tenant_id,
            tableId: booking.table_id,
            section,
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            partySize: booking.party_size,
            channel: 'WEB',
            vip: Boolean(booking.special_requests && (booking.special_requests as string).toLowerCase().includes('vip')),
            guestName: booking.guest_name,
            guestPhone: booking.guest_phone,
            guestEmail: booking.guest_email,
            status: (booking.status || 'confirmed').toString().toUpperCase(),
            depositRequired: !!booking.deposit_amount,
            depositAmount: booking.deposit_amount,
            specialRequests: booking.special_requests || undefined,
            createdAt: booking.created_at,
            updatedAt: booking.updated_at
          }
        })
    )

    return createCorsResponse({ data: reservations })

  } catch (error) {
    console.error('Function error:', error)
    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
})
