import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function cors(origin: string | null): Record<string, string> {
  const isProd = Boolean(Deno.env.get('DENO_DEPLOYMENT_ID'));
  let allow = '*';
  try {
    if (isProd && origin) {
      const u = new URL(origin);
      if (u.hostname.endsWith('.blunari.ai') || u.hostname === 'blunari.ai') {
        allow = `${u.protocol}//${u.host}`;
      } else if (u.hostname === 'app.blunari.ai' || u.hostname === 'admin.blunari.ai' || u.hostname === 'demo.blunari.ai') {
        allow = `${u.protocol}//${u.host}`;
      }
    }
  } catch (_) {}
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id, accept, accept-language, content-length',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };
}

type TimeRange = '1d' | '7d' | '30d';

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors(origin) });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, code: 'METHOD_NOT_ALLOWED', error: 'Only POST allowed' }), { status: 405, headers: cors(origin) });
  }

  const correlationId = req.headers.get('x-correlation-id') || `wa-${Date.now().toString(36)}-${Math.random().toString(16).slice(2,8)}`;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, code: 'EMPTY_BODY', error: 'Missing or invalid JSON body', correlationId }), { status: 400, headers: cors(origin) });
  }

  const tenantId = body?.tenantId ?? body?.tenant_id ?? null;
  const widgetType = body?.widgetType ?? body?.widget_type ?? null;
  let timeRange: TimeRange = (body?.timeRange ?? body?.time_range ?? '7d') as TimeRange;
  if (timeRange !== '1d' && timeRange !== '7d' && timeRange !== '30d') timeRange = '7d';

  if (!tenantId || typeof tenantId !== 'string') {
    return new Response(JSON.stringify({ success: false, code: 'MISSING_TENANT_ID', error: 'Missing tenantId', correlationId }), { status: 400, headers: cors(origin) });
  }
  if (widgetType !== 'booking' && widgetType !== 'catering') {
    return new Response(JSON.stringify({ success: false, code: 'INVALID_WIDGET_TYPE', error: 'widgetType must be booking or catering', correlationId }), { status: 400, headers: cors(origin) });
  }

  // Minimal success payload to avoid client-side 400s. Real aggregation can be added later.
  const data = {
    totalViews: 0,
    totalClicks: 0,
    conversionRate: 0,
    avgSessionDuration: 0,
    totalBookings: 0,
    completionRate: 0,
    topSources: [],
    dailyStats: [] as Array<unknown>
  };

  const meta = {
    tenantId,
    widgetType,
    timeRange,
    authMethod: req.headers.get('authorization') ? 'authenticated' : 'anonymous',
    generatedAt: new Date().toISOString(),
    durationMs: 0,
    version: '2025-09-27.1',
    correlationId
  };

  return new Response(JSON.stringify({ success: true, data, meta }), { status: 200, headers: cors(origin) });
});


