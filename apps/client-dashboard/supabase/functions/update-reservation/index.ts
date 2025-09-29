import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const createCorsHeaders = (requestOrigin: string | null = null) => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';
  
  let allowedOrigin = '*';
  if (environment === 'production' && requestOrigin) {
    const allowedOrigins = [
      'https://app.blunari.ai',
      'https://demo.blunari.ai',
      'https://admin.blunari.ai', 
      'https://services.blunari.ai',
      'https://blunari.ai',
      'https://www.blunari.ai'
    ];
    
    if (allowedOrigins.some(origin => requestOrigin.startsWith(origin))) {
      allowedOrigin = requestOrigin;
    }
  } else if (environment === 'development') {
    allowedOrigin = requestOrigin || '*';
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant-id, x-request-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };
};

const createCorsResponse = (data: any, status: number = 200, requestOrigin: string | null = null) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: createCorsHeaders(requestOrigin)
  });
};

const createErrorResponse = (error: string, message: string, status: number = 500, requestId?: string, requestOrigin: string | null = null) => {
  return createCorsResponse({
    error,
    message,
    requestId,
    timestamp: new Date().toISOString()
  }, status, requestOrigin);
};

interface UpdateReservationRequest {
  reservationId: string;
  tableId?: string;
  start?: string; // ISO
  end?: string;   // ISO
  status?: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: createCorsHeaders(requestOrigin) });
  }
  
  // Only allow POST and PATCH methods
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return createErrorResponse('METHOD_NOT_ALLOWED', 'Use POST/PATCH', 405, undefined, requestOrigin);
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return createErrorResponse('SERVER_CONFIG_ERROR', 'Server configuration error', 500, requestId, requestOrigin);
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return createErrorResponse('AUTH_REQUIRED', 'Authorization header required', 401, requestId, requestOrigin);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return createErrorResponse('AUTH_INVALID', 'Invalid token', 401, requestId, requestOrigin);
    }

    // Resolve tenant
    const { data: tenantRow } = await supabase
      .from('auto_provisioning')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .maybeSingle();
    const tenantId = tenantRow?.tenant_id as string | undefined;
    if (!tenantId) {
      return createErrorResponse('TENANT_NOT_FOUND', 'No tenant for user', 404, requestId, requestOrigin);
    }

    const body = await req.json() as UpdateReservationRequest;
    if (!body.reservationId) {
      return createErrorResponse('VALIDATION_ERROR', 'reservationId required', 400, requestId, requestOrigin);
    }
    if (!body.tableId && !body.start && !body.end && !body.status) {
      return createErrorResponse('VALIDATION_ERROR', 'Nothing to update', 400, requestId, requestOrigin);
    }

    const updates: Record<string, any> = {};
    if (body.tableId) updates.table_id = body.tableId;
    if (body.start && body.end) {
      const start = new Date(body.start);
      const end = new Date(body.end);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return createErrorResponse('VALIDATION_ERROR', 'Invalid start/end', 400, requestId, requestOrigin);
      }
      updates.booking_time = start.toISOString();
      updates.duration_minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    }
    if (body.status) updates.status = body.status.toLowerCase();

    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', body.reservationId)
      .select()
      .maybeSingle();
    if (updateError) {
      console.error('Database update error:', updateError.message);
      return createErrorResponse('DATABASE_ERROR', updateError.message, 500, requestId, requestOrigin);
    }
    if (!updated) {
      return createErrorResponse('NOT_FOUND', 'Reservation not found', 404, requestId, requestOrigin);
    }

    console.log(`Reservation ${body.reservationId} updated successfully`);

    return createCorsResponse({ 
      data: {
        id: updated.id,
        tenantId: updated.tenant_id,
        tableId: updated.table_id,
        section: 'Main',
        start: updated.booking_time,
        end: new Date(new Date(updated.booking_time).getTime() + (updated.duration_minutes || 90) * 60000).toISOString(),
        partySize: updated.party_size,
        channel: 'WEB',
        vip: Boolean(updated.special_requests?.toLowerCase?.().includes('vip')),
        guestName: updated.guest_name,
        guestPhone: updated.guest_phone,
        guestEmail: updated.guest_email,
        status: (updated.status || 'confirmed').toString().toUpperCase(),
        depositRequired: !!updated.deposit_amount,
        depositAmount: updated.deposit_amount,
        specialRequests: updated.special_requests || undefined,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      },
      requestId: requestId
    }, 200, requestOrigin);
  } catch (e) {
    console.error('Internal error in update-reservation:', e);
    return createErrorResponse('INTERNAL_ERROR', `${e}`, 500, requestId, requestOrigin);
  }
});


