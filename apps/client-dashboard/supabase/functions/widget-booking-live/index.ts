import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id, x-idempotency-key",
  "Access-Control-Expose-Headers": "x-request-id, x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; object-src 'none';",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// Basic base64url helpers
function b64urlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const paddedStr = pad ? padded + '='.repeat(4 - pad) : padded;
  try { return atob(paddedStr); } catch { return ''; }
}
function b64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');
}

// Insecure fallback HMAC compatible with client dev token utils (replace with real crypto in prod)
function simpleHMAC(data: string, secret: string): string {
  let hash = secret;
  for (let i = 0; i < data.length; i++) {
    hash = (((hash.charCodeAt(i % hash.length) ^ data.charCodeAt(i)) % 256).toString(16).padStart(2, '0')) + hash;
  }
  return b64urlEncode(hash.substring(0, 64));
}

function getWidgetSecret(): string {
  return Deno.env.get('WIDGET_JWT_SECRET') || Deno.env.get('VITE_JWT_SECRET') || 'dev-jwt-secret-change-in-production-2025';
}

function validateWidgetToken(token: string): { slug: string; configVersion?: string; widgetType?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const header = JSON.parse(b64urlDecode(h));
    if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const payload = JSON.parse(b64urlDecode(p));
    if (!payload || !payload.slug) return null;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    const expected = simpleHMAC(`${h}.${p}`, getWidgetSecret());
    if (expected !== s) return null;
    return { slug: payload.slug, configVersion: payload.configVersion, widgetType: payload.widgetType };
  } catch {
    return null;
  }
}

function errorResponse(code: string, message: string, status = 400, requestId?: string, issues?: unknown) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message, requestId, issues } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '' } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const USE_LOCAL_BOOKING = (Deno.env.get('USE_LOCAL_BOOKING') || 'true').toLowerCase() !== 'false';

    if (req.method !== "POST") {
      return errorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405, requestId);
    }

    let requestData: any;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim() === "") {
        const url = new URL(req.url);
        requestData = Object.fromEntries(url.searchParams.entries());
      } else {
        requestData = JSON.parse(bodyText);
      }
    } catch (parseError) {
      return errorResponse('INVALID_JSON', 'Invalid JSON in request body', 400, requestId, { parseError: `${parseError}` });
    }

    const action = requestData?.action;
    if (!action) {
      return errorResponse('MISSING_ACTION', 'Action parameter is required', 400, requestId);
    }

    // Validate and resolve widget token → slug → tenant_id, with authenticated fallback for dashboard usage
    const token = requestData.token || new URL(req.url).searchParams.get('token');
    const tokenPayload = token ? validateWidgetToken(token) : null;

    let resolvedTenantId: string | null = null;
    let resolvedTenant: any = null;

    if (tokenPayload?.slug) {
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, slug, timezone, currency')
        .eq('slug', tokenPayload.slug)
        .eq('status', 'active')
        .maybeSingle();
      if (!tenantError && tenant) {
        resolvedTenantId = tenant.id;
        resolvedTenant = tenant;
      }
    }

    // Fallback: accept authenticated dashboard requests (no widget token)
    if (!resolvedTenantId) {
      try {
        const bearer = req.headers.get('Authorization')?.replace('Bearer ', '');
        if (bearer) {
          // Use service client to verify JWT to avoid relying on ANON env
          const { data: auth } = await supabase.auth.getUser(bearer);
          const user = (auth as any)?.user;
          if (user) {
            // If client provided tenant_id, verify access explicitly and prefer it
            if (requestData?.tenant_id) {
              const explicitTenantId = String(requestData.tenant_id);
              const { data: hasExplicitAccess } = await supabase
                .from('user_tenant_access')
                .select('tenant_id')
                .eq('user_id', user.id)
                .eq('tenant_id', explicitTenantId)
                .eq('active', true)
                .maybeSingle();
              if (hasExplicitAccess) {
                resolvedTenantId = explicitTenantId;
              }
            }

            // Try user_tenant_access first
            if (!resolvedTenantId) {
              const { data: uta } = await supabase
                .from('user_tenant_access')
                .select('tenant_id')
                .eq('user_id', user.id)
                .eq('active', true)
                .maybeSingle();
              resolvedTenantId = (uta as any)?.tenant_id || null;
            }

            // Fallback to auto_provisioning
            if (!resolvedTenantId) {
              const { data: ap } = await supabase
                .from('auto_provisioning')
                .select('tenant_id')
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .maybeSingle();
              resolvedTenantId = (ap as any)?.tenant_id || null;
            }

            if (resolvedTenantId) {
              const { data: t } = await supabase
                .from('tenants')
                .select('id, name, slug, timezone, currency')
                .eq('id', resolvedTenantId)
                .maybeSingle();
              resolvedTenant = t || null;
            }
          }
        }
      } catch {}
    }

    if (!resolvedTenantId) {
      return errorResponse('INVALID_TOKEN', 'Valid widget token or authenticated session required', 401, requestId);
    }

    // Override any client-provided tenant_id
    requestData.tenant_id = resolvedTenantId;

    if (action === "search") {
      console.log('[widget-booking-live] search', { requestId, tenant: resolvedTenantId, tz: resolvedTenant?.timezone });
      return await handleAvailabilitySearch(supabase, requestData, resolvedTenant?.timezone, requestId);
    } else if (action === "hold") {
      console.log('[widget-booking-live] hold', { requestId, tenant: resolvedTenantId });
      if (USE_LOCAL_BOOKING) {
        return await handleCreateHoldLocal(supabase, requestData, requestId);
      }
      return await handleCreateHold(supabase, requestData, requestId);
    } else if (action === "confirm") {
      console.log('[widget-booking-live] confirm', { requestId, tenant: resolvedTenantId });
      if (USE_LOCAL_BOOKING) {
        return await handleConfirmReservationLocal(supabase, requestData, requestId, resolvedTenant);
      }
      return await handleConfirmReservation(supabase, requestData, requestId, resolvedTenant);
    } else {
      return errorResponse('INVALID_ACTION', 'Invalid action specified', 400, requestId);
    }
  } catch (error) {
    console.error('[widget-booking-live] INTERNAL_ERROR', { error: `${error}`, stack: (error as any)?.stack });
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500, undefined, { error: `${error}` });
  }
});

