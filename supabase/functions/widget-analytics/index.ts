// Minimal widget-analytics Edge Function implementation to avoid 400 errors
// NOTE: Replace with full implementation if already deployed remotely.
// deno-lint-ignore-file
// NOTE: The following remote import is valid in Deno / Supabase Edge runtime. Local TS tooling may not resolve it.
// If your editor flags it, that's expected; deployment will still succeed.
// @ts-ignore -- allow remote Deno std import without local type resolution
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface AnalyticsRequestBody {
  tenantId?: string;
  tenant_id?: string;
  widgetType?: string;
  widget_type?: string;
  timeRange?: string;
  time_range?: string;
}

const VALID_WIDGET_TYPES = new Set(['booking','catering']);
const VALID_TIME_RANGES = new Set(['1d','7d','30d']);

// Basic CORS headers (adjust Access-Control-Allow-Origin in production to a specific domain list)
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Vary': 'Origin'
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

serve(async (req: Request) => {
  const cid = req.headers.get('x-correlation-id') || crypto.randomUUID();
  const started = performance.now?.() || Date.now();

  // Helper to attach correlation ID + duration to any structured error
  const errorOut = (status: number, code: string, error: string, extra: Record<string, unknown> = {}) => {
    return json(status, {
      success: false,
      code,
      error,
      correlationId: cid,
      durationMs: Math.round((performance.now?.() || Date.now()) - started),
      ...extra
    });
  };

  // Handle CORS preflight early
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorOut(405, 'METHOD_NOT_ALLOWED', 'Use POST', { allow: 'POST,OPTIONS' });
  }

  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // Allow some browsers/extensions to send charset variations; still enforce JSON base
    if (!/json/i.test(contentType)) {
      return errorOut(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json');
    }
  }

  let bodyText = '';
  try { bodyText = await req.text(); } catch {
    return errorOut(400, 'EMPTY_BODY', 'Request body required');
  }

  if (!bodyText.trim()) {
    return errorOut(400, 'EMPTY_BODY', 'Request body required');
  }

  let parsed: AnalyticsRequestBody;
  try { parsed = JSON.parse(bodyText); } catch (e) {
    return errorOut(400, 'JSON_PARSE_ERROR', 'Invalid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return errorOut(400, 'INVALID_BODY', 'Body must be an object');
  }

  const tenantId = parsed.tenantId || parsed.tenant_id;
  if (!tenantId) {
    return errorOut(400, 'MISSING_TENANT_ID', 'Missing tenantId', { receivedBodyKeys: Object.keys(parsed || {}) });
  }
  // Relax UUID validation (some dev tenants may be short IDs). Still log if not a proper UUID v4.
  const uuidStrict = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const uuidLoose = /^[0-9a-fA-F-]{10,}$/; // allow looser dev IDs
  if (!uuidStrict.test(tenantId) && !uuidLoose.test(tenantId)) {
    return errorOut(400, 'INVALID_TENANT_ID', 'tenantId format invalid', { tenantId });
  }

  const widgetType = parsed.widgetType || parsed.widget_type;
  if (!widgetType) {
    return errorOut(400, 'MISSING_WIDGET_TYPE', 'Missing widgetType', { expected: Array.from(VALID_WIDGET_TYPES) });
  }
  if (!VALID_WIDGET_TYPES.has(widgetType)) {
    return errorOut(400, 'INVALID_WIDGET_TYPE', 'widgetType must be booking or catering', { received: widgetType, expected: Array.from(VALID_WIDGET_TYPES) });
  }

  const timeRange = parsed.timeRange || parsed.time_range || '7d';
  if (!VALID_TIME_RANGES.has(timeRange)) {
    return errorOut(400, 'INVALID_TIME_RANGE', 'timeRange must be 1d|7d|30d', { received: timeRange, expected: Array.from(VALID_TIME_RANGES) });
  }

  // Determine date range
  const now = new Date();
  const daysBack = timeRange === '30d' ? 30 : timeRange === '7d' ? 7 : 1;
  const rangeStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // Helper for date -> yyyy-mm-dd
  const toDateKey = (d: Date) => d.toISOString().split('T')[0];

  // Build SQL for core metrics; use RPC via REST (postgres fetch) since Edge runtime doesn't bundle supabase-js here.
  // We'll query PostgREST endpoints directly using fetch.
  const supabaseUrl = (req.headers.get('x-forwarded-host') ? `https://${req.headers.get('x-forwarded-host')}` : '') || Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('authorization') || (serviceKey ? `Bearer ${serviceKey}` : (anonKey ? `Bearer ${anonKey}` : ''));

  if (!supabaseUrl) {
    return errorOut(500, 'MISSING_SUPABASE_URL', 'SUPABASE_URL env not available');
  }

  // Query helper
  async function pgSelect(path: string, query: Record<string,string>) {
    const qs = new URLSearchParams(query).toString();
    const url = `${supabaseUrl}/rest/v1/${path}?${qs}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'apikey': anonKey || serviceKey || '',
        'Accept': 'application/json'
      }
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`PostgREST ${path} ${res.status}: ${txt.slice(0,300)}`);
    }
    return res.json();
  }

  // Parallel queries based on widgetType
  // analytics_events: gather views & clicks and sources
  // bookings OR catering_orders: completion stats & counts
  const dateFilter = `gte.created_at=${rangeStart.toISOString()}&lte.created_at=${now.toISOString()}`; // used only when needed

  // Build filters (RLS restricts to tenant automatically, but we still filter by tenant_id to avoid overfetch if service key accidentally used)
  const fromDateISO = rangeStart.toISOString();
  const toDateISO = now.toISOString();

  // Fetch analytics events (views / clicks + session durations if present)
  let events: any[] = [];
  try {
    events = await pgSelect('analytics_events', {
      select: 'event_type,event_data,created_at',
      tenant_id: `eq.${tenantId}`,
      created_at: `gte.${fromDateISO}`,
      order: 'created_at.asc',
      limit: String(2000) // safety cap
    });
  } catch (e) {
    console.warn('analytics_events query failed', String(e));
  }

  // Count views and clicks
  let totalViews = 0;
  let totalClicks = 0;
  let totalSessionDuration = 0;
  let sessionCount = 0;
  const sourceCounts: Record<string, number> = {};
  const dailyMap: Record<string, { views: number; clicks: number; bookings: number; revenue: number }> = {};
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(now.getTime() - (daysBack - 1 - i) * 24*60*60*1000);
    dailyMap[toDateKey(d)] = { views: 0, clicks: 0, bookings: 0, revenue: 0 };
  }

  for (const ev of events) {
    const dateKey = (ev.created_at || '').split('T')[0];
    const bucket = dailyMap[dateKey];
    if (ev.event_type === 'widget_view') {
      totalViews++;
      if (bucket) bucket.views++;
      const src = ev.event_data?.source || ev.event_data?.referrer || 'unknown';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    } else if (ev.event_type === 'widget_click') {
      totalClicks++;
      if (bucket) bucket.clicks++;
    } else if (ev.event_type === 'session_end') {
      const dur = Number(ev.event_data?.duration_ms || 0);
      if (!Number.isNaN(dur) && dur > 0) {
        totalSessionDuration += dur;
        sessionCount++;
      }
    }
  }

  // Fetch booking / catering data
  let orderRows: any[] = [];
  if (widgetType === 'booking') {
    try {
      orderRows = await pgSelect('bookings', {
        select: 'id,status,created_at,completed_at,party_size,source,total_amount',
        tenant_id: `eq.${tenantId}`,
        created_at: `gte.${fromDateISO}`,
        order: 'created_at.asc',
        limit: String(5000)
      });
    } catch (e) { console.warn('bookings query failed', String(e)); }
  } else {
    try {
      orderRows = await pgSelect('catering_orders', {
        select: 'id,status,created_at,completed_at,guest_count,total_amount,referral_source',
        tenant_id: `eq.${tenantId}`,
        created_at: `gte.${fromDateISO}`,
        order: 'created_at.asc',
        limit: String(5000)
      });
    } catch (e) { console.warn('catering_orders query failed', String(e)); }
  }

  let totalBookings = 0;
  let completedCount = 0;
  let totalRevenue = 0;
  for (const r of orderRows) {
    totalBookings++;
    const createdAt = r.created_at || r.confirmed_at || r.completed_at;
    const dateKey = (createdAt || '').split('T')[0];
    const bucket = dailyMap[dateKey];
    if (bucket) {
      bucket.bookings++;
      if (widgetType === 'catering') {
        const amt = Number(r.total_amount || 0);
        if (!Number.isNaN(amt)) {
          bucket.revenue += amt / 100; // convert cents to whole units
          totalRevenue += amt / 100;
        }
      }
    }
    if (r.status === 'confirmed' || r.status === 'completed') completedCount++;
  }

  const avgSessionDuration = sessionCount > 0 ? totalSessionDuration / sessionCount : 0;
  const conversionRate = totalViews > 0 ? (totalBookings / totalViews) * 100 : 0;
  const completionRate = totalBookings > 0 ? (completedCount / totalBookings) * 100 : 0;

  const topSources = Object.entries(sourceCounts)
    .sort((a,b) => b[1]-a[1])
    .slice(0,5)
    .map(([source,count]) => ({ source, count }));

  const dailyStats = Object.entries(dailyMap).map(([date,vals]) => ({
    date,
    views: vals.views,
    clicks: vals.clicks,
    bookings: vals.bookings,
    revenue: widgetType === 'catering' ? Number(vals.revenue.toFixed(2)) : undefined
  }));

  const data = {
    totalViews,
    totalClicks,
    conversionRate: Number(conversionRate.toFixed(2)),
    avgSessionDuration: Math.round(avgSessionDuration),
    totalBookings,
    completionRate: Number(completionRate.toFixed(2)),
    topSources,
    dailyStats,
    ...(widgetType === 'catering' ? { totalRevenue: Number(totalRevenue.toFixed(2)) } : {})
  };

  try {
    return json(200, {
      success: true,
      data,
      meta: {
        tenantId,
        widgetType,
        timeRange,
        authMethod: req.headers.get('authorization') ? 'authenticated' : 'anonymous',
        generatedAt: new Date().toISOString(),
        durationMs: Math.round((performance.now?.() || Date.now()) - started),
        version: '1.0-real',
        correlationId: cid
      }
    });
  } catch (err) {
    console.error('widget-analytics response build error', err, { cid });
    return errorOut(500, 'INTERNAL_ERROR', 'Unexpected failure building response');
  }
});
