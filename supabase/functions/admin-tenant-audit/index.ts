import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Inline CORS utilities
const getAllowedOrigins = () => {
  return [
    'https://admin.blunari.ai',
    'https://services.blunari.ai',
    'https://blunari.ai',
    'https://www.blunari.ai',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];
};

const createOriginHeader = (requestOrigin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return allowedOrigins[0]; // Default to admin.blunari.ai
};

const createCorsHeaders = (requestOrigin: string | null = null) => ({
  'Access-Control-Allow-Origin': createOriginHeader(requestOrigin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, accept, accept-language, content-length, sentry-trace, baggage',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
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
    const { tenantId, cursor, limit = 50 } = await req.json();
    if (!tenantId) return createErrorResponse('MISSING_TENANT_ID','tenantId required',400,undefined,origin);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')||'', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'');

    let query = supabase.from('activity_logs')
      .select('id, activity_type, created_at, message, details, user_id')
      .eq('details->>tenantId', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: rows } = await query;

    return createCorsResponse({ success: true, data: rows || [], nextCursor: rows && rows.length === limit ? rows[rows.length - 1].created_at : null, requestId: crypto.randomUUID() }, 200, origin);
  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