async function handleAvailabilitySearch(supabase: any, requestData: any, tenantTimezone?: string, requestId?: string) {
  const { tenant_id, party_size, service_date } = requestData;

  // Validate tenant exists
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', tenant_id)
    .maybeSingle();
  if (tenantError) {
    return errorResponse('TENANT_QUERY_FAILED', 'Failed to query tenant', 500, requestId, { details: tenantError.message });
  }
  if (!tenant) {
    return errorResponse('TENANT_NOT_FOUND', 'Tenant not found', 404, requestId);
  }

  // Resolve opening hours strictly from Operations (business_hours), skip if holiday
  const { data: holiday } = await supabase
    .from('holidays')
    .select('holiday_date')
    .eq('tenant_id', tenant_id)
    .eq('holiday_date', service_date)
    .maybeSingle();
  if (holiday) {
    return new Response(
      JSON.stringify({ success: true, slots: [], reason: 'HOLIDAY', requestId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '' } },
    );
  }
  const windowForDay = await resolveTimeWindowForDate(supabase, tenant_id, service_date, tenantTimezone);
  if (!windowForDay) {
    // Closed day or hours not configured
    return new Response(
      JSON.stringify({ success: true, slots: [], reason: 'CLOSED_OR_NO_HOURS', requestId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '' } },
    );
  }

  // Load data in parallel
  const searchDate = new Date(service_date);
  const dayStart = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [tablesRes, bookingsTsRes] = await Promise.all([
    supabase
      .from('restaurant_tables')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('active', true),
    supabase
      .from('bookings')
      .select('table_id, booking_time, duration_minutes, status')
      .eq('tenant_id', tenant_id)
      .gte('booking_time', dayStart.toISOString())
      .lt('booking_time', dayEnd.toISOString())
  ]);

  if (tablesRes.error) {
    return errorResponse('SEARCH_FAILED', 'Unable to load restaurant tables', 500, requestId, { details: tablesRes.error.message });
  }

  let bookings: any[] = bookingsTsRes.data || [];
  if (!bookings || bookings.length === 0) {
    try {
      const { data: bdData } = await supabase
        .from('bookings')
        .select('table_id, booking_date, booking_time, duration_minutes, status')
        .eq('tenant_id', tenant_id)
        .eq('booking_date', service_date);
      bookings = (bdData || []).map((b: any) => ({
        table_id: b.table_id,
        booking_time: `${b.booking_date}T${b.booking_time || '00:00:00'}`,
        duration_minutes: b.duration_minutes,
        status: b.status,
      }));
    } catch {}
  }

  // Generate local availability strictly from configured hours and tables
  const slots = generateTimeSlots(tablesRes.data || [], bookings || [], Number(party_size), searchDate, windowForDay, tenantTimezone || 'UTC');

  const headers = { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '', 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' };
  return new Response(
    JSON.stringify({ success: true, slots, requestId }),
    { status: 200, headers },
  );
}

async function resolveTimeWindowForDate(supabase: any, tenantId: string, serviceDate: string, tenantTimezone?: string): Promise<{ start: string; end: string } | null> {
  try {
    const tz = tenantTimezone || 'UTC';
    // Determine local day-of-week in tenant timezone (0..6, Sun..Sat)
    const dowLocal = (() => {
      const testDate = new Date(`${serviceDate}T12:00:00Z`); // noon UTC to avoid DST edge
      const dayStr = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(testDate);
      const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return map[dayStr] ?? new Date(serviceDate).getUTCDay();
    })();

    // Use normalized Operations hours only
    const { data: bhAll } = await supabase
      .from('business_hours')
      .select('day_of_week,is_open,open_time,close_time')
      .eq('tenant_id', tenantId);
    if (Array.isArray(bhAll) && bhAll.length > 0) {
      const rec = bhAll.find((r: any) => r.day_of_week === dowLocal);
      if (rec && rec.is_open && rec.open_time && rec.close_time) {
        return { start: `T${rec.open_time}`, end: `T${rec.close_time}` };
      }
      // Explicitly closed
      return null;
    }
  } catch {}
  // No configured hours
  return null;
}

async function handleCreateHold(supabase: any, requestData: any, requestId?: string) {
  try {
    const { tenant_id, slot, party_size } = requestData;

    const apiUrl = "https://services.blunari.ai/api/public/booking/holds";
    const holdPayload = { tenant_id, party_size: Number(party_size), slot, policy_params: {} };

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Supabase-Edge-Function/1.0",
        "X-Request-ID": requestId || crypto.randomUUID(),
      },
      body: JSON.stringify(holdPayload),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`Failed to create booking hold (${apiResponse.status}): ${errorText}`);
    }

    const apiData = await apiResponse.json();

    return new Response(
      JSON.stringify({ success: true, hold_id: apiData.hold_id, expires_at: apiData.expires_at, table_identifiers: apiData.table_identifiers || ["Available Table"], requestId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", 'x-request-id': requestId || '' } },
    );
  } catch (error) {
    // Local fallback
    try {
      const { tenant_id, slot, party_size } = requestData;
      const holdData = { tenant_id, booking_time: slot.time, party_size, duration_minutes: 120, session_id: crypto.randomUUID(), expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() };
      const { data: hold, error: holdError } = await supabase.from("booking_holds").insert(holdData).select().single();
      if (holdError) {
        return errorResponse('HOLD_FAILED', 'Unable to reserve time slot. Please try again.', 500, requestId, { details: holdError.message });
      }
      return new Response(
        JSON.stringify({ success: true, hold_id: hold.id, expires_at: hold.expires_at, table_identifiers: ["Available Table"], _fallback: true, requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", 'x-request-id': requestId || '' } },
      );
    } catch (fallbackError) {
      return errorResponse('HOLD_FAILED', 'Unable to reserve time slot. Please try again.', 500, requestId, { details: `${fallbackError}` });
    }
  }
}

async function handleCreateHoldLocal(supabase: any, requestData: any, requestId?: string) {
  try {
    const { tenant_id, slot, party_size, table_id } = requestData;
    if (!tenant_id || !slot?.time || !party_size) {
      return errorResponse('HOLD_INVALID', 'Missing tenant_id, slot.time or party_size', 400, requestId);
    }
    const holdData = {
      tenant_id,
      booking_time: slot.time,
      party_size: Number(party_size),
      duration_minutes: 120,
      session_id: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
    // Optional: embed table preference
    const { data: hold, error: holdError } = await supabase.from('booking_holds').insert({ ...holdData, table_id: table_id || null }).select().single();
    if (holdError) {
      return errorResponse('HOLD_FAILED', 'Unable to reserve time slot. Please try again.', 500, requestId, { details: holdError.message });
    }
    return new Response(
      JSON.stringify({ success: true, hold_id: hold.id, expires_at: hold.expires_at, table_identifiers: ["Available Table"], _local: true, requestId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '' } },
    );
  } catch (e) {
    return errorResponse('HOLD_FAILED', 'Unable to reserve time slot. Please try again.', 500, requestId, { details: `${e}` });
  }
}

async function handleConfirmReservation(supabase: any, requestData: any, requestId: string | undefined, tenant: any) {
  try {
    const { tenant_id, hold_id, guest_details, idempotency_key } = requestData;

    // Idempotency read (best-effort)
    if (idempotency_key) {
      try {
        const { data: idem } = await supabase
          .from('idempotency_keys')
          .select('status_code, response_json')
          .eq('tenant_id', tenant_id)
          .eq('idempotency_key', idempotency_key)
          .maybeSingle();
        if (idem && idem.response_json) {
          return new Response(JSON.stringify(idem.response_json), { status: idem.status_code || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '' } });
        }
      } catch {}
    }

    const apiUrl = "https://services.blunari.ai/api/public/booking/reservations";
    const reservationPayload = { tenant_id, hold_id, guest_details };

    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Supabase-Edge-Function/1.0",
        "X-Request-ID": requestId || crypto.randomUUID(),
        "X-Idempotency-Key": idempotency_key || crypto.randomUUID(),
      },
      body: JSON.stringify(reservationPayload),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`Failed to confirm reservation (${apiResponse.status}): ${errorText}`);
    }

    const apiData = await apiResponse.json();

    const responseBody = { success: true, reservation_id: apiData.reservation_id, confirmation_number: apiData.confirmation_number, status: apiData.status, summary: apiData.summary, requestId };

    // Idempotency write (best-effort)
    if (idempotency_key) {
      try {
        await supabase.from('idempotency_keys').insert({ tenant_id, idempotency_key, request_id: requestId, status_code: 200, response_json: responseBody });
      } catch {}
    }

    await enqueueNotificationJob({ tenantId: tenant_id, requestId, type: 'email', to: guest_details?.email, template: 'reservation.confirmed', data: { reservation_id: apiData.reservation_id, confirmation_number: apiData.confirmation_number, tenant_name: tenant?.name } });

    return new Response(JSON.stringify(responseBody), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", 'x-request-id': requestId || '' } });
  } catch (error) {
    // Fallback to local booking creation — create PENDING and notify owner for approval
    try {
      const { tenant_id, hold_id, guest_details, idempotency_key } = requestData;
      const { data: hold, error: holdError } = await supabase.from("booking_holds").select("*").eq("id", hold_id).maybeSingle();
      if (holdError || !hold) {
        return errorResponse('HOLD_NOT_FOUND', 'Booking hold not found or expired', 404, requestId, { details: holdError?.message });
      }

      const { data: existing } = await supabase
        .from("bookings")
        .select("id, status")
        .eq("tenant_id", tenant_id)
        .eq("guest_email", guest_details.email)
        .eq("booking_time", hold.booking_time)
        .maybeSingle();

      if (existing) {
        const body = { success: true, reservation_id: existing.id, confirmation_number: `PEND${existing.id.slice(-6).toUpperCase()}`, status: "pending", summary: { date: hold.booking_time, time: new Date(hold.booking_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }), party_size: hold.party_size, table_info: "Pending Approval", deposit_required: false }, _fallback: true, requestId };
        if (idempotency_key) { try { await supabase.from('idempotency_keys').insert({ tenant_id, idempotency_key, request_id: requestId, status_code: 200, response_json: body }); } catch {} }
        await enqueueNotificationJob({ tenantId: tenant_id, requestId, type: 'email', to: tenant?.email || 'owner@blunari.ai', template: 'reservation.review', data: { reservation_id: existing.id, tenant_name: tenant?.name } });
        return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", 'x-request-id': requestId || '' } });
      }

      const bookingData = {
        tenant_id,
        booking_time: hold.booking_time,
        party_size: hold.party_size,
        guest_name: `${guest_details.first_name} ${guest_details.last_name}`,
        guest_email: guest_details.email,
        guest_phone: guest_details.phone || null,
        special_requests: guest_details.special_requests || null,
        status: "pending",
        duration_minutes: hold.duration_minutes,
        deposit_required: false,
        deposit_paid: false,
      };

      const { data: booking, error: bookingError } = await supabase.from("bookings").insert(bookingData).select().single();
      if (bookingError) {
        return errorResponse('CONFIRMATION_FAILED', 'Unable to confirm reservation. Please try again.', 500, requestId, { details: bookingError.message });
      }

      const confirmationNumber = `PEND${booking.id.slice(-6).toUpperCase()}`;
      const body = { success: true, reservation_id: booking.id, confirmation_number: confirmationNumber, status: "pending", summary: { date: booking.booking_time, time: new Date(booking.booking_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }), party_size: booking.party_size, table_info: "Pending Approval", deposit_required: false }, _fallback: true, requestId };
      if (idempotency_key) { try { await supabase.from('idempotency_keys').insert({ tenant_id, idempotency_key, request_id: requestId, status_code: 200, response_json: body }); } catch {} }
      await enqueueNotificationJob({ tenantId: tenant_id, requestId, type: 'email', to: tenant?.email || 'owner@blunari.ai', template: 'reservation.review', data: { reservation_id: booking.id, tenant_name: tenant?.name } });
      return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", 'x-request-id': requestId || '' } });
    } catch (fallbackError) {
      return errorResponse('CONFIRMATION_FAILED', 'Unable to confirm reservation. Please try again.', 500, requestId, { details: `${fallbackError}` });
    }
  }
}

