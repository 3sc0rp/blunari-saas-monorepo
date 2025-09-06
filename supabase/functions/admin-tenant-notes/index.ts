import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment-aware CORS configuration for admin functions
const getAllowedOrigins = () => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  if (environment === 'production') {
    return [
      'https://admin.blunari.ai',
      'https://services.blunari.ai',
      'https://blunari.ai',
      'https://www.blunari.ai',
    ];
  }

  // Development origins
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
  ];
};

const createOriginHeader = (requestOrigin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  if (environment === 'development') return '*';
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return allowedOrigins[0] || '*';
};

const createCorsHeaders = (requestOrigin: string | null = null) => ({
  'Access-Control-Allow-Origin': createOriginHeader(requestOrigin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, accept, accept-language, content-length, sentry-trace, baggage',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
});

const createCorsResponse = (data?: any, status: number = 200, requestOrigin: string | null = null) => {
  return new Response(
    data ? JSON.stringify(data) : null,
    {
      status,
      headers: {
        ...createCorsHeaders(requestOrigin),
        'Content-Type': 'application/json',
      },
    },
  );
};

const createErrorResponse = (code: string, message: string, status: number = 500, requestId?: string, requestOrigin: string | null = null) => {
  return createCorsResponse({
    error: {
      code,
      message,
      requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    },
  }, status, requestOrigin);
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: createCorsHeaders(origin) });
  try {
    // Parse JSON body safely
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return createErrorResponse('INVALID_JSON', 'Invalid JSON in request body', 400, undefined, origin);
    }

    const { tenantId, action, note } = requestBody;
    if (!tenantId) return createErrorResponse('MISSING_TENANT_ID','tenantId required',400,undefined,origin);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')||'', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return createErrorResponse('NO_AUTH','Missing Authorization',401,undefined,origin);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ',''));
    if (authErr || !user) return createErrorResponse('UNAUTHORIZED','Unauthorized',401,undefined,origin);

    if (action === 'list') {
      const { data } = await supabase.from('tenant_internal_notes').select('id, note, created_by, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50);
      return createCorsResponse({ success: true, data: data || [], requestId: crypto.randomUUID() }, 200, origin);
    }

    if (action === 'create') {
      if (!note) return createErrorResponse('MISSING_NOTE','note required',400,undefined,origin);
      const { data, error } = await supabase.from('tenant_internal_notes').insert({ tenant_id: tenantId, note, created_by: user.id }).select('id, note, created_by, created_at').single();
      if (error) return createErrorResponse('DB', error.message, 500, undefined, origin);
      return createCorsResponse({ success: true, data, requestId: crypto.randomUUID() }, 200, origin);
    }

    return createErrorResponse('INVALID_ACTION','Unsupported action',400,undefined,origin);
  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
