import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Helper functions for CORS responses
function createCorsResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function createErrorResponse(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Type definitions
interface TablePosition {
  x: number;
  y: number;
}

interface RestaurantTable {
  id: string;
  name: string;
  section: string;
  seats: number;
  status: 'AVAILABLE' | 'RESERVED' | 'SEATED' | 'OCCUPIED' | 'OUT_OF_ORDER';
  position?: TablePosition;
}

interface DatabaseTable {
  id: string;
  name: string;
  section?: string;
  capacity?: number;
  seats?: number;
  status?: string;
  position?: TablePosition;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

interface BookingData {
  table_id: string;
  booking_time: string;
  duration_minutes?: number;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show';
}

interface TenantData {
  tenant_id: string;
}

// Constants
const DEFAULT_DURATION_MINUTES = 90;
const MOCK_TABLE_COUNT = 20;
const TABLE_SECTIONS = ['Patio', 'Bar', 'Main'] as const;
const SEAT_OPTIONS = [2, 4, 6, 8] as const;

type TableSection = typeof TABLE_SECTIONS[number];

// Utility functions
const generateMockTables = (): RestaurantTable[] => {
  return Array.from({ length: MOCK_TABLE_COUNT }, (_, i): RestaurantTable => {
    const tableId = `table-${i + 1}`;
    let section: TableSection;
    
    if (i < 6) section = 'Patio';
    else if (i < 12) section = 'Bar';
    else section = 'Main';

    return {
      id: tableId,
      name: `Table ${i + 1}`,
      section,
      seats: SEAT_OPTIONS[Math.floor(Math.random() * SEAT_OPTIONS.length)],
      status: 'AVAILABLE',
      position: {
        x: Math.floor(Math.random() * 400) + 50,
        y: Math.floor(Math.random() * 300) + 50
      }
    };
  });
};

const mapDatabaseTableToRestaurantTable = (dbTable: DatabaseTable): RestaurantTable => {
  return {
    id: dbTable.id,
    name: dbTable.name,
    section: dbTable.section || 'Main',
    seats: dbTable.capacity || dbTable.seats || 4,
    status: (dbTable.status as RestaurantTable['status']) || 'AVAILABLE',
    position: dbTable.position
  };
};

const isTableCurrentlyOccupied = (
  table: RestaurantTable, 
  bookings: BookingData[], 
  currentTime: Date
): { isOccupied: boolean; status: RestaurantTable['status'] } => {
  const currentReservation = bookings.find((booking: BookingData) => {
    if (booking.table_id !== table.id) return false;
    
    const bookingStart = new Date(booking.booking_time);
    const duration = booking.duration_minutes || DEFAULT_DURATION_MINUTES;
    const bookingEnd = new Date(bookingStart.getTime() + (duration * 60 * 1000));
    
    return bookingStart <= currentTime && currentTime <= bookingEnd;
  });

  if (currentReservation) {
    return {
      isOccupied: true,
      status: currentReservation.status === 'seated' ? 'SEATED' : 'RESERVED'
    };
  }

  return { isOccupied: false, status: 'AVAILABLE' };
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
    // Initialize Supabase client with environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return createErrorResponse('CONFIG_ERROR', 'Server configuration error', 500);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate and validate user
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return createErrorResponse('AUTH_REQUIRED', 'Authorization header required', 401);
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader);
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return createErrorResponse('AUTH_INVALID', 'Invalid authorization token', 401);
    }

    // Get tenant information using the same logic as the tenant function
    let tenantId: string | null = null;

    // Method 1: Check if user has explicit tenant assignment in user_tenant_access
    const { data: userTenantAccess } = await supabaseClient
      .from('user_tenant_access')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (userTenantAccess) {
      tenantId = userTenantAccess.tenant_id;
    }

    // Method 2: Check if user is provisioned in auto_provisioning
    if (!tenantId) {
      const { data: autoProvisionData } = await supabaseClient
        .from('auto_provisioning')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .single()

      if (autoProvisionData) {
        tenantId = autoProvisionData.tenant_id;
      }
    }

    // Method 3: Assign to demo tenant if no specific assignment (for demo purposes)
    if (!tenantId) {
      const { data: demoTenant } = await supabaseClient
        .from('tenants')
        .select('id')
        .eq('slug', 'demo')
        .eq('status', 'active')
        .single()

      if (demoTenant) {
        tenantId = demoTenant.id;
      }
    }

    if (!tenantId) {
      console.error('No tenant found for user:', user.id)
      return createErrorResponse('TENANT_NOT_FOUND', 'No tenant found for user', 404);
    }

    // Fetch restaurant tables with explicit field selection
    const { data: tablesData, error: tablesError } = await supabaseClient
      .from('restaurant_tables')
      .select(`
        id,
        name,
        section,
        capacity,
        seats,
        status,
        position,
        tenant_id,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .order('name');

    let tables: RestaurantTable[] = [];

    if (tablesData && tablesData.length > 0) {
      // Use real table data from database
      tables = tablesData.map((table: DatabaseTable) => 
        mapDatabaseTableToRestaurantTable(table)
      );
    } else {
      // Generate mock tables for demo (TODO: Remove in production)
      console.warn('No restaurant tables found, generating mock data');
      tables = generateMockTables();
    }

    // Get current reservations to update table statuses
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: bookingsData, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select(`
        table_id,
        booking_time,
        duration_minutes,
        status
      `)
      .eq('tenant_id', tenantId)
      .gte('booking_time', startOfDay.toISOString())
      .lte('booking_time', endOfDay.toISOString())
      .in('status', ['confirmed', 'seated']);

    if (bookingsError) {
      console.error('Bookings query error:', bookingsError);
      // Continue without status updates rather than failing completely
    }

    // Update table statuses based on current reservations
    if (bookingsData && bookingsData.length > 0) {
      tables = tables.map((table: RestaurantTable): RestaurantTable => {
        const occupancyCheck = isTableCurrentlyOccupied(
          table, 
          bookingsData as BookingData[], 
          now
        );

        if (occupancyCheck.isOccupied) {
          return {
            ...table,
            status: occupancyCheck.status
          };
        }

        return table;
      });
    }

    // Build response with metadata
    const responseData = {
      data: tables,
      meta: {
        tenant_id: tenantId,
        total_tables: tables.length,
        sections: [...new Set(tables.map(t => t.section))],
        status_counts: tables.reduce((acc, table) => {
          acc[table.status] = (acc[table.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        last_updated: now.toISOString(),
        data_source: tablesData && tablesData.length > 0 ? 'database' : 'mock'
      }
    };

    return createCorsResponse(responseData);

  } catch (error) {
    console.error('List tables function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse('INTERNAL_ERROR', `Internal server error: ${errorMessage}`, 500);
  }
});