async function handleConfirmReservationLocal(supabase: any, requestData: any, requestId: string | undefined, tenant: any) {
  try {
    const { tenant_id, hold_id, guest_details, idempotency_key, table_id } = requestData;

    if (!tenant_id || !hold_id || !guest_details?.email) {
      return errorResponse('CONFIRMATION_INVALID', 'Missing tenant_id, hold_id, or guest details', 400, requestId);
    }

    // Idempotency check
    if (idempotency_key) {
      try {
        const { data: idem } = await supabase
          .from('idempotency_keys')
          .select('status_code, response_json')
          .eq('tenant_id', tenant_id)
          .eq('idempotency_key', idempotency_key)
          .maybeSingle();
        if (idem && idem.response_json) {
          return new Response(JSON.stringify(idem.response_json), { status: idem.status_code || 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '' } });
        }
      } catch {}
    }

    const { data: hold, error: holdError } = await supabase.from('booking_holds').select('*').eq('id', hold_id).maybeSingle();
    if (holdError || !hold) {
      return errorResponse('HOLD_NOT_FOUND', 'Booking hold not found or expired', 404, requestId, { details: holdError?.message });
    }

    const bookingData = {
      tenant_id,
      booking_time: hold.booking_time,
      party_size: hold.party_size,
      guest_name: `${guest_details.first_name || ''} ${guest_details.last_name || ''}`.trim() || 'Guest',
      guest_email: guest_details.email,
      guest_phone: guest_details.phone || null,
      special_requests: guest_details.special_requests || null,
      status: 'confirmed',
      duration_minutes: hold.duration_minutes,
      deposit_required: false,
      deposit_paid: false,
    };

    // Persist table assignment if provided
    const { data: booking, error: bookingError } = await supabase.from('bookings').insert({ ...bookingData, table_id: table_id || hold.table_id || null }).select().single();
    if (bookingError) {
      return errorResponse('CONFIRMATION_FAILED', 'Unable to confirm reservation. Please try again.', 500, requestId, { details: bookingError.message });
    }

    const confirmationNumber = `CONF${booking.id.slice(-6).toUpperCase()}`;
    const body = { success: true, reservation_id: booking.id, confirmation_number: confirmationNumber, status: 'confirmed', summary: { date: booking.booking_time, time: new Date(booking.booking_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), party_size: booking.party_size, table_info: 'Auto-assigned', deposit_required: false }, _local: true, requestId };
    if (idempotency_key) { try { await supabase.from('idempotency_keys').insert({ tenant_id, idempotency_key, request_id: requestId, status_code: 200, response_json: body }); } catch {} }

    return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId || '' } });
  } catch (e) {
    return errorResponse('CONFIRMATION_FAILED', 'Unable to confirm reservation. Please try again.', 500, requestId, { details: `${e}` });
  }
}

