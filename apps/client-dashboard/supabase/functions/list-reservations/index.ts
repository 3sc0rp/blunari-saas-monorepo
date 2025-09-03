import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, createCorsResponse, createErrorResponse } from '../_shared/cors'

interface ListReservationsRequest {
  date: string; // YYYY-MM-DD format
  filters?: {
    section?: 'all' | 'Patio' | 'Bar' | 'Main';
    status?: 'all' | 'CONFIRMED' | 'SEATED' | 'COMPLETED';
    channel?: 'all' | 'WEB' | 'PHONE' | 'WALKIN';
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate user and get tenant
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authHeader) {
      return createErrorResponse('AUTH_REQUIRED', 'Authorization header required', 401)
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader)
    if (authError || !user) {
      return createErrorResponse('AUTH_INVALID', 'Invalid authorization token', 401)
    }

    // Get user's tenant
    const { data: tenantData, error: tenantError } = await supabaseClient
      .from('auto_provisioning')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single()

    if (tenantError || !tenantData) {
      return createErrorResponse('TENANT_NOT_FOUND', 'No tenant found for user', 404)
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

    // Build query
    let query = supabaseClient
      .from('bookings')
      .select(`
        id,
        tenant_id,
        table_id,
        guest_name,
        guest_phone,
        guest_email,
        party_size,
        booking_time,
        duration_minutes,
        status,
        special_requests,
        deposit_amount,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .gte('booking_time', startDate.toISOString())
      .lte('booking_time', endDate.toISOString())
      .order('booking_time', { ascending: true })

    // Apply filters
    if (body.filters?.status && body.filters.status !== 'all') {
      query = query.eq('status', body.filters.status.toLowerCase())
    }

    const { data: bookingsData, error: bookingsError } = await query

    if (bookingsError) {
      console.error('Database error:', bookingsError)
      return createErrorResponse('DATABASE_ERROR', 'Failed to fetch reservations', 500)
    }

    // Transform bookings to match frontend contract
    const reservations = (bookingsData || []).map((booking: any) => {
      const startTime = new Date(booking.booking_time)
      const durationMinutes = booking.duration_minutes || 90
      const endTime = new Date(startTime.getTime() + (durationMinutes * 60 * 1000))

      // Determine section from table_id (mock logic - in real app this would come from tables table)
      let section = 'Main'
      if (booking.table_id) {
        const tableNum = parseInt(booking.table_id.replace('table-', ''))
        if (tableNum <= 6) section = 'Patio'
        else if (tableNum <= 12) section = 'Bar'
      }

      // Apply section filter if specified
      if (body.filters?.section && body.filters.section !== 'all' && section !== body.filters.section) {
        return null
      }

      return {
        id: booking.id,
        tenantId: booking.tenant_id,
        tableId: booking.table_id || `table-${Math.floor(Math.random() * 20) + 1}`,
        section,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        partySize: booking.party_size,
        channel: 'WEB', // Default since not stored in current schema
        vip: booking.special_requests?.toLowerCase().includes('vip') || false,
        guestName: booking.guest_name,
        guestPhone: booking.guest_phone,
        guestEmail: booking.guest_email,
        status: booking.status?.toUpperCase() || 'CONFIRMED',
        depositRequired: !!booking.deposit_amount,
        depositAmount: booking.deposit_amount,
        specialRequests: booking.special_requests,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at
      }
    }).filter(Boolean) // Remove null entries from section filtering

    return createCorsResponse({ data: reservations })

  } catch (error) {
    console.error('Function error:', error)
    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
})
