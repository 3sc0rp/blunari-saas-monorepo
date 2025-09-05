
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
      if (error) return createErrorResponse('DB', error.message, 500, undefined, origin);
      return createCorsResponse({ success: true, data });
    }

    if (action === 'create') {
      if (!name) return createErrorResponse('MISSING_NAME', 'name required', 400, undefined, origin);
      const raw = 'bln_' + crypto.randomUUID().replace(/-/g,'').slice(0,24);
      const hashed = await hashKey(raw);
      const { data, error } = await supabase.from('api_keys').insert({ tenant_id: tenantId, name, hashed_key: hashed }).select('id, name, created_at').single();
      if (error) return createErrorResponse('DB', error.message, 500, undefined, origin);
      return createCorsResponse({ success: true, data: { ...data, apiKey: raw } });
    }

    if (action === 'revoke') {
      if (!keyId) return createErrorResponse('MISSING_KEY_ID', 'keyId required', 400, undefined, origin);
      const { error } = await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', keyId).eq('tenant_id', tenantId);
      if (error) return createErrorResponse('DB', error.message, 500, undefined, origin);
      return createCorsResponse({ success: true });
    }

    return createErrorResponse('INVALID_ACTION', 'Unsupported action', 400, undefined, origin);
  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
