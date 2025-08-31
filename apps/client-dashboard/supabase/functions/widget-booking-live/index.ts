import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

// Input validation and sanitization
function validateAndSanitizeInput(data: any): boolean {
  if (!data || typeof data !== 'object') return false
  
  // Check for required fields
  if (!data.tenant_id || !data.action) return false
  
  // Validate UUID format for tenant_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(data.tenant_id)) return false
  
  // Validate party size (reasonable bounds)
  if (data.party_size && (data.party_size < 1 || data.party_size > 20)) return false
  
  return true
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (req.method !== 'POST') {
      console.log('Non-POST request received:', req.method);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('POST request received, processing...');

    let requestData;
    try {
      const bodyText = await req.text();
      console.log('Raw request body length:', bodyText ? bodyText.length : 0);
      console.log('Raw request body:', bodyText);
      console.log('Request method:', req.method);
      console.log('Request headers:', Object.fromEntries(req.headers.entries()));
      
      if (!bodyText || bodyText.trim() === '') {
        console.error('Empty request body received');
        // Try to get data from URL params as fallback
        const url = new URL(req.url);
        const params = Object.fromEntries(url.searchParams.entries());
        console.log('URL params as fallback:', params);
        
        if (Object.keys(params).length === 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: { 
                code: 'EMPTY_BODY', 
                message: 'Request body is required. Received empty body.',
                debug: {
                  method: req.method,
                  contentType: req.headers.get('content-type'),
                  bodyLength: bodyText ? bodyText.length : 0
                }
              } 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        requestData = params;
      } else {
        requestData = JSON.parse(bodyText);
      }
      
      console.log('Successfully parsed request data:', requestData);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { 
            code: 'INVALID_JSON', 
            message: 'Invalid JSON in request body',
            details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
          } 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Parsed request data:', requestData);

    const { action } = requestData;

    if (!action) {
      console.error('No action specified in request:', requestData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'MISSING_ACTION', message: 'Action parameter is required' } 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate and sanitize input
    if (!validateAndSanitizeInput(requestData)) {
      console.error('Invalid input data:', requestData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'INVALID_INPUT', message: 'Invalid or malformed request data' } 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (action === 'search') {
      return handleAvailabilitySearch(supabase, requestData)
    } else if (action === 'hold') {
      return handleCreateHold(supabase, requestData)
    } else if (action === 'confirm') {
      return handleConfirmReservation(supabase, requestData)
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'INVALID_ACTION', message: 'Invalid action specified' } 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function handleAvailabilitySearch(supabase: any, requestData: any) {
  const { tenant_id, party_size, service_date } = requestData
  
  // Get tenant info from Supabase for validation
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenant_id)
    .maybeSingle();

  if (tenantError) {
    console.error('Tenant query error:', tenantError);
    throw new Error(`Failed to query tenant: ${tenantError.message}`);
  }

  if (!tenant) {
    console.error('Tenant not found for ID:', tenant_id);
    throw new Error(`Tenant not found: ${tenant_id}`);
  }

  // Try external Blunari API for availability search first
  try {
    const apiUrl = 'https://services.blunari.ai/api/public/booking/search'
    
    const searchPayload = {
      tenant_id,
      party_size: Number(party_size), // Ensure it's a number
      service_date, // Already in YYYY-MM-DD format
      time_window: {
        start: 'T12:00:00', // ISO time format
        end: 'T21:00:00'   // ISO time format
      }
    }

    console.log('Calling external API:', apiUrl, searchPayload)

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
        'X-Request-ID': crypto.randomUUID(),
      },
      body: JSON.stringify(searchPayload)
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error('External API error:', apiResponse.status, errorText)
      throw new Error(`Booking service unavailable (${apiResponse.status})`)
    }

    const apiData = await apiResponse.json()
    console.log('External API response:', apiData)

    // Return the external API response in the expected format
    return new Response(
      JSON.stringify({ 
        success: true, 
        slots: apiData.slots || [],
        alternatives: apiData.alternatives || []
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (apiError) {
    console.error('External API failed:', apiError)
    console.log('Falling back to local data...')
    
    // Fallback to local Supabase data if external API fails
    const { tenant_id, party_size, service_date } = requestData
    
    // Get tables for the tenant
    const { data: tables, error: tablesError } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('active', true)

    if (tablesError) {
      console.error('Failed to fetch tables:', tablesError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'SEARCH_FAILED', message: 'Unable to load restaurant data. Please try again.' }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get existing bookings for the date
    const searchDate = new Date(service_date)
    const dayStart = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('booking_time', dayStart.toISOString())
      .lt('booking_time', dayEnd.toISOString())

    if (bookingsError) {
      console.error('Failed to fetch bookings:', bookingsError)
      // Continue without bookings data
    }

    // Generate available time slots
    const slots = generateTimeSlots(tables || [], bookings || [], party_size, searchDate)

    return new Response(
      JSON.stringify({ 
        success: true, 
        slots,
        _fallback: true
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function handleCreateHold(supabase: any, requestData: any) {
  try {
    const { tenant_id, slot, party_size } = requestData

    // Call external Blunari API for hold creation
    const apiUrl = 'https://services.blunari.ai/api/public/booking/holds'
    
    const holdPayload = {
      tenant_id,
      party_size: Number(party_size), // Ensure it's a number
      slot,
      policy_params: {}
    }

    console.log('Creating hold with external API:', apiUrl, holdPayload)

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
        'X-Request-ID': crypto.randomUUID(),
      },
      body: JSON.stringify(holdPayload)
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error('External API hold error:', apiResponse.status, errorText)
      throw new Error(`Failed to create booking hold (${apiResponse.status})`)
    }

    const apiData = await apiResponse.json()
    console.log('External API hold response:', apiData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        hold_id: apiData.hold_id,
        expires_at: apiData.expires_at,
        table_identifiers: apiData.table_identifiers || ['Available Table']
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Hold creation error:', error)
    
    // Fallback to local hold creation
    try {
      console.log('Falling back to local hold creation...')
      const { tenant_id, slot, party_size } = requestData

      const holdData = {
        tenant_id,
        booking_time: slot.time,
        party_size,
        duration_minutes: 120,
        session_id: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minute hold
      }

      const { data: hold, error: holdError } = await supabase
        .from('booking_holds')
        .insert(holdData)
        .select()
        .single()

      if (holdError) {
        throw new Error(`Failed to create hold: ${holdError.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          hold_id: hold.id,
          expires_at: hold.expires_at,
          table_identifiers: ['Available Table'],
          _fallback: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } catch (fallbackError) {
      console.error('Fallback hold creation failed:', fallbackError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'HOLD_FAILED', message: 'Unable to reserve time slot. Please try again.' }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
  }
}

async function handleConfirmReservation(supabase: any, requestData: any) {
  try {
    const { 
      tenant_id, 
      hold_id,
      guest_details, 
      idempotency_key 
    } = requestData

    // Call external Blunari API for reservation confirmation
    const apiUrl = 'https://services.blunari.ai/api/public/booking/reservations'
    
    const reservationPayload = {
      tenant_id,
      hold_id,
      guest_details
    }

    console.log('Confirming reservation with external API:', apiUrl, reservationPayload)

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
        'X-Request-ID': crypto.randomUUID(),
        'X-Idempotency-Key': idempotency_key || crypto.randomUUID(),
      },
      body: JSON.stringify(reservationPayload)
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      console.error('External API reservation error:', apiResponse.status, errorText)
      throw new Error(`Failed to confirm reservation (${apiResponse.status})`)
    }

    const apiData = await apiResponse.json()
    console.log('External API reservation response:', apiData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        reservation_id: apiData.reservation_id,
        confirmation_number: apiData.confirmation_number,
        status: apiData.status,
        summary: apiData.summary
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Reservation confirmation error:', error)
    
    // Fallback to local booking creation
    try {
      console.log('Falling back to local booking creation...')
      const { tenant_id, hold_id, guest_details } = requestData

      // Get hold information first
      const { data: hold, error: holdError } = await supabase
        .from('booking_holds')
        .select('*')
        .eq('id', hold_id)
        .single()

      if (holdError || !hold) {
        throw new Error('Booking hold not found or expired')
      }

      // Check for duplicate booking
      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('guest_email', guest_details.email)
        .eq('booking_time', hold.booking_time)
        .maybeSingle()

      if (existing) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            reservation_id: existing.id,
            confirmation_number: `CONF${existing.id.slice(-6).toUpperCase()}`,
            status: 'confirmed',
            summary: {
              date: hold.booking_time,
              time: new Date(hold.booking_time).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              }),
              party_size: hold.party_size,
              table_info: 'Reserved Table',
              deposit_required: false,
            },
            _fallback: true
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create the booking
      const bookingData = {
        tenant_id,
        booking_time: hold.booking_time,
        party_size: hold.party_size,
        guest_name: `${guest_details.first_name} ${guest_details.last_name}`,
        guest_email: guest_details.email,
        guest_phone: guest_details.phone || null,
        special_requests: guest_details.special_requests || null,
        status: 'confirmed',
        duration_minutes: hold.duration_minutes,
        deposit_required: false,
        deposit_paid: false,
      }

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single()

      if (bookingError) {
        throw new Error(`Failed to create booking: ${bookingError.message}`)
      }

      const confirmationNumber = `CONF${booking.id.slice(-6).toUpperCase()}`

      console.log('Fallback booking created successfully:', booking.id)

      return new Response(
        JSON.stringify({ 
          success: true, 
          reservation_id: booking.id,
          confirmation_number: confirmationNumber,
          status: 'confirmed',
          summary: {
            date: booking.booking_time,
            time: new Date(booking.booking_time).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            }),
            party_size: booking.party_size,
            table_info: 'Reserved Table',
            deposit_required: false,
          },
          _fallback: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } catch (fallbackError) {
      console.error('Fallback reservation failed:', fallbackError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: 'CONFIRMATION_FAILED', message: 'Unable to confirm reservation. Please try again.' }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
  }
}

function generateTimeSlots(tables: any[], bookings: any[], partySize: number, date: Date) {
  const slots = []
  const suitableTables = tables.filter(table => table.capacity >= partySize)
  
  // Generate slots from 12 PM to 9 PM
  for (let hour = 12; hour < 21; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const slotTime = new Date(date)
      slotTime.setHours(hour, minute, 0, 0)
      
      // Skip past times
      if (slotTime <= new Date()) continue
      
      // Check availability
      const conflictingBookings = bookings.filter(booking => {
        const bookingStart = new Date(booking.booking_time)
        const bookingEnd = new Date(bookingStart.getTime() + booking.duration_minutes * 60 * 1000)
        const slotEnd = new Date(slotTime.getTime() + 120 * 60 * 1000) // 2 hour default
        
        return (slotTime < bookingEnd && slotEnd > bookingStart)
      })
      
      const availableTables = suitableTables.length - conflictingBookings.length
      
      if (availableTables > 0) {
        slots.push({
          time: slotTime.toISOString(),
          available_tables: availableTables,
          revenue_projection: Math.round(100 + Math.random() * 100),
          optimal: hour >= 18 && hour <= 19, // Prime dinner time
        })
      }
    }
  }
  
  return slots.slice(0, 15) // Limit slots
}