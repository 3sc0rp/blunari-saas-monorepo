// Live booking API proxy via Supabase Edge Functions
import { supabase } from '@/integrations/supabase/client';
import { 
  TenantInfoSchema, 
  AvailabilityResponseSchema, 
  HoldResponseSchema, 
  ReservationResponseSchema, 
  PolicyResponseSchema,
  SearchRequest,
  HoldRequest,
  ReservationRequest,
  APIError 
} from '@/types/booking-api';

class BookingAPIError extends Error {
  constructor(public code: string, message: string, public details?: any) {
    super(message);
    this.name = 'BookingAPIError';
  }
}

// Live API functions using Supabase edge functions
async function callEdgeFunction(functionName: string, body: any = {}): Promise<any> {
  try {
    console.log(`Calling edge function: ${functionName}`, body);
    
    // Ensure we always send a valid object with required fields
    const requestBody = {
      ...body,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Final request body being sent:', requestBody);
    
    // Use fetch directly as a fallback since Supabase invoke might have issues
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('Edge function HTTP response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge function HTTP error:', response.status, errorText);
      throw new BookingAPIError('HTTP_ERROR', `HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Edge function response data:', data);

    // Check for data validity
    if (data.success === false && data.error) {
      throw new BookingAPIError(data.error.code || 'API_ERROR', data.error.message, data.error);
    }

    if (!data) {
      console.error('No data received from edge function');
      throw new BookingAPIError('NO_DATA', 'No data received from booking service');
    }

    console.log('Raw edge function data:', data);

    // Handle different response formats
    if (typeof data === 'string') {
      try {
        const parsedData = JSON.parse(data);
        console.log('Parsed string response:', parsedData);
        return parsedData;
      } catch (parseError) {
        console.error('Failed to parse string response:', parseError);
        throw new BookingAPIError('PARSE_ERROR', 'Invalid response format from booking service');
      }
    }

    if (data.success === false && data.error) {
      throw new BookingAPIError(data.error.code || 'API_ERROR', data.error.message, data.error);
    }

    return data;
  } catch (error) {
    if (error instanceof BookingAPIError) {
      throw error;
    }
    console.error(`Failed to call edge function ${functionName}:`, error);
    throw new BookingAPIError('NETWORK_ERROR', `Failed to communicate with booking service`, error);
  }
}

export async function getTenantBySlug(slug: string) {
  try {
    // Use the secure public view for tenant lookup
    const { data: tenantData, error } = await supabase
      .from('tenant_public_info')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !tenantData) {
      throw new BookingAPIError('TENANT_NOT_FOUND', `Restaurant not found: ${slug}`);
    }

    const transformedData = {
      tenant_id: tenantData.id,
      slug: tenantData.slug,
      name: tenantData.name,
      timezone: tenantData.timezone,
      currency: tenantData.currency,
      branding: {
        primary_color: '#3b82f6', // Default primary color
        secondary_color: '#1e40af', // Default secondary color
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
    throw new BookingAPIError('TENANT_LOOKUP_FAILED', 'Failed to lookup restaurant information', error);
  }
}

export async function searchAvailability(request: SearchRequest) {
  try {
    const payload = {
      action: 'search',
      ...request,
    };
    
    console.log('Sending search availability payload:', payload);
    
    const data = await callEdgeFunction('widget-booking-live', payload);
    
    return AvailabilityResponseSchema.parse(data);
  } catch (error) {
    console.error('Availability search error details:', error);
    throw new BookingAPIError('AVAILABILITY_SEARCH_FAILED', 'Failed to search availability', error);
  }
}

export async function createHold(request: HoldRequest) {
  try {
    const data = await callEdgeFunction('widget-booking-live', {
      action: 'hold',
      ...request,
    });
    
    return HoldResponseSchema.parse(data);
  } catch (error) {
    throw new BookingAPIError('HOLD_CREATION_FAILED', 'Failed to create booking hold', error);
  }
}

export async function confirmReservation(
  request: ReservationRequest, 
  idempotencyKey: string
) {
  try {
    const data = await callEdgeFunction('widget-booking-live', {
      action: 'confirm',
      idempotency_key: idempotencyKey,
      ...request,
    });
    
    return ReservationResponseSchema.parse(data);
  } catch (error) {
    throw new BookingAPIError('RESERVATION_CONFIRMATION_FAILED', 'Failed to confirm reservation', error);
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
    throw new BookingAPIError('POLICY_RETRIEVAL_FAILED', 'Failed to retrieve policies', error);
  }
}

export async function sendAnalyticsEvent(
  event: string, 
  data: Record<string, any>
): Promise<void> {
  // For demo, we'll just log analytics events
  // In production, this should be replaced with actual analytics API calls
  console.log('Analytics event:', event, data);
  return Promise.resolve();
}
