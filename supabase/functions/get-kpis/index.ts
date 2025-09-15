import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(requestOrigin: string | null) {
  const normalize = (o: string | null) => { try { if (!o) return null; const u = new URL(o); return `${u.protocol}//${u.host}`; } catch { return null; } };
  const origin = normalize(requestOrigin);
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id, x-correlation-id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json"
  } as Record<string, string>;
}

function errorJson(code: string, message: string, status = 400, origin?: string | null) {
  return new Response(JSON.stringify({ error: code, message }), { status, headers: corsHeaders(origin) });
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return errorJson('METHOD_NOT_ALLOWED', 'Only POST supported', 405, origin);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve user and tenant
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!bearer) return errorJson('AUTH_REQUIRED', 'Authorization header required', 401, origin);
    const auth = await supabase.auth.getUser(bearer);
    if (auth.error || !auth.data.user) return errorJson('AUTH_INVALID', 'Invalid token', 401, origin);

    const { data: tenantRow, error: tenantErr } = await supabase
      .from('auto_provisioning')
      .select('tenant_id')
      .eq('user_id', auth.data.user.id)
      .eq('status', 'completed')
      .maybeSingle();
    if (tenantErr || !tenantRow) return errorJson('TENANT_NOT_FOUND', 'No tenant linked to user', 404, origin);
    const tenantId = tenantRow.tenant_id as string;

    // Aggregate simple KPIs for today
    const now = new Date();
    const start = new Date(now);
    start.setHours(0,0,0,0);
    const end = new Date(now);
    end.setHours(23,59,59,999);

    // Bookings today
    let covers = 0; let totalBookings = 0; let partySizes: number[] = [];
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('party_size,status,booking_time,booking_date')
      .eq('tenant_id', tenantId)
      .gte('booking_time', start.toISOString())
      .lte('booking_time', end.toISOString());
    if (!bErr && bookings) {
      totalBookings = bookings.length;
      for (const b of bookings) {
        const p = Number((b as any).party_size) || 0; covers += p; if (p) partySizes.push(p);
      }
    }

    // Tables count
    let tablesCount = 0;
    const { data: tables } = await supabase
      .from('restaurant_tables')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    tablesCount = (tables as any)?.length || 0; // count in head mode may not be returned by esm client; keep safe default

    const avgPartySize = partySizes.length ? (partySizes.reduce((a,b)=>a+b,0)/partySizes.length) : 0;
    const occupancy = tablesCount > 0 ? Math.min(1, totalBookings / tablesCount) : 0;
    const noShowRisk = Math.max(0, Math.min(1, totalBookings ? (totalBookings - Math.min(totalBookings, Math.floor(totalBookings*0.9))) / totalBookings : 0));
    const kitchenLoad = Math.min(1, covers / 100);

    const payload = {
      occupancy,
      covers,
      noShowRisk,
      avgPartySize,
      kitchenLoad,
      totalBookings,
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders(origin) });
  } catch (e) {
    return errorJson('INTERNAL_ERROR', String(e), 500, origin);
  }
});