async function enqueueNotificationJob(opts: { tenantId: string; requestId?: string; type: 'email' | 'sms'; to: string; template: string; data: Record<string, unknown> }) {
  try {
    const url = Deno.env.get('BACKGROUND_OPS_URL');
    const apiKey = Deno.env.get('BACKGROUND_OPS_API_KEY'); // maps to X_API_KEY
    const signingSecret = Deno.env.get('BACKGROUND_OPS_SIGNING_SECRET'); // maps to SIGNING_SECRET
    if (!url || !apiKey || !signingSecret) {
      // Not configured; skip silently to avoid breaking booking flow
      return;
    }

    const endpoint = `${url.replace(/\/$/, '')}/api/v1/jobs`;
    const requestId = opts.requestId || crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const idempotencyKey = `notif:${opts.template}:${(opts.data as any)?.reservation_id || ''}`;
    const bodyObj = { type: 'notification.send', payload: { type: opts.type, to: opts.to, template: opts.template, data: opts.data }, priority: 5 };
    const bodyStr = JSON.stringify(bodyObj);

    // HMAC signature over: body + timestamp + tenantId + requestId
    const encoder = new TextEncoder();
    const data = encoder.encode(bodyStr + timestamp + opts.tenantId + requestId);
    const key = await crypto.subtle.importKey('raw', encoder.encode(signingSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBuf = await crypto.subtle.sign('HMAC', key, data);
    const signatureHex = Array.from(new Uint8Array(signatureBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-signature': `sha256=${signatureHex}`,
        'x-timestamp': timestamp,
        'x-tenant-id': opts.tenantId,
        'x-request-id': requestId,
        'x-idempotency-key': idempotencyKey,
      },
      body: bodyStr
    });
    // Ignore failures intentionally
  } catch {
    // Swallow errors to keep booking flow resilient
  }
}

// Robust conversion of a wall-clock time in a specific IANA timezone to a UTC ISO string
function getTzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {} as any;
  for (const p of parts) { if (p.type !== 'literal') map[p.type] = p.value; }
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
  return (asUTC - date.getTime()) / 60000;
}

