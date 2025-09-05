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
    const { tenantId } = await req.json();
    if (!tenantId) return createErrorResponse('MISSING_TENANT_ID','tenantId required',400,undefined,origin);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')||'', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'');

    const { data: signals } = await supabase.from('churn_signals').select('id, signal_key, score, notes, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(25);

    return createCorsResponse({ tenantId, signals: signals || [], requestId: crypto.randomUUID(), generatedAt: new Date().toISOString() }, 200, origin);
  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
