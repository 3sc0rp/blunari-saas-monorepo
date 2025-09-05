
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