function zonedWallTimeToUtcISO(serviceDate: Date, hour: number, minute: number, timeZone: string): string {
  const guess = new Date(Date.UTC(serviceDate.getUTCFullYear(), serviceDate.getUTCMonth(), serviceDate.getUTCDate(), hour, minute, 0));
  const offsetMin = getTzOffsetMinutes(guess, timeZone);
  const utc = new Date(guess.getTime() - offsetMin * 60000);
  return utc.toISOString();
}

function generateTimeSlots(
  tables: any[],
  bookings: any[],
  partySize: number,
  date: Date,
  timeWindow?: { start: string; end: string },
  tenantTimezone: string = 'UTC'
) {
  const slots: any[] = [];
  const suitableTables = tables.filter((table) => table.capacity >= partySize);
  // Parse window; default 12:00 to 21:00
  const [startH, startM] = (timeWindow?.start?.replace('T','') || '12:00:00').split(':').map((v) => parseInt(v, 10));
  const [endH, endM] = (timeWindow?.end?.replace('T','') || '21:00:00').split(':').map((v) => parseInt(v, 10));
  const endTotalMin = endH * 60 + (endM || 0);

  for (let hour = startH; hour <= endH; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const iso = zonedWallTimeToUtcISO(date, hour, minute, tenantTimezone);
      const slotTime = new Date(iso);
      const totalMin = hour * 60 + minute;
      if (totalMin >= endTotalMin) break;
      if (slotTime <= new Date()) continue;

      const conflictingBookings = bookings.filter((booking) => {
        const bookingStart = new Date(booking.booking_time);
        const bookingEnd = new Date(bookingStart.getTime() + booking.duration_minutes * 60 * 1000);
        const slotEnd = new Date(slotTime.getTime() + 120 * 60 * 1000);
        return slotTime < bookingEnd && slotEnd > bookingStart;
      });

      const availableTables = suitableTables.length - conflictingBookings.length;
      if (availableTables > 0) {
        slots.push({
          time: iso,
          available_tables: availableTables,
          optimal: hour >= 18 && hour <= 19,
        });
      }
    }
  }
  // Return all slots within business hours
  return slots;
}
