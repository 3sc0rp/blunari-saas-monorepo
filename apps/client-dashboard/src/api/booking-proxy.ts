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

// Type definitions for external module imports and API responses
interface SupabaseClientModule {
  supabase?: {
    auth?: {
      getSession?: () => Promise<{ data?: { session?: { access_token?: string } } }>;
    };
  };
}

interface EdgeFunctionRequestBody {
  slug?: string;
  tenant_slug?: string;
  tenant_id?: string;
  token?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface EdgeFunctionErrorResponse {
  success: false;
  error: {
    code?: string;
    message: string;
    [key: string]: unknown;
  };
}

interface EdgeFunctionResponse {
  success?: boolean;
  error?: {
    code?: string;
    message: string;
    [key: string]: unknown;
  };
  data?: unknown;
  [key: string]: unknown;
}

interface TenantDatabaseRow {
  id: string;
  slug: string;
  name: string;
  timezone?: string;
  currency?: string;
}

interface BusinessHoursRow {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

interface ReservationSummary {
  date?: string;
  datetime?: string;
  time?: string;
  party_size?: number;
  table_info?: string;
  deposit_required?: boolean;
  deposit_amount?: number;
}

interface RawReservationResponse {
  reservation_id?: string;
  reservationId?: string;
  id?: string;
  booking_id?: string;
  confirmation_number?: string;
  confirmationNumber?: string;
  reference?: string;
  code?: string;
  status?: string;
  state?: string;
  reservation_status?: string;
  summary?: ReservationSummary;
  date?: string;
  time?: string;
  booking_time?: string;
  party_size?: number;
  guests?: number;
  covers?: number;
  table?: string;
  deposit_required?: boolean;
  deposit_amount?: number;
  [key: string]: unknown;
}

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
  } catch (error) {
    console.error('Failed to parse localStorage supabase data:', error);
    // Continue to next fallback method
  }
  // Fallback to querying supabase client if available (dashboard runtime only)
  try {
    const mod = await import('@/integrations/supabase/client') as SupabaseClientModule;
    const client = mod?.supabase;
    if (client?.auth?.getSession) {
      const { data } = await client.auth.getSession();
      return data?.session?.access_token || undefined;
    }
  } catch (error) {
    console.error('Failed to import supabase client or get session:', error);
    // Continue to next fallback method
  }
  // For development/demo, return a demo user token if available
  if (import.meta.env.MODE === 'development') {
    try {
      const mod = await import('@/integrations/supabase/client') as SupabaseClientModule;
      const client = mod?.supabase;
      // Try to get current session one more time
      const session = await client?.auth?.getSession();
      if (session?.data?.session?.access_token) {
        return session.data.session.access_token;
      }
    } catch (error) {
      console.error('Failed to get development session:', error);
      // Return undefined to allow widget to work in unauthenticated mode
    }
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
    const requestBody = body as EdgeFunctionRequestBody;
    const slugFromBody = requestBody?.slug || requestBody?.tenant_slug;
    const slugFromUrl = (() => { try { return new URL(window.location.href).searchParams.get('slug'); } catch { return undefined; } })();
    const slug = slugFromBody || slugFromUrl || undefined;

    const payload: EdgeFunctionRequestBody = {
      ...body,
      token, // server will validate JWT style widget token
      slug: !token && slug ? slug : requestBody?.slug, // include slug explicitly when no token so server slug fallback works
      tenant_id: requestBody?.tenant_id ?? undefined,
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
      hasWidgetToken: !!payload.token,
      widgetTokenPreview: payload.token?.toString().substring(0, 20) + '...',
      authorizationHeader: userJwt ? 'Using User JWT' : 'Using Anon Key',
      supabaseUrl,
      hasSupabaseKey: !!supabaseKey
    });
    console.log('[booking-proxy] Request body:', {
      ...payload,
      token: payload.token ? '[REDACTED]' : undefined,
      hasTenantId: !!payload.tenant_id,
      tenantId: payload.tenant_id,
      hasSlug: !!payload.slug,
      slug: payload.slug
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
        body: JSON.stringify(payload),
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
      } catch (error) {
        console.error('Failed to parse error response JSON:', error);
        // Use original errorText if parsing fails
      }
      throw new BookingAPIError("HTTP_ERROR", `HTTP ${response.status}: ${errorText}`, {
        requestId,
        endpoint: functionName,
        requestBody: payload,
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
    
    const typedData = data as EdgeFunctionResponse;
    console.log('[booking-proxy] Response has reservation_id?', !!typedData?.reservation_id);

    if (typedData?.success === false && typedData?.error) {
      console.error('[booking-proxy] API returned error:', typedData.error);
      throw new BookingAPIError(
        typedData.error.code || "API_ERROR",
        typedData.error.message,
        {
          ...typedData.error,
          requestId,
        }
      );
    }

    if (!data) {
      throw new BookingAPIError("NO_DATA", "No data received from booking service", { requestId });
    }

    return data;
  } catch (error) {
    if (error instanceof BookingAPIError) {
      throw error;
    }
    const err = error as Error;
    throw new BookingAPIError("NETWORK_ERROR", `Failed to communicate with booking service`, {
      message: err?.message,
      name: err?.name,
    });
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
      const tenant = data as RawReservationResponse & {
        tenant_id?: string;
        slug?: string;
        name?: string;
        timezone?: string;
        currency?: string;
        business_hours?: BusinessHoursRow[];
        branding?: { primary_color?: string; secondary_color?: string };
        features?: { deposit_enabled?: boolean; revenue_optimization?: boolean };
      };
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
    
    // Query tenants table directly (without business_hours column that doesn't exist)
    const { data: tenantRaw, error } = await supabase
      .from('tenants')
      .select('id, slug, name, timezone, currency')
      .eq('slug', slug)
      .maybeSingle();
    
    // Some generated types may represent errors as data; normalize
    const tenant = (tenantRaw && (tenantRaw as TenantDatabaseRow).id) 
      ? (tenantRaw as TenantDatabaseRow) 
      : null;

    if (error) {
      console.error('[getTenantBySlug] Database error:', error);
      throw new BookingAPIError('TENANT_LOOKUP_FAILED', `Database error: ${error.message}`);
    }
    
    if (!tenant) {
      console.error('[getTenantBySlug] Tenant not found for slug:', slug);
      throw new BookingAPIError('TENANT_NOT_FOUND', `Restaurant not found: ${slug}`);
    }
    
    console.log('[getTenantBySlug] Tenant found via DB:', { id: tenant.id, name: tenant.name });
    
    // Fetch business hours separately from the business_hours table
    let businessHours: BusinessHoursRow[] = [];
    try {
      const { data: bhData } = await supabase
        .from('business_hours')
        .select('day_of_week, is_open, open_time, close_time')
        .eq('tenant_id', tenant.id);
      
      if (bhData && Array.isArray(bhData)) {
        businessHours = bhData as BusinessHoursRow[];
      }
    } catch (bhError) {
      console.warn('[getTenantBySlug] Failed to fetch business hours:', bhError);
      // Continue without business hours - not critical
    }
    
    const transformedData = {
      tenant_id: tenant.id,
      slug: tenant.slug || slug,
      name: tenant.name || slug,
      timezone: tenant.timezone || 'UTC',
      currency: tenant.currency || 'USD',
      business_hours: businessHours,
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
    const err = error as Error;
    throw new BookingAPIError(
      "TENANT_LOOKUP_FAILED",
      "Failed to lookup restaurant information",
      {
        message: err?.message,
        name: err?.name,
      },
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
    const err = error as Error;
    throw new BookingAPIError(
      "AVAILABILITY_SEARCH_FAILED",
      "Failed to search availability",
      {
        message: err?.message,
        name: err?.name,
      },
    );
  }
}

export async function createHold(request: HoldRequest, idempotencyKey?: string) {
  try {
    const requestBody = request as HoldRequest & { table_id?: string };
    const data = await callEdgeFunction("widget-booking-live", {
      action: "hold",
      tenant_id: request.tenant_id,
      party_size: request.party_size,
      slot: request.slot,
      table_id: requestBody.table_id,
      idempotency_key: idempotencyKey,
    });
    return HoldResponseSchema.parse(data);
  } catch (error) {
    const err = error as Error;
    throw new BookingAPIError(
      "HOLD_CREATION_FAILED",
      "Failed to create booking hold",
      {
        message: err?.message,
        name: err?.name,
      },
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
    
    const extendedRequest = request as ReservationRequest & {
      table_id?: string;
      deposit?: unknown;
      source?: string;
    };
    
    let rawData = await callEdgeFunction("widget-booking-live", {
      action: "confirm",
      idempotency_key: idempotencyKey,
      tenant_id: request.tenant_id,
      hold_id: request.hold_id,
      guest_details: request.guest_details,
      table_id: extendedRequest.table_id,
      deposit: extendedRequest.deposit,
      source: extendedRequest.source,
    });

    console.log('[confirmReservation] ✅ Raw data received from edge function:');
    console.log(JSON.stringify(rawData, null, 2));
    console.log('[confirmReservation] Data type:', typeof rawData);
    
    const typedRawData = rawData as EdgeFunctionResponse;
    console.log('[confirmReservation] Data keys:', rawData ? Object.keys(typedRawData) : 'NO KEYS - data is null/undefined');

    // CRITICAL CHECK: Is the response wrapped in a 'data' property?
    if (typedRawData?.data && typeof typedRawData.data === 'object') {
      console.log('[confirmReservation] ⚠️  Response is wrapped in a "data" property - unwrapping...');
      rawData = typedRawData.data;
      console.log('[confirmReservation] Unwrapped data:', JSON.stringify(rawData, null, 2));
      console.log('[confirmReservation] Unwrapped data keys:', Object.keys(rawData as EdgeFunctionResponse));
    }

    // CRITICAL CHECK: Is there an error in the response?
    const unwrappedData = rawData as EdgeFunctionResponse;
    if (unwrappedData?.error) {
      console.error('[confirmReservation] ❌ Edge function returned an error:', unwrappedData.error);
      throw new BookingAPIError(
        'EDGE_FUNCTION_ERROR',
        unwrappedData.error?.message || 'Edge function returned an error',
        { error: unwrappedData.error, rawResponse: rawData }
      );
    }

    // CRITICAL CHECK: Is this an empty object?
    if (unwrappedData && typeof unwrappedData === 'object' && Object.keys(unwrappedData).length === 0) {
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
    const err = error as Error;
    throw new BookingAPIError(
      "RESERVATION_CONFIRMATION_FAILED",
      "Failed to confirm reservation",
      {
        message: err?.message,
        name: err?.name,
      },
    );
  }
}

// Map various upstream payload shapes to our stable schema to avoid UX regressions
function normalizeReservationResponse(input: unknown): RawReservationResponse {
  try {
    const d = (input || {}) as RawReservationResponse;

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
    const timeLike = summary.time || d.time;

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
    const err = error as Error;
    throw new BookingAPIError(
      "POLICY_RETRIEVAL_FAILED",
      "Failed to retrieve policies",
      {
        message: err?.message,
        name: err?.name,
      },
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
