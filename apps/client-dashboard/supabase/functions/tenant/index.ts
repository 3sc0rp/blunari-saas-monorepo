import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-request-id",
};

// Minimal base64url helpers copied from widget-booking-live
function b64urlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const paddedStr = pad ? padded + '='.repeat(4 - pad) : padded;
  try { return atob(paddedStr); } catch { return ''; }
}
function b64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');
}
function simpleHMAC(data: string, secret: string): string {
  let hash = secret;
  for (let i = 0; i < data.length; i++) {
    hash = (((hash.charCodeAt(i % hash.length) ^ data.charCodeAt(i)) % 256).toString(16).padStart(2, '0')) + hash;
  }
  return b64urlEncode(hash.substring(0, 64));
}
function getWidgetSecret(): string {
  return Deno.env.get('WIDGET_JWT_SECRET') || Deno.env.get('VITE_JWT_SECRET') || 'dev-jwt-secret-change-in-production-2025';
}
function validateWidgetToken(token: string): { slug: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const header = JSON.parse(b64urlDecode(h));
    if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const payload = JSON.parse(b64urlDecode(p));
    if (!payload || !payload.slug) return null;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    const expected = simpleHMAC(`${h}.${p}`, getWidgetSecret());
    if (expected !== s) return null;
    return { slug: payload.slug };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } });
    }

    let payload: any = {};
    try { payload = await req.json(); } catch { payload = {}; }
    const slugInput: string | undefined = payload?.slug;
    const token: string | null = payload?.token || null;

    let slug = slugInput;
    if (!slug && token) {
      const v = validateWidgetToken(token);
      if (v?.slug) slug = v.slug;
    }
    if (!slug) {
      return new Response(JSON.stringify({ error: { code: 'MISSING_SLUG', message: 'slug or token required' } }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } });
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, slug, timezone, currency')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: { code: 'TENANT_QUERY_FAILED', message: error.message }, requestId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } });
    }
    if (!tenant) {
      return new Response(JSON.stringify({ error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' }, requestId }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } });
    }

    return new Response(JSON.stringify({ data: tenant, requestId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } });
  } catch (e) {
    return new Response(JSON.stringify({ error: { code: 'INTERNAL', message: String(e) }, requestId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } });
  }
});

// NOTE: This file intentionally implements a single handler above. Duplicate handlers removed to prevent boot errors.
