import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Shared CORS Configuration - Synced from _shared/cors.ts
const isProduction = !!Deno.env.get('DENO_DEPLOYMENT_ID');
const allowedOrigins = isProduction 
  ? [
      'https://admin.blunari.ai',
      'https://services.blunari.ai', 
      'https://blunari.ai',
      'https://www.blunari.ai'
    ]
  : [
      'http://localhost:5173',
      'http://localhost:3000', 
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080'
    ];

function createCorsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  
  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (!isProduction) {
    headers.set('Access-Control-Allow-Origin', '*');
  }
  
  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE');
  headers.set('Access-Control-Allow-Credentials', 'true');
  
  return headers;
}

function createCorsResponse(data: any, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: createCorsHeaders(origin)
  });
}

function createErrorResponse(
  error: string, 
  message: string, 
  status = 400, 
  details?: any, 
  origin: string | null = null
): Response {
  return createCorsResponse({ error, message, details }, status, origin);
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: createCorsHeaders(origin) });

  try {
    const { tenantId, days = 30 } = await req.json();
    if (!tenantId) return createErrorResponse('MISSING_TENANT_ID', 'tenantId required', 400, undefined, origin);

    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');

    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();

    const { data: bookings } = await supabase.from('bookings')
      .select('id, booking_time')
      .eq('tenant_id', tenantId)
      .gte('booking_time', since);

    const { data: staff } = await supabase.from('staff').select('id').eq('tenant_id', tenantId);

    const { data: featureFlags } = await supabase.from('tenant_feature_flags').select('feature_key, enabled').eq('tenant_id', tenantId);

    // Basic trend buckets (per day bookings count)
    const trend: Record<string, number> = {};
    (bookings || []).forEach((b: any) => {
      const d = new Date(b.booking_time).toISOString().slice(0,10);
      trend[d] = (trend[d] || 0) + 1;
    });

    return createCorsResponse({
      tenantId,
      windowDays: days,
      totals: {
        bookings: bookings?.length || 0,
        staff: staff?.length || 0,
        enabledFeatures: (featureFlags || []).filter((f: any)=>f.enabled).length,
      },
      trend: Object.entries(trend).sort((a,b)=> a[0] < b[0] ? -1 : 1).map(([date,count])=>({ date, bookings: count })),
      requestId: crypto.randomUUID(),
      generatedAt: new Date().toISOString()
    }, 200, origin);
  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
