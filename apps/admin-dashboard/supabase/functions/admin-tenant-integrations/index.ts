import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsHeaders, createCorsResponse, createErrorResponse } from "./cors";

serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: createCorsHeaders(origin) });
  try {
    const { tenantId } = await req.json();
    if (!tenantId) return createErrorResponse('MISSING_TENANT_ID','tenantId required',400,undefined,origin);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')||'', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'');

    const { data: records } = await supabase.from('integration_status').select('*').eq('tenant_id', tenantId).order('integration_key');

    return createCorsResponse({ tenantId, integrations: records || [], requestId: crypto.randomUUID(), generatedAt: new Date().toISOString() }, 200, origin);
  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
