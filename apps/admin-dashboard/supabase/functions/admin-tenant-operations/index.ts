
serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: createCorsHeaders(origin) });
  try {
    const { tenantId, limit = 15 } = await req.json();
    if (!tenantId) return createErrorResponse('MISSING_TENANT_ID', 'tenantId required', 400, undefined, origin);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')||'', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'');

    // Auth check (optional but we mimic others)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return createErrorResponse('NO_AUTH','Missing Authorization header',401,undefined,origin);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ',''));
    if (authErr || !user) return createErrorResponse('UNAUTHORIZED','Unauthorized',401,undefined,origin);

    // Background jobs referencing tenant via payload JSON
    const { data: jobs } = await supabase.from('background_jobs')
      .select('id, job_type, status, created_at, updated_at, attempts, retry_count, job_name')
      .contains('payload', { tenantId })
      .order('created_at', { ascending: false })
      .limit(limit);

    // Rate limit state for password setup issuance
    let rateState: any = null;
    try {
      const { data: rate } = await supabase.rpc('get_password_setup_rate_state', { p_tenant: tenantId, p_admin: user.id });
      rateState = rate;
    } catch {}

    return createCorsResponse({
      tenantId,
      rateState,
      jobs: jobs || [],
      requestId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
    }, 200, origin);
  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
