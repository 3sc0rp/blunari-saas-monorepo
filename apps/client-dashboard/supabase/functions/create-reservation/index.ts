import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const createCorsHeaders = (requestOrigin: string | null = null) => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';
  
  let allowedOrigin = '*';
  if (environment === 'production' && requestOrigin) {
    const allowedOrigins = [
      'https://demo.blunari.ai',
      'https://admin.blunari.ai', 
      'https://services.blunari.ai',
      'https://blunari.ai',
      'https://www.blunari.ai'
    ];
    allowedOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, accept, accept-language, content-length',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
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

interface CreateReservationRequest {
  tableId: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  partySize: number;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  specialRequests?: string;
  channel?: 'WEB' | 'PHONE' | 'WALKIN';
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

    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authHeader) {
      return createErrorResponse('AUTH_REQUIRED', 'Authorization header required', 401, requestOrigin)
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader)
    if (authError || !user) {
      return createErrorResponse('AUTH_INVALID', 'Invalid authorization token', 401, requestOrigin)
    }

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
    
    // Get idempotency key from headers
    const idempotencyKey = req.headers.get('x-idempotency-key')
    if (!idempotencyKey) {
      return createErrorResponse('MISSING_IDEMPOTENCY_KEY', 'x-idempotency-key header required', 400, requestOrigin)
    }

    const body: CreateReservationRequest = await req.json()

    // Validate required fields
    if (!body.tableId || !body.start || !body.end || !body.partySize || !body.guestName) {
      return createErrorResponse('MISSING_REQUIRED_FIELD', 'Missing required fields', 400, requestOrigin)
    }

    // Validate party size
    if (body.partySize < 1 || body.partySize > 20) {
      return createErrorResponse('VALIDATION_ERROR', 'Party size must be between 1 and 20', 400)
    }

    // Validate dates
    const startTime = new Date(body.start)
    const endTime = new Date(body.end)
    const now = new Date()

    if (startTime < now) {
      return createErrorResponse('RESERVATION_PAST_TIME', 'Cannot create reservations in the past', 400)
    }

    if (endTime <= startTime) {
      return createErrorResponse('RESERVATION_INVALID_TIME', 'End time must be after start time', 400)
    }

    // Check for existing reservation with same idempotency key
    const { data: existingReservation } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('idempotency_key', idempotencyKey)
      .single()

    if (existingReservation) {
      // Return existing reservation (idempotent)
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000))
      
      const reservation = {
        id: existingReservation.id,
        tenantId: existingReservation.tenant_id,
        tableId: existingReservation.table_id,
        section: 'Main', // Mock section logic
        start: existingReservation.booking_time,
        end: new Date(new Date(existingReservation.booking_time).getTime() + (existingReservation.duration_minutes * 60 * 1000)).toISOString(),
        partySize: existingReservation.party_size,
        channel: body.channel || 'WEB',
        vip: existingReservation.special_requests?.includes('vip') || false,
        guestName: existingReservation.guest_name,
        guestPhone: existingReservation.guest_phone,
        guestEmail: existingReservation.guest_email,
        status: existingReservation.status?.toUpperCase() || 'CONFIRMED',
        depositRequired: !!existingReservation.deposit_amount,
        depositAmount: existingReservation.deposit_amount,
        specialRequests: existingReservation.special_requests,
        createdAt: existingReservation.created_at,
        updatedAt: existingReservation.updated_at
      }

      return createCorsResponse({ data: reservation })
    }

    // Check for table conflicts
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000))
    
    const { data: conflictingBookings } = await supabaseClient
      .from('bookings')
      .select('id, booking_time, duration_minutes')
      .eq('tenant_id', tenantId)
      .eq('table_id', body.tableId)
      .neq('status', 'cancelled')
      .gte('booking_time', new Date(startTime.getTime() - 4 * 60 * 60 * 1000).toISOString()) // 4 hours before
      .lte('booking_time', new Date(endTime.getTime() + 4 * 60 * 60 * 1000).toISOString())   // 4 hours after

    if (conflictingBookings && conflictingBookings.length > 0) {
      // Check for actual time conflicts
      const hasConflict = conflictingBookings.some((booking: any) => {
        const bookingStart = new Date(booking.booking_time)
        const bookingEnd = new Date(bookingStart.getTime() + (booking.duration_minutes * 60 * 1000))
        
        // Check if times overlap
        return (startTime < bookingEnd && endTime > bookingStart)
      })

      if (hasConflict) {
        return createErrorResponse('RESERVATION_CONFLICT', 'Time slot conflicts with existing reservation', 409)
      }
    }

    // Create the reservation
    const { data: newBooking, error: createError } = await supabaseClient
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        table_id: body.tableId,
        guest_name: body.guestName,
        guest_phone: body.guestPhone,
        guest_email: body.guestEmail,
        party_size: body.partySize,
        booking_time: startTime.toISOString(),
        duration_minutes: duration,
        status: 'confirmed',
        special_requests: body.specialRequests,
        idempotency_key: idempotencyKey,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Create booking error:', createError)
      return createErrorResponse('DATABASE_ERROR', 'Failed to create reservation', 500, requestOrigin)
    }

    // Transform to frontend format
    const reservation = {
      id: newBooking.id,
      tenantId: newBooking.tenant_id,
      tableId: newBooking.table_id,
      section: 'Main' as const, // Mock section logic
      start: newBooking.booking_time,
      end: endTime.toISOString(),
      partySize: newBooking.party_size,
      channel: body.channel || 'WEB' as const,
      vip: newBooking.special_requests?.includes('vip') || false,
      guestName: newBooking.guest_name,
      guestPhone: newBooking.guest_phone,
      guestEmail: newBooking.guest_email,
      status: 'CONFIRMED' as const,
      depositRequired: false,
      depositAmount: undefined,
      specialRequests: newBooking.special_requests,
      createdAt: newBooking.created_at,
      updatedAt: newBooking.updated_at
    }

    return new Response(JSON.stringify({ data: reservation }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...createCorsHeaders(requestOrigin),
      },
    })

  } catch (error) {
    console.error('Function error:', error)
    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500, requestOrigin)
  }
})
