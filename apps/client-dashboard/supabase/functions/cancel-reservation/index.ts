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

interface CancelReservationRequest { reservationId: string; reason?: string }

serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: createCorsHeaders(requestOrigin) });
  if (req.method !== 'POST') return corsJson({ error: 'METHOD_NOT_ALLOWED', message: 'Use POST' }, requestOrigin, 405);

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) return corsJson({ error: 'AUTH_REQUIRED', message: 'Authorization header required' }, requestOrigin, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) return corsJson({ error: 'AUTH_INVALID', message: 'Invalid token' }, requestOrigin, 401);

    const { data: tenantRow } = await supabase
      .from('auto_provisioning')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .maybeSingle();
    const tenantId = tenantRow?.tenant_id as string | undefined;
    if (!tenantId) return corsJson({ error: 'TENANT_NOT_FOUND', message: 'No tenant for user' }, requestOrigin, 404);

    const body = await req.json() as CancelReservationRequest;
    if (!body.reservationId) return corsJson({ error: 'VALIDATION_ERROR', message: 'reservationId required' }, requestOrigin, 400);

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', special_requests: body.reason ? body.reason : undefined })
      .eq('tenant_id', tenantId)
      .eq('id', body.reservationId);
    if (updateError) return corsJson({ error: 'DATABASE_ERROR', message: updateError.message }, requestOrigin, 500);

    return corsJson({ data: { cancelled: true } }, requestOrigin);
  } catch (e) {
    return corsJson({ error: 'INTERNAL_ERROR', message: `${e}` }, requestOrigin, 500);
  }
});


