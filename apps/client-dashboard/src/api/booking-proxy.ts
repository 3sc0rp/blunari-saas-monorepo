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

    // Derive slug from body (tenant lookups) or URL path as fallback when token absent
    const slugFromBody = (body as any)?.slug || (body as any)?.tenant_slug;
    const slugFromUrl = (() => { try { return new URL(window.location.href).searchParams.get('slug'); } catch { return undefined; } })();
    const slug = slugFromBody || slugFromUrl || undefined;

    const requestBody = {
      ...body,
      token, // server will validate JWT style widget token
      slug: !token && slug ? slug : (body as any)?.slug, // include slug explicitly when no token so server slug fallback works
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
      tenantId: requestBody.tenant_id,
      hasSlug: !!requestBody.slug,
      slug: requestBody.slug
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

    // Get response text first for debugging
    const responseText = await response.text();
    console.log('[booking-proxy] Raw response text:', responseText);
    console.log('[booking-proxy] Response text length:', responseText.length);
    
    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[booking-proxy] Failed to parse response as JSON!');
      console.error('[booking-proxy] Parse error:', parseError);
      console.error('[booking-proxy] Response was:', responseText);
      throw new BookingAPIError("PARSE_ERROR", "Failed to parse server response", {
        requestId,
        responseText,
        parseError
      });
    }
    
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
    console.log('[getTenantBySlug] Looking up tenant with slug:', slug);
    
    // Check if we're in a widget context (has token in URL)
    const urlToken = (() => {
      try { 
        return typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null; 
      } catch { 
        return null; 
      }
    })();
    
    console.log('[getTenantBySlug] Context detection:', {
      hasUrlToken: !!urlToken,
      willUseEdgeFunction: !!urlToken,
      willUseDirectDB: !urlToken
    });
    
    // If widget token present, use edge function to resolve tenant
    if (urlToken) {
      console.log('[getTenantBySlug] Using edge function (widget context)');
      const data = await callEdgeFunction('widget-booking-live', {
        action: 'tenant',
        slug,
      });
      
      // Transform response to expected format
      const tenant = data as any;
      const transformedData = {
        tenant_id: tenant.tenant_id || tenant.id,
        slug: tenant.slug || slug,
        name: tenant.name || slug,
        timezone: tenant.timezone || 'UTC',
        currency: tenant.currency || 'USD',
        business_hours: Array.isArray(tenant.business_hours) ? tenant.business_hours : [],
        branding: tenant.branding || {
          primary_color: '#3b82f6',
          secondary_color: '#1e40af',
        },
        features: tenant.features || {
          deposit_enabled: false,
          revenue_optimization: true,
        },
      };
      
      console.log('[getTenantBySlug] Tenant resolved via edge function:', transformedData.name);
      return TenantInfoSchema.parse(transformedData);
    }
    
    // Dashboard context: use direct database query
    console.log('[getTenantBySlug] Using direct DB query (dashboard context)');
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Query tenants table directly
    const { data: tenantRaw, error } = await supabase
      .from('tenants')
      .select('id, slug, name, timezone, currency, business_hours')
      .eq('slug', slug)
      .maybeSingle();
    // Some generated types may represent errors as data; normalize
    const tenant: any = tenantRaw && (tenantRaw as any).id ? tenantRaw : (error ? null : tenantRaw);

    if (error) {
      console.error('[getTenantBySlug] Database error:', error);
      throw new BookingAPIError('TENANT_LOOKUP_FAILED', `Database error: ${error.message}`);
    }
    
    if (!tenant) {
      console.error('[getTenantBySlug] Tenant not found for slug:', slug);
      throw new BookingAPIError('TENANT_NOT_FOUND', `Restaurant not found: ${slug}`);
    }
    
  console.log('[getTenantBySlug] Tenant found via DB:', { id: (tenant as any).id, name: (tenant as any).name });
    
    const transformedData = {
      tenant_id: (tenant as any).id,
      slug: (tenant as any).slug || slug,
      name: (tenant as any).name || slug,
      timezone: (tenant as any).timezone || 'UTC',
      currency: (tenant as any).currency || 'USD',
      business_hours: Array.isArray((tenant as any).business_hours) ? (tenant as any).business_hours : [],
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
    console.error('[getTenantBySlug] Error:', error);
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
    console.log('[confirmReservation] === STARTING CONFIRMATION ===');
    console.log('[confirmReservation] Request:', JSON.stringify(request, null, 2));
    console.log('[confirmReservation] Idempotency key:', idempotencyKey);
    
    let rawData = await callEdgeFunction("widget-booking-live", {
      action: "confirm",
      idempotency_key: idempotencyKey,
      tenant_id: request.tenant_id,
      hold_id: request.hold_id,
      guest_details: request.guest_details,
      table_id: (request as any).table_id,
      deposit: (request as any).deposit,
      source: (request as any).source,
    });

    console.log('[confirmReservation] ✅ Raw data received from edge function:');
    console.log(JSON.stringify(rawData, null, 2));
    console.log('[confirmReservation] Data type:', typeof rawData);
    console.log('[confirmReservation] Data keys:', rawData ? Object.keys(rawData as any) : 'NO KEYS - data is null/undefined');

    // CRITICAL CHECK: Is the response wrapped in a 'data' property?
    if (rawData && (rawData as any).data && typeof (rawData as any).data === 'object') {
      console.log('[confirmReservation] ⚠️  Response is wrapped in a "data" property - unwrapping...');
      rawData = (rawData as any).data;
      console.log('[confirmReservation] Unwrapped data:', JSON.stringify(rawData, null, 2));
      console.log('[confirmReservation] Unwrapped data keys:', Object.keys(rawData as any));
    }

    // CRITICAL CHECK: Is there an error in the response?
    if (rawData && (rawData as any).error) {
      console.error('[confirmReservation] ❌ Edge function returned an error:', (rawData as any).error);
      throw new BookingAPIError(
        'EDGE_FUNCTION_ERROR',
        (rawData as any).error?.message || 'Edge function returned an error',
        { error: (rawData as any).error, rawResponse: rawData }
      );
    }

    // CRITICAL CHECK: Is this an empty object?
    if (rawData && typeof rawData === 'object' && Object.keys(rawData as any).length === 0) {
      console.error('[confirmReservation] ❌ Edge function returned an empty object!');
      console.error('[confirmReservation] This usually means the edge function failed silently.');
      console.error('[confirmReservation] Request was:', { request, idempotencyKey });
      throw new BookingAPIError(
        'EMPTY_RESPONSE',
        'The server returned an empty response. The booking may not have been created.',
        { rawResponse: rawData, request, idempotencyKey }
      );
    }

    // Normalize any upstream variations into our stable schema
    const normalized = normalizeReservationResponse(rawData);
    
    console.log('[confirmReservation] ✅ After normalization:');
    console.log(JSON.stringify(normalized, null, 2));
    
    // Try to parse and catch detailed Zod errors
    let validated;
    try {
      validated = ReservationResponseSchema.parse(normalized);
    } catch (zodError: any) {
      console.error('[confirmReservation] ❌ Schema validation failed!');
      console.error('[confirmReservation] Zod error details:', JSON.stringify(zodError, null, 2));
      if (zodError?.issues) {
        console.error('[confirmReservation] Validation issues:');
        zodError.issues.forEach((issue: any) => {
          console.error(`  - Path: ${issue.path.join('.')} | Message: ${issue.message} | Received: ${JSON.stringify(issue.received)}`);
        });
      }
      throw new BookingAPIError(
        'SCHEMA_VALIDATION_FAILED',
        'Response from server does not match expected format',
        { zodError, normalized }
      );
    }
    
    console.log('[confirmReservation] ✅ After schema validation:');
    console.log(JSON.stringify(validated, null, 2));
    
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
    
    console.log('[confirmReservation] ✅ SUCCESS - Returning validated reservation:', validated.reservation_id);
    return validated;
  } catch (error) {
    console.error('[confirmReservation] ❌ Error occurred:', error);
    if (error instanceof BookingAPIError) {
      throw error;
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

    // Debug logging in development
    console.log('[normalizeReservationResponse] === RESPONSE NORMALIZATION ===');
    console.log('[normalizeReservationResponse] Input data keys:', Object.keys(d));
    console.log('[normalizeReservationResponse] Input data:', JSON.stringify(d, null, 2));
    
    // Extract reservation_id - check all possible field names
    const reservationId = d.reservation_id || d.reservationId || d.id || d.booking_id;
    
    console.log('[normalizeReservationResponse] Checking for reservation_id:');
    console.log('  d.reservation_id:', d.reservation_id);
    console.log('  d.reservationId:', d.reservationId);
    console.log('  d.id:', d.id);
    console.log('  d.booking_id:', d.booking_id);
    console.log('  => Selected reservationId:', reservationId);
    console.log('  => Type:', typeof reservationId);
    
    let confirmationNumber = d.confirmation_number || d.confirmationNumber || d.reference || d.code;
    let status: string = (d.status || d.state || d.reservation_status || 'pending').toString().toLowerCase();
    
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
      console.error('[normalizeReservationResponse] Cannot proceed without reservation_id - throwing error');
      // Don't return a partial object - throw an error instead
      throw new BookingAPIError(
        'MISSING_RESERVATION_ID',
        'Server did not return a reservation ID. The booking may not have been created.',
        { rawResponse: d }
      );
    }
    
    const allowed = new Set(['confirmed', 'pending', 'waitlisted']);
    if (!allowed.has(status)) {
      console.log('[normalizeReservationResponse] Status not in allowed set, defaulting to pending for moderation. Original:', status);
      status = 'pending';  // Default to pending for moderation workflow
    } else {
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
      reservation_id: String(reservationId), // Always convert to string since we validated it exists
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

    console.log('[normalizeReservationResponse] ✅ Final normalized result:', JSON.stringify(normalizedResult, null, 2));
    return normalizedResult;
  } catch (error) {
    console.error('[normalizeReservationResponse] ❌ Error in normalization:', error);
    console.error('[normalizeReservationResponse] Input was:', input);
    // Re-throw the error instead of returning the malformed input
    // This ensures validation will properly fail rather than passing through bad data
    throw error;
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
