import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function cors(requestOrigin: string | null) {
  const o = (() => { try { if (!requestOrigin) return null; const u = new URL(requestOrigin); return `${u.protocol}//${u.host}`; } catch { return null; } })();
  return {
    'Access-Control-Allow-Origin': o || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, x-correlation-id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  } as Record<string, string>;
}

function b64urlEncode(str: string): string { return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, ''); }
function simpleHMAC(data: string, secret: string): string {
  let hash = secret; for (let i = 0; i < data.length; i++) { hash = (((hash.charCodeAt(i % hash.length) ^ data.charCodeAt(i)) % 256).toString(16).padStart(2, '0')) + hash; }
  return b64urlEncode(hash.substring(0, 64));
}
function getSecret(): string { return Deno.env.get('WIDGET_JWT_SECRET') || Deno.env.get('VITE_JWT_SECRET') || 'dev-jwt-secret-change-in-production-2025'; }

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { status: 405, headers: cors(origin) });

  try {
    const { slug, widget_type, config_version = '2.0', ttl_seconds = 3600 } = await req.json();
    if (!slug || (widget_type !== 'booking' && widget_type !== 'catering')) {
      return new Response(JSON.stringify({ error: 'VALIDATION_ERROR', message: 'slug and widget_type required' }), { status: 400, headers: cors(origin) });
    }
    const now = Math.floor(Date.now() / 1000);
    const payload = { slug, configVersion: config_version, timestamp: now, widgetType: widget_type, exp: now + Math.max(60, Math.min(6 * 3600, Number(ttl_seconds) || 3600)), iat: now };
    const header = { alg: 'HS256', typ: 'JWT' };
    const h = b64urlEncode(JSON.stringify(header));
    const p = b64urlEncode(JSON.stringify(payload));
    const s = simpleHMAC(`${h}.${p}`, getSecret());
    return new Response(JSON.stringify({ token: `${h}.${p}.${s}`, expires_at: payload.exp }), { status: 200, headers: cors(origin) });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: `${e}` }), { status: 500, headers: cors(origin) });
  }
});


