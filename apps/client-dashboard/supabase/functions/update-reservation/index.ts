import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

function corsJson(data: any, requestOrigin: string | null = null, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...createCorsHeaders(requestOrigin) } });
}

interface UpdateReservationRequest {
  reservationId: string;
  tableId?: string;
  start?: string; // ISO
  end?: string;   // ISO
  status?: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: createCorsHeaders(requestOrigin) });
  if (req.method !== 'POST' && req.method !== 'PATCH') return corsJson({ error: 'METHOD_NOT_ALLOWED', message: 'Use POST/PATCH' }, requestOrigin, 405);

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) return corsJson({ error: 'AUTH_REQUIRED', message: 'Authorization header required' }, requestOrigin, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) return corsJson({ error: 'AUTH_INVALID', message: 'Invalid token' }, requestOrigin, 401);

    // Resolve tenant
    const { data: tenantRow } = await supabase
      .from('auto_provisioning')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .maybeSingle();
    const tenantId = tenantRow?.tenant_id as string | undefined;
    if (!tenantId) return corsJson({ error: 'TENANT_NOT_FOUND', message: 'No tenant for user' }, requestOrigin, 404);

    const body = await req.json() as UpdateReservationRequest;
    if (!body.reservationId) return corsJson({ error: 'VALIDATION_ERROR', message: 'reservationId required' }, requestOrigin, 400);
    if (!body.tableId && !body.start && !body.end && !body.status) {
      return corsJson({ error: 'VALIDATION_ERROR', message: 'Nothing to update' }, requestOrigin, 400);
    }

    const updates: Record<string, any> = {};
    if (body.tableId) updates.table_id = body.tableId;
    if (body.start && body.end) {
      const start = new Date(body.start);
      const end = new Date(body.end);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return corsJson({ error: 'VALIDATION_ERROR', message: 'Invalid start/end' }, requestOrigin, 400);
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
    if (updateError) return corsJson({ error: 'DATABASE_ERROR', message: updateError.message }, requestOrigin, 500);
    if (!updated) return corsJson({ error: 'NOT_FOUND', message: 'Reservation not found' }, requestOrigin, 404);

    return corsJson({ data: {
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
    } });
  } catch (e) {
    return corsJson({ error: 'INTERNAL_ERROR', message: `${e}` }, requestOrigin, 500);
  }
});


