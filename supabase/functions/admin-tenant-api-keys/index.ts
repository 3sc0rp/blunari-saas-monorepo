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
});

function createCorsResponse(data?: any, status: number = 200, requestOrigin: string | null = null) {
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
}

function createErrorResponse(code: string, message: string, status: number = 500, requestId?: string, requestOrigin: string | null = null) {
  return createCorsResponse({
    error: {
      code,
      message,
      requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    },
  }, status, requestOrigin);
}

async function hashKey(key: string) {
  const enc = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: createCorsHeaders(origin) });
  
  try {
    const { action, tenantId, name, keyId } = await req.json();
    if (!tenantId) return createErrorResponse('MISSING_TENANT_ID', 'tenantId required', 400, undefined, origin);
    
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');

    if (action === 'list') {
      const { data, error } = await supabase.from('api_keys').select('id, name, created_at, last_used_at, revoked_at').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      if (error) return createErrorResponse('DB_ERROR', error.message, 500, undefined, origin);
      return createCorsResponse({ success: true, data }, 200, origin);
    }

    if (action === 'create') {
      if (!name) return createErrorResponse('MISSING_NAME', 'name required', 400, undefined, origin);
      const raw = 'bln_' + crypto.randomUUID().replace(/-/g,'').slice(0,24);
      const hashed = await hashKey(raw);
      const { data, error } = await supabase.from('api_keys').insert({ tenant_id: tenantId, name, hashed_key: hashed }).select('id, name, created_at').single();
      if (error) return createErrorResponse('DB_ERROR', error.message, 500, undefined, origin);
      return createCorsResponse({ success: true, data: { ...data, apiKey: raw } }, 200, origin);
    }

    if (action === 'revoke') {
      if (!keyId) return createErrorResponse('MISSING_KEY_ID', 'keyId required', 400, undefined, origin);
      const { error } = await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', keyId).eq('tenant_id', tenantId);
      if (error) return createErrorResponse('DB_ERROR', error.message, 500, undefined, origin);
      return createCorsResponse({ success: true }, 200, origin);
    }

    return createErrorResponse('INVALID_ACTION', 'Unsupported action', 400, undefined, origin);
  } catch (e) {
    return createErrorResponse('INTERNAL_ERROR', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
