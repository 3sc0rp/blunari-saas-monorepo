import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');
}
function b64urlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const paddedStr = pad ? padded + '='.repeat(4 - pad) : padded;
  try { return atob(paddedStr); } catch { return ''; }
}
function simpleHMAC(data: string, secret: string): string {
  let hash = secret;
  for (let i = 0; i < data.length; i++) {
    hash = (((hash.charCodeAt(i % hash.length) ^ data.charCodeAt(i)) % 256).toString(16).padStart(2, '0')) + hash;
  }
  return b64urlEncode(hash.substring(0, 64));
}
function getSigningSecret(): string {
  return Deno.env.get('PHONE_VERIFY_SIGNING_SECRET') || Deno.env.get('WIDGET_JWT_SECRET') || Deno.env.get('VITE_JWT_SECRET') || 'dev-jwt-secret-change-in-production-2025';
}

function signVerificationJWT(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const p = { ...payload } as any;
  const hEncoded = b64urlEncode(JSON.stringify(header));
  const pEncoded = b64urlEncode(JSON.stringify(p));
  const sig = simpleHMAC(`${hEncoded}.${pEncoded}`, getSigningSecret());
  return `${hEncoded}.${pEncoded}.${sig}`;
}
function verifyVerificationJWT(token: string): any | null {
  try {
    const [h, p, s] = token.split('.');
    const expected = simpleHMAC(`${h}.${p}`, getSigningSecret());
    if (s !== expected) return null;
    const payload = JSON.parse(b64urlDecode(p));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST supported' } });

  const requestId = crypto.randomUUID();
  try {
    const { action, phone_number, code, tenant_id } = await req.json().catch(() => ({}));
    if (!action) return json(400, { success: false, error: { code: 'MISSING_ACTION', message: 'action required', requestId } });

    const TELNYX_API_KEY = Deno.env.get('TELNYX_API_KEY');
    const VERIFY_PROFILE_ID = Deno.env.get('TELNYX_VERIFY_PROFILE_ID');
    if (!TELNYX_API_KEY || !VERIFY_PROFILE_ID) {
      return json(503, { success: false, error: { code: 'VERIFY_NOT_CONFIGURED', message: 'Verify not configured', requestId } });
    }

    if (action === 'start') {
      if (!phone_number) return json(400, { success: false, error: { code: 'MISSING_PHONE', message: 'phone_number required', requestId } });
      // Create verification via Telnyx
      const res = await fetch('https://api.telnyx.com/v2/verifications/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
        },
        body: JSON.stringify({ phone_number, verify_profile_id: VERIFY_PROFILE_ID }),
      });
      if (!res.ok) {
        const t = await res.text();
        return json(500, { success: false, error: { code: 'VERIFY_START_FAILED', message: t.slice(0, 300), requestId } });
      }
      return json(200, { success: true, status: 'pending', requestId });
    }

    if (action === 'check') {
      if (!phone_number || !code) return json(400, { success: false, error: { code: 'MISSING_PARAMS', message: 'phone_number and code required', requestId } });
      const res = await fetch('https://api.telnyx.com/v2/verifications/by_phone_number/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
        },
        body: JSON.stringify({ phone_number, code }),
      });
      if (!res.ok) {
        const t = await res.text();
        return json(400, { success: false, error: { code: 'VERIFY_FAILED', message: t.slice(0, 300), requestId } });
      }
      // issue signed token for confirm step
      const exp = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes
      const token = signVerificationJWT({ purpose: 'phone-verify', phone: phone_number, tenant_id, exp });
      return json(200, { success: true, token, requestId });
    }

    if (action === 'validate') {
      const auth = await req.json().catch(() => ({}));
      const token = (auth && auth.token) || '';
      const payload = token ? verifyVerificationJWT(token) : null;
      return json(200, { success: !!payload, payload: payload || null });
    }

    return json(400, { success: false, error: { code: 'INVALID_ACTION', message: 'Unknown action', requestId } });
  } catch (e) {
    return json(500, { success: false, error: { code: 'INTERNAL', message: String(e) } });
  }
});


