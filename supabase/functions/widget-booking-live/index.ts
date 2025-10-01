// Monorepo deployment shim.
// This file is a lightweight forwarder that reimplements a minimal subset
// of the real function logic for deployment from the default supabase/functions path.
// For now, we delegate by fetching our own hosted function code is not feasible, so we
// show an explicit error guiding to use the canonical function slug widget-booking-live.
// NOTE: This is a synced copy of the primary implementation at
// apps/client-dashboard/supabase/functions/widget-booking-live/index.ts
// Keep changes in ONE place then sync here before deploy.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id, x-idempotency-key",
  "Access-Control-Expose-Headers": "x-request-id, x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; object-src 'none';",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

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
function validateWidgetToken(token: string): { slug: string; configVersion?: string; widgetType?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const header = JSON.parse(b64urlDecode(h));
    if (!header || header.alg !== 'HS256') return null;
    const payload = JSON.parse(b64urlDecode(p));
    if (!payload?.slug) return null;
    if (payload.exp && Math.floor(Date.now()/1000) > payload.exp) return null;
    const expected = simpleHMAC(`${h}.${p}`, getWidgetSecret());
    if (expected !== s) return null;
    return { slug: payload.slug, configVersion: payload.configVersion, widgetType: payload.widgetType };
  } catch { return null; }
}
function errorResponse(code: string, message: string, status = 400, requestId?: string, issues?: unknown) {
  return new Response(JSON.stringify({ success:false, error:{ code, message, requestId, issues }}), { status, headers:{ ...corsHeaders, 'Content-Type':'application/json', 'x-request-id': requestId||'' }});
}
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    if (req.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED','Method not allowed',405,requestId);
    let data: any; const raw = await req.text(); data = raw? JSON.parse(raw):{};
    const action = data?.action; if(!action) return errorResponse('MISSING_ACTION','Action parameter is required',400,requestId);
    const token = data.token || new URL(req.url).searchParams.get('token');
    const tokenPayload = token? validateWidgetToken(token): null;
    // Minimal path: only confirm action retained here to restore CORS quickly.
    if(action==='ping') return new Response(JSON.stringify({ success:true, pong:true, requestId }), { status:200, headers:{ ...corsHeaders, 'Content-Type':'application/json' }});
    return errorResponse('NOT_IMPLEMENTED','This deployment shim needs full sync of implementation',501,requestId);
  } catch(e) {
    return errorResponse('INTERNAL_ERROR','Unexpected error',500,requestId,{ error:`${e}` });
  }
});
