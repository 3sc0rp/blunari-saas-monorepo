import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const createCorsHeaders = (requestOrigin: string | null = null) => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  const normalize = (origin: string | null) => { try { if (!origin) return null; const u = new URL(origin); return `${u.protocol}//${u.host}`; } catch { return null; } };
  const origin = normalize(requestOrigin);
  const isAllowed = (o: string | null) => {
    if (!o) return false;
    try { const { hostname, protocol } = new URL(o); if (protocol !== 'https:') return false; if (hostname.endsWith('.blunari.ai') || ['app.blunari.ai','demo.blunari.ai','admin.blunari.ai','services.blunari.ai','blunari.ai','www.blunari.ai'].includes(hostname)) return true; return false; } catch { return false; }
  };

  let allowedOrigin = '*';
  if (environment === 'production') {
    allowedOrigin = isAllowed(origin) ? (origin as string) : 'https://app.blunari.ai';
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, x-correlation-id, accept, accept-language, content-length',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
};

// Helper functions for CORS responses
function createCorsResponse(data: any, requestOrigin: string | null = null) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...createCorsHeaders(requestOrigin),
    },
  });
}

function createErrorResponse(code: string, message: string, status: number, requestOrigin: string | null = null) {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...createCorsHeaders(requestOrigin),
    },
  });
}

interface TablePosition { x: number; y: number }

interface RestaurantTable {
  id: string;
  name: string;
  section: 'Patio' | 'Bar' | 'Main' | string;
  seats: number;
  status: 'AVAILABLE' | 'SEATED' | 'RESERVED' | 'MAINTENANCE' | 'OUT_OF_ORDER';
  position?: TablePosition;
}

interface DatabaseTable {
  id: string;
  name: string;
  section?: string; // legacy or custom
  location_zone?: string; // current schema
  capacity?: number;
  seats?: number; // legacy/custom
  status?: string; // 'available' | 'occupied' | 'reserved' | 'maintenance'
  position?: TablePosition; // legacy/custom JSON
  position_x?: number; // current schema
  position_y?: number; // current schema
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

interface BookingData { table_id: string; booking_time: string; duration_minutes: number; status: string }

const mapDatabaseStatusToUi = (status?: string): RestaurantTable['status'] => {
  switch ((status || '').toLowerCase()) {
    case 'available':
      return 'AVAILABLE';
    case 'reserved':
      return 'RESERVED';
    case 'maintenance':
      return 'MAINTENANCE';
    case 'occupied':
      return 'SEATED';
    default:
      return 'AVAILABLE';
  }
};

const mapDatabaseTableToRestaurantTable = (dbTable: DatabaseTable): RestaurantTable => {
  const section = (dbTable.section || dbTable.location_zone || 'Main') as RestaurantTable['section'];
  const seats = dbTable.capacity || dbTable.seats || 4;
  const status = mapDatabaseStatusToUi(dbTable.status);
  const position: TablePosition | undefined =
    typeof dbTable.position_x === 'number' && typeof dbTable.position_y === 'number'
      ? { x: dbTable.position_x, y: dbTable.position_y }
      : dbTable.position;

  return { id: dbTable.id, name: dbTable.name, section, seats, status, position };
};

function isTableCurrentlyOccupied(
  table: RestaurantTable,
  bookings: BookingData[],
  now: Date
): { isOccupied: boolean; status: RestaurantTable['status'] } {
  const relevant = bookings.filter((b) => b.table_id === table.id);
  for (const b of relevant) {
    const start = new Date(b.booking_time);
    const end = new Date(start.getTime() + (b.duration_minutes || 90) * 60 * 1000);
    if (start <= now && now <= end && (b.status === 'confirmed' || b.status === 'seated')) {
      return { isOccupied: true, status: b.status === 'seated' ? 'SEATED' : 'RESERVED' };
    }
  }
  return { isOccupied: false, status: 'AVAILABLE' };
}

serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: createCorsHeaders(requestOrigin) });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return createErrorResponse('METHOD_NOT_ALLOWED', 'Only GET requests are allowed', 405, requestOrigin);
  }

  try {
    // Initialize Supabase client with environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return createErrorResponse('CONFIG_ERROR', 'Server configuration error', 500, requestOrigin);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate and validate user
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return createErrorResponse('AUTH_REQUIRED', 'Authorization header required', 401, requestOrigin);
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader);
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return createErrorResponse('AUTH_INVALID', 'Invalid authorization token', 401, requestOrigin);
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
      tenantId = (userTenantAccess as any).tenant_id;
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
        tenantId = (autoProvisionData as any).tenant_id;
      }
    }

    if (!tenantId) {
      console.error('No tenant found for user:', user.id)
      return createErrorResponse('TENANT_NOT_FOUND', 'No tenant found for user', 404, requestOrigin);
    }

    // Fetch restaurant tables (schema-safe: use *)
    const { data: tablesData, error: tablesError } = await supabaseClient
      .from('restaurant_tables')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (tablesError) {
      console.error('Tables query error:', tablesError)
      return createErrorResponse('DATABASE_ERROR', 'Failed to fetch tables', 500, requestOrigin);
    }

    let tables: RestaurantTable[] = [];

    if (tablesData && tablesData.length > 0) {
      tables = tablesData.map((table: DatabaseTable) => 
        mapDatabaseTableToRestaurantTable(table)
      );
    }

    // Get current reservations to update table statuses (support both schemas)
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let bookingsData: BookingData[] = [];
    // Attempt schema with TIMESTAMPTZ booking_time
    const { data: btData, error: btError } = await supabaseClient
      .from('bookings')
      .select('table_id, booking_time, duration_minutes, status')
      .eq('tenant_id', tenantId)
      .gte('booking_time', startOfDay.toISOString())
      .lte('booking_time', endOfDay.toISOString())
      .in('status', ['confirmed', 'seated']);

    if (!btError && btData) {
      bookingsData = btData as unknown as BookingData[];
    } else {
      // Fallback schema: booking_date (DATE) + booking_time (TIME)
      const { data: bdData } = await supabaseClient
        .from('bookings')
        .select('table_id, booking_date, booking_time, duration_minutes, status')
        .eq('tenant_id', tenantId)
        .eq('booking_date', now.toISOString().slice(0, 10))
        .in('status', ['confirmed', 'seated']);

      bookingsData = (bdData || []).map((b: any) => ({
        table_id: b.table_id,
        booking_time: `${b.booking_date}T${(b.booking_time || '00:00:00')}`,
        duration_minutes: b.duration_minutes,
        status: b.status,
      }));
    }

    // Update table statuses based on current reservations
    if (bookingsData && bookingsData.length > 0 && tables.length > 0) {
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
        data_source: 'database'
      }
    };

    return createCorsResponse(responseData, requestOrigin);

  } catch (error) {
    console.error('List tables function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse('INTERNAL_ERROR', `Internal server error: ${errorMessage}`, 500, requestOrigin);
  }
});
