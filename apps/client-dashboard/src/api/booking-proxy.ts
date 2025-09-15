// Live booking API proxy via Supabase Edge Functions
import { supabase } from "@/integrations/supabase/client";
import {
  TenantInfoSchema,
  AvailabilityResponseSchema,
  HoldResponseSchema,
  ReservationResponseSchema,
  PolicyResponseSchema,
  SearchRequest,
  HoldRequest,
  ReservationRequest,
  APIError,
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
async function callEdgeFunction(
  functionName: string,
  body: Record<string, unknown> = {},
): Promise<unknown> {
  try {
    console.log(`Calling edge function: ${functionName}`, body);

    // Pull token from URL (public widget runtime)
    const token = (() => {
      try { return new URLSearchParams(window.location.search).get('token') || undefined; } catch { return undefined; }
    })();

    const requestBody = {
      ...body,
      token, // let server validate and resolve slug→tenant_id
      tenant_id: undefined, // never trust client tenant_id
      timestamp: new Date().toISOString(),
    };

    console.log("Final request body being sent:", requestBody);

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
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify(requestBody),
      },
    );

    console.log("Edge function HTTP response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Edge function HTTP error:", response.status, errorText);
      throw new BookingAPIError(
        "HTTP_ERROR",
        `HTTP ${response.status}: ${errorText}`,
      );
    }

    const data = await response.json();
    console.log("Edge function response data:", data);

    if (data?.success === false && data?.error) {
      throw new BookingAPIError(
        data.error.code || "API_ERROR",
        data.error.message,
        data.error,
      );
    }

    if (!data) {
      console.error("No data received from edge function");
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
    console.error(`Failed to call edge function ${functionName}:`, error);
    throw new BookingAPIError(
      "NETWORK_ERROR",
      `Failed to communicate with booking service`,
      error,
    );
  }
}

export async function getTenantBySlug(slug: string) {
  try {
    // Use the secure public view for tenant lookup
    const { data: tenantData, error } = await supabase
      .from("tenant_public_info")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !tenantData) {
      throw new BookingAPIError(
        "TENANT_NOT_FOUND",
        `Restaurant not found: ${slug}`,
      );
    }

    const transformedData = {
      tenant_id: tenantData.id,
      slug: tenantData.slug,
      name: tenantData.name,
      timezone: tenantData.timezone,
      currency: tenantData.currency,
      branding: {
        primary_color: "#3b82f6", // Default primary color
        secondary_color: "#1e40af", // Default secondary color
      },
      features: {
        deposit_enabled: false, // Get from policies later
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
      error,
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
      error,
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
      error,
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
      error,
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
      error,
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
