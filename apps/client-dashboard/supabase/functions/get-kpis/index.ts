import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, createCorsResponse, createErrorResponse } from '../_shared/cors'

// Type definitions
interface KpiRequest {
  date: string; // YYYY-MM-DD format
}

interface Booking {
  id: string;
  tenant_id: string;
  booking_time: string;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show';
  party_size: number;
  duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

interface KpiData {
  id: string;
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'default';
  spark: number[];
  hint: string;
  format: 'percentage' | 'number';
}

interface TenantData {
  tenant_id: string;
}

// Constants
const DEFAULT_DURATION_MINUTES = 90;
const DEFAULT_TOTAL_TABLES = 20;
const NO_SHOW_RISK_MULTIPLIER = 0.15;
const KITCHEN_LOAD_MULTIPLIER = 20;

// Utility functions
const generateSparkline = (base: number, variance: number = 10): number[] => {
  return Array.from({ length: 12 }, () => 
    Math.max(0, base + (Math.random() - 0.5) * variance)
  );
};

const isValidDateString = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const isValidDate = date instanceof Date && !isNaN(date.getTime());
  const matchesFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  return isValidDate && matchesFormat;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return createErrorResponse('METHOD_NOT_ALLOWED', 'Only GET requests are allowed', 405);
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return createErrorResponse('CONFIG_ERROR', 'Server configuration error', 500);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate authorization
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return createErrorResponse('AUTH_REQUIRED', 'Authorization header required', 401);
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return createErrorResponse('AUTH_INVALID', 'Invalid authorization token', 401);
    }

    // Get tenant information
    const { data: tenantData, error: tenantError } = await supabaseClient
      .from('auto_provisioning')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single();

    if (tenantError || !tenantData) {
      console.error('Tenant lookup error:', tenantError);
      return createErrorResponse('TENANT_NOT_FOUND', 'No tenant found for user', 404);
    }

    const tenantId = (tenantData as TenantData).tenant_id;

    // Parse and validate request parameters
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    if (!isValidDateString(dateParam)) {
      return createErrorResponse('INVALID_DATE', 'Invalid date format. Use YYYY-MM-DD', 400);
    }

    // Build date range for the requested date
    const startDate = new Date(dateParam);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateParam);
    endDate.setHours(23, 59, 59, 999);

    // Fetch bookings for the specified date with proper error handling
    const { data: bookingsData, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        tenant_id,
        booking_time,
        status,
        party_size,
        duration_minutes,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .gte('booking_time', startDate.toISOString())
      .lte('booking_time', endDate.toISOString());

    if (bookingsError) {
      console.error('Bookings query error:', bookingsError);
      return createErrorResponse('DATABASE_ERROR', 'Failed to fetch bookings data', 500);
    }

    const bookings: Booking[] = bookingsData || [];

    // Get total tables count (TODO: Replace with actual restaurant_tables query)
    const totalTables = DEFAULT_TOTAL_TABLES;

    // Calculate KPIs with proper type safety
    const confirmedBookings = bookings.filter((booking: Booking) => 
      booking.status === 'confirmed' || booking.status === 'seated'
    );
    const completedBookings = bookings.filter((booking: Booking) => 
      booking.status === 'completed'
    );
    const cancelledBookings = bookings.filter((booking: Booking) => 
      booking.status === 'cancelled'
    );
    
    // Calculate current occupancy
    const currentTime = new Date();
    const occupiedTables = bookings.filter((booking: Booking) => {
      const bookingStart = new Date(booking.booking_time);
      const duration = booking.duration_minutes || DEFAULT_DURATION_MINUTES;
      const bookingEnd = new Date(bookingStart.getTime() + (duration * 60 * 1000));
      
      return booking.status === 'seated' && 
             bookingStart <= currentTime && 
             currentTime <= bookingEnd;
    }).length;
    
    const occupancy = Math.round((occupiedTables / totalTables) * 100);

    // Calculate total covers (guests)
    const covers = confirmedBookings.reduce((sum: number, booking: Booking) => 
      sum + (booking.party_size || 0), 0
    );

    // Calculate no-show risk based on upcoming reservations
    const upcomingBookings = bookings.filter((booking: Booking) => {
      const bookingTime = new Date(booking.booking_time);
      return booking.status === 'confirmed' && bookingTime > currentTime;
    });
    const noShowRisk = upcomingBookings.length > 0 ? 
      Math.min(100, Math.round(upcomingBookings.length * NO_SHOW_RISK_MULTIPLIER * 100)) : 0;

    // Calculate average party size
    const avgPartySize = confirmedBookings.length > 0 ? 
      Math.round((covers / confirmedBookings.length) * 10) / 10 : 0;

    // Calculate kitchen load based on current hour activity
    const currentHour = currentTime.getHours();
    const currentHourBookings = bookings.filter((booking: Booking) => {
      const bookingHour = new Date(booking.booking_time).getHours();
      return bookingHour === currentHour && booking.status === 'seated';
    }).length;
    const kitchenPacing = Math.min(100, currentHourBookings * KITCHEN_LOAD_MULTIPLIER);

    // Generate sparkline data for trending visualization
    const generateSparkline = (base: number, variance: number = 10): number[] => {
      return Array.from({ length: 12 }, () => 
        Math.max(0, Math.round((base + (Math.random() - 0.5) * variance) * 100) / 100)
      );
    };

    // Build comprehensive KPI response
    const kpis: KpiData[] = [
      {
        id: 'occupancy',
        label: 'Occupancy',
        value: `${occupancy}%`,
        tone: occupancy > 80 ? 'success' : occupancy > 60 ? 'default' : 'warning',
        spark: generateSparkline(occupancy, 15),
        hint: `${occupiedTables} of ${totalTables} tables occupied`,
        format: 'percentage'
      },
      {
        id: 'covers',
        label: 'Covers',
        value: covers.toString(),
        tone: 'default',
        spark: generateSparkline(covers, 8),
        hint: `${confirmedBookings.length} confirmed reservations`,
        format: 'number'
      },
      {
        id: 'no-show-risk',
        label: 'No-Show Risk',
        value: `${noShowRisk}%`,
        tone: noShowRisk > 20 ? 'danger' : noShowRisk > 10 ? 'warning' : 'success',
        spark: generateSparkline(noShowRisk, 5),
        hint: `Based on ${upcomingBookings.length} upcoming reservations`,
        format: 'percentage'
      },
      {
        id: 'avg-party',
        label: 'Avg Party Size',
        value: avgPartySize.toString(),
        tone: 'default',
        spark: generateSparkline(avgPartySize, 0.5),
        hint: 'Average guests per reservation',
        format: 'number'
      },
      {
        id: 'kitchen-pacing',
        label: 'Kitchen Load',
        value: `${kitchenPacing}%`,
        tone: kitchenPacing > 80 ? 'danger' : kitchenPacing > 60 ? 'warning' : 'success',
        spark: generateSparkline(kitchenPacing, 20),
        hint: `${currentHourBookings} orders this hour`,
        format: 'percentage'
      }
    ];

    // Add request metadata for debugging
    const responseData = {
      data: kpis,
      meta: {
        date: dateParam,
        tenant_id: tenantId,
        total_bookings: bookings.length,
        confirmed_bookings: confirmedBookings.length,
        completed_bookings: completedBookings.length,
        cancelled_bookings: cancelledBookings.length,
        calculated_at: new Date().toISOString()
      }
    };

    return createCorsResponse(responseData);

  } catch (error) {
    console.error('KPI calculation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse('INTERNAL_ERROR', `Internal server error: ${errorMessage}`, 500);
  }
});
