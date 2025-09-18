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
function getUserAccessTokenFromStorage(supabaseUrl?: string): string | undefined {
  try {
    if (!supabaseUrl || typeof window === 'undefined') return undefined;
    const { hostname } = new URL(supabaseUrl);
    const projectRef = hostname.split('.')[0];
    const key = `sb-${projectRef}-auth-token`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    // supabase v2 stores in currentSession, but be defensive
    return (
      parsed?.currentSession?.access_token ||
      parsed?.access_token ||
      parsed?.session?.access_token ||
      undefined
    );
  } catch {
    return undefined;
  }
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

    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Prefer user JWT when available (dashboard) to pass auth to edge function; fallback to anon key
          Authorization: `Bearer ${getUserAccessTokenFromStorage(supabaseUrl) || supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new BookingAPIError(
        "HTTP_ERROR",
        `HTTP ${response.status}: ${errorText}`,
      );
    }

    const data = await response.json();

    if ((data as any)?.success === false && (data as any)?.error) {
      const err: any = data as any;
      throw new BookingAPIError(
        err.error.code || "API_ERROR",
        err.error.message,
        err.error,
      );
    }

    if (!data) {
      throw new BookingAPIError(
        "NO_DATA",
        "No data received from booking service",
      );
    }

    return data;
  } catch (error) {
    if (error instanceof BookingAPIError) {
      throw error;
    }
    throw new BookingAPIError(
      "NETWORK_ERROR",
      `Failed to communicate with booking service`,
      error as any,
    );
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
    const payload = (json && typeof json === 'object' && 'data' in json) ? (json as any).data : json;
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

export async function createHold(request: HoldRequest) {
  try {
    const data = await callEdgeFunction("widget-booking-live", {
      action: "hold",
      party_size: request.party_size,
      slot: request.slot,
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
      hold_id: request.hold_id,
      guest_details: request.guest_details,
    });

    return ReservationResponseSchema.parse(data);
  } catch (error) {
    throw new BookingAPIError(
      "RESERVATION_CONFIRMATION_FAILED",
      "Failed to confirm reservation",
      error as any,
    );
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
