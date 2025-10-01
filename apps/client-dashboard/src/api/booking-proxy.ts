// Live booking API proxy via Supabase Edge Functions
// Note: This module is safe for public widget runtime – it does NOT import supabase-js.
import {
  TenantInfoSchema,
  AvailabilityResponseSchema,
  HoldResponseSchema,
  ReservationResponseSchema,
  PolicyResponseSchema,
  SearchRequest,
  HoldRequest,
  ReservationRequest,
} from "@/types/booking-api";

class BookingAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "BookingAPIError";
  }
}

// Live API functions using Supabase edge functions
async function getUserAccessToken(supabaseUrl?: string): Promise<string | undefined> {
  try {
    if (!supabaseUrl || typeof window === 'undefined') return undefined;
    const { hostname } = new URL(supabaseUrl);
    const projectRef = hostname.split('.')[0];
    const key = `sb-${projectRef}-auth-token`;
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = (
        parsed?.currentSession?.access_token ||
        parsed?.access_token ||
        parsed?.session?.access_token ||
        undefined
      );
      if (token) return token;
    }
  } catch {}
  // Fallback to querying supabase client if available (dashboard runtime only)
  try {
    const mod = await import('@/integrations/supabase/client');
    const client = (mod as any)?.supabase;
    if (client?.auth?.getSession) {
      const { data } = await client.auth.getSession();
      return data?.session?.access_token || undefined;
    }
  } catch {}
  // For development/demo, return a demo user token if available
  if (import.meta.env.MODE === 'development') {
    try {
      const mod = await import('@/integrations/supabase/client');
      const client = (mod as any)?.supabase;
      // Try to get current session one more time
      const session = await client.auth.getSession();
      if (session?.data?.session?.access_token) {
        return session.data.session.access_token;
      }
    } catch {}
  }
  return undefined;
}
async function callEdgeFunction(
  functionName: string,
  body: Record<string, unknown> = {},
): Promise<unknown> {
  try {
    // Pull token from URL (public widget runtime)
    const token = (() => {
      try { return new URLSearchParams(window.location.search).get('token') || undefined; } catch { return undefined; }
    })();

    const requestBody = {
      ...body,
      token, // let server validate and resolve slug→tenant_id when present (widget path)
      // Allow explicit tenant_id from dashboard flows; server will verify access
      tenant_id: (body as any)?.tenant_id ?? undefined,
      timestamp: new Date().toISOString(),
    };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const userJwt = await getUserAccessToken(supabaseUrl);
    
    // Enhanced debug logging
    console.log('[booking-proxy] === API CALL DETAILS ===');
    console.log('[booking-proxy] Function:', functionName);
    console.log('[booking-proxy] Auth details:', {
      hasUserJwt: !!userJwt,
      userJwtPreview: userJwt ? userJwt.substring(0, 30) + '...' : 'NONE',
      usingAnonKey: !userJwt,
      hasWidgetToken: !!requestBody.token,
      widgetTokenPreview: requestBody.token?.toString().substring(0, 20) + '...',
      authorizationHeader: userJwt ? 'Using User JWT' : 'Using Anon Key',
      supabaseUrl,
      hasSupabaseKey: !!supabaseKey
    });
    console.log('[booking-proxy] Request body:', {
      ...requestBody,
      token: requestBody.token ? '[REDACTED]' : undefined,
      hasTenantId: !!requestBody.tenant_id,
      tenantId: requestBody.tenant_id
    });
    
    const requestId = crypto.randomUUID();
    console.log('[booking-proxy] Making request with ID:', requestId);
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Prefer user JWT when available (dashboard) to pass auth to edge function; fallback to anon key
          Authorization: `Bearer ${userJwt || supabaseKey}`,
          apikey: supabaseKey,
          "x-correlation-id": requestId,
        },
        body: JSON.stringify(requestBody),
      },
    );
    
    console.log('[booking-proxy] Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      requestId
    });

    if (!response.ok) {
      let errorText = await response.text();
      console.error('[booking-proxy] API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        requestId,
        functionName
      });
      
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.code) {
          errorText = `${parsed.error.code}: ${parsed.error.message || ''}`.trim();
        }
      } catch {}
      throw new BookingAPIError("HTTP_ERROR", `HTTP ${response.status}: ${errorText}`, {
        requestId,
        endpoint: functionName,
        requestBody: requestBody,
      });
    }

    const data = await response.json();
    console.log('[booking-proxy] Response data:', data);
    console.log('[booking-proxy] Response keys:', Object.keys(data || {}));
    console.log('[booking-proxy] Response has reservation_id?', !!(data as any)?.reservation_id);

    if ((data as any)?.success === false && (data as any)?.error) {
      const err: any = data as any;
      console.error('[booking-proxy] API returned error:', err);
      throw new BookingAPIError(err.error.code || "API_ERROR", err.error.message, {
        ...err.error,
        requestId,
      });
    }

    if (!data) {
      throw new BookingAPIError("NO_DATA", "No data received from booking service", { requestId });
    }

    return data;
  } catch (error) {
    if (error instanceof BookingAPIError) {
      throw error;
    }
    throw new BookingAPIError("NETWORK_ERROR", `Failed to communicate with booking service`, error as any);
  }
}

