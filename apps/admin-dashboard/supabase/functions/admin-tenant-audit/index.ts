
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