export async function getTenantBySlug(slug: string) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase configuration');

    // Call lightweight public tenant resolver Edge Function
    const token = (() => {
      try { return new URLSearchParams(window.location.search).get('token') || undefined; } catch { return undefined; }
    })();

    const res = await fetch(`${supabaseUrl}/functions/v1/tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Send anon key for rate limiting context; widget token enables auth-less path server-side
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({ slug, token })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new BookingAPIError('TENANT_LOOKUP_FAILED', `HTTP ${res.status}: ${txt}`);
    }

    const json = await res.json();
    // Handle both response formats: {data: ...}, {tenant: ...}, or direct tenant object
    const payload = (json && typeof json === 'object' && 'data' in json) 
      ? (json as any).data 
      : (json && typeof json === 'object' && 'tenant' in json)
        ? (json as any).tenant
        : json;
    const transformedData = {
      tenant_id: payload.id,
      slug: payload.slug || slug,
      name: payload.name || slug,
      timezone: payload.timezone || 'UTC',
      currency: payload.currency || 'USD',
      business_hours: Array.isArray(payload.business_hours) ? payload.business_hours : [],
      branding: {
        primary_color: '#3b82f6',
        secondary_color: '#1e40af',
      },
      features: {
        deposit_enabled: false,
        revenue_optimization: true,
      },
    };

    return TenantInfoSchema.parse(transformedData);
  } catch (error) {
    if (error instanceof BookingAPIError) {
      throw error;
    }
    throw new BookingAPIError(
      "TENANT_LOOKUP_FAILED",
      "Failed to lookup restaurant information",
      error as any,
    );
  }
}

export async function searchAvailability(request: SearchRequest) {
  try {
    const payload = {
      action: "search",
      party_size: request.party_size,
      service_date: request.service_date,
      time_window: request.time_window,
    };

    const data = await callEdgeFunction("widget-booking-live", payload);
    return AvailabilityResponseSchema.parse(data);
  } catch (error) {
    throw new BookingAPIError(
      "AVAILABILITY_SEARCH_FAILED",
      "Failed to search availability",
      error as any,
    );
  }
}

export async function createHold(request: HoldRequest, idempotencyKey?: string) {
  try {
    const data = await callEdgeFunction("widget-booking-live", {
      action: "hold",
      tenant_id: request.tenant_id,
      party_size: request.party_size,
      slot: request.slot,
      table_id: (request as any).table_id,
      idempotency_key: idempotencyKey,
    });
    return HoldResponseSchema.parse(data);
  } catch (error) {
    throw new BookingAPIError(
      "HOLD_CREATION_FAILED",
      "Failed to create booking hold",
      error as any,
    );
  }
}

export async function confirmReservation(
  request: ReservationRequest,
  idempotencyKey: string,
) {
  try {
    const data = await callEdgeFunction("widget-booking-live", {
      action: "confirm",
      idempotency_key: idempotencyKey,
      tenant_id: request.tenant_id,
      hold_id: request.hold_id,
      guest_details: request.guest_details,
      table_id: (request as any).table_id,
        deposit: (request as any).deposit,
        source: (request as any).source,
    });

    // Debug logging in development
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('[confirmReservation] Raw data from edge function:', JSON.stringify(data, null, 2));
    }

    // Normalize any upstream variations into our stable schema
    const normalized = normalizeReservationResponse(data);
    
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('[confirmReservation] After normalization:', JSON.stringify(normalized, null, 2));
    }
    
    const validated = ReservationResponseSchema.parse(normalized);
    
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('[confirmReservation] After schema validation:', JSON.stringify(validated, null, 2));
    }
    
    // Critical check: If reservation_id is null, the booking creation failed
    if (!validated.reservation_id) {
      console.error('[confirmReservation] ❌ CRITICAL: Booking creation failed - no reservation_id returned');
      console.error('[confirmReservation] This means the edge function failed to create the booking');
      throw new BookingAPIError(
        "BOOKING_CREATION_FAILED",
        "Booking creation failed. Please try again or contact support.",
        { validated, normalized }
      );
    }
    
    return validated;
  } catch (error) {
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('[confirmReservation] Error occurred:', error);
    }
    throw new BookingAPIError(
      "RESERVATION_CONFIRMATION_FAILED",
      "Failed to confirm reservation",
      error as any,
    );
  }
}

// Map various upstream payload shapes to our stable schema to avoid UX regressions
function normalizeReservationResponse(input: any): any {
  try {
    const d = input || {};

    const reservationId = d.reservation_id || d.reservationId || d.id;
    let confirmationNumber = d.confirmation_number || d.confirmationNumber || d.reference || d.code;
    let status: string = (d.status || d.state || d.reservation_status || 'pending').toString().toLowerCase();
    
    // Debug logging in development
    console.log('[normalizeReservationResponse] === RESPONSE NORMALIZATION ===');
    console.log('[normalizeReservationResponse] Input data keys:', Object.keys(d));
    console.log('[normalizeReservationResponse] Input data:', JSON.stringify(d, null, 2));
    console.log('[normalizeReservationResponse] Extracted reservation_id:', reservationId);
    console.log('[normalizeReservationResponse] reservation_id type:', typeof reservationId);
    console.log('[normalizeReservationResponse] Raw status from input:', d.status);
    console.log('[normalizeReservationResponse] Resolved status:', status);
    
    if (!reservationId) {
      console.error('[normalizeReservationResponse] ❌ CRITICAL: No reservation_id found in response!');
      console.error('[normalizeReservationResponse] Available fields to check:', {
        reservation_id: d.reservation_id,
        reservationId: d.reservationId, 
        id: d.id,
        booking_id: d.booking_id,
        // Check all fields that might contain the ID
        allFields: Object.keys(d)
      });
    }
    
    const allowed = new Set(['confirmed', 'pending', 'waitlisted']);
    if (!allowed.has(status)) {
      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
        console.log('[normalizeReservationResponse] Status not in allowed set, defaulting to pending for moderation. Original:', status);
      }
      status = 'pending';  // Default to pending for moderation workflow
    } else if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('[normalizeReservationResponse] Status is valid:', status);
    }

    const summary = d.summary || {};
    let dateLike = summary.date || d.date || d.booking_time || summary.datetime;
    let timeLike = summary.time || d.time;

    if (!dateLike && typeof d.booking_time === 'string') {
      dateLike = d.booking_time;
    }
    let isoDate: string | undefined = undefined;
    let timeStr: string | undefined = undefined;
    if (dateLike) {
      const parsed = new Date(dateLike);
      if (!isNaN(parsed.getTime())) {
        isoDate = parsed.toISOString();
        timeStr = timeLike || parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }

    const partySize = Number((summary.party_size ?? d.party_size ?? d.guests ?? d.covers) || 0);
    if (!confirmationNumber && reservationId) {
      const idStr = String(reservationId);
      confirmationNumber = `CONF${idStr.slice(-6).toUpperCase()}`;
    }

    const normalizedResult = {
      reservation_id: reservationId ? String(reservationId) : null, // Don't convert undefined to "undefined"
      confirmation_number: String(confirmationNumber || 'CONFXXXXXX'),
      status,
      summary: {
        date: isoDate || (typeof dateLike === 'string' ? dateLike : new Date().toISOString()),
        time: timeStr,
        party_size: partySize,
        table_info: summary.table_info || d.table || undefined,
        deposit_required: Boolean(summary.deposit_required ?? d.deposit_required),
        deposit_amount: Number(summary.deposit_amount ?? d.deposit_amount ?? NaN) || undefined,
      },
    };

    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('[normalizeReservationResponse] Final normalized result:', JSON.stringify(normalizedResult, null, 2));
    }
    return normalizedResult;
  } catch (error) {
    if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {
      console.log('[normalizeReservationResponse] Error in normalization:', error);
      console.log('[normalizeReservationResponse] Returning raw input:', input);
    }
    return input;
  }
}

export async function getTenantPolicies(tenantId: string) {
  try {
    // For now, return default policies - can be enhanced with database queries
    const data = {
      deposit: {
        enabled: false,
      },
      cancellation: {
        allowed_hours: 24,
        fee_percentage: 10,
      },
    };

    return PolicyResponseSchema.parse(data);
  } catch (error) {
    throw new BookingAPIError(
      "POLICY_RETRIEVAL_FAILED",
      "Failed to retrieve policies",
      error as any,
    );
  }
}

// Deposits
export async function createDepositIntent(params: { tenant_id: string; amount_cents: number; email?: string; description?: string }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase configuration');

  const res = await fetch(`${supabaseUrl}/functions/v1/create-deposit-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      tenant_id: params.tenant_id,
      amount: params.amount_cents,
      email: params.email,
      description: params.description || 'Booking deposit',
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Deposit intent failed: ${txt}`);
  }
  const json = await res.json();
  if (!json?.client_secret) throw new Error('No client_secret returned');
  return json.client_secret as string;
}

export async function sendAnalyticsEvent(
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const url = import.meta.env.VITE_BACKGROUND_OPS_URL;
    const apiKey = import.meta.env.VITE_BACKGROUND_OPS_API_KEY;
    if (!url || !apiKey) {
      // Fallback to console if not configured
      console.log("Analytics event:", event, data);
      return;
    }
    const body = {
      type: `widget.${event}`,
      payload: data,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
    await fetch(`${url.replace(/\/$/, '')}/api/v1/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // Swallow analytics errors; do not disrupt UX
  }
}
