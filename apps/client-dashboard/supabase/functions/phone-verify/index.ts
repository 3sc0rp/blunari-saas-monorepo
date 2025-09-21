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
    const { action, phone_number, code, tenant_id, challenge_token } = await req.json().catch(() => ({}));
    if (!action) return json(400, { success: false, error: { code: 'MISSING_ACTION', message: 'action required', requestId } });

    const TELNYX_API_KEY = Deno.env.get('TELNYX_API_KEY');
    const VERIFY_PROFILE_ID = Deno.env.get('TELNYX_VERIFY_PROFILE_ID');
    if (!TELNYX_API_KEY || !VERIFY_PROFILE_ID) {
      return json(503, { success: false, error: { code: 'VERIFY_NOT_CONFIGURED', message: 'Verify not configured', requestId } });
    }

    if (action === 'start') {
      if (!phone_number) return json(400, { success: false, error: { code: 'MISSING_PHONE', message: 'phone_number required', requestId } });
      const digits = String(phone_number).replace(/\D/g,'');
      const normalized = digits.length === 10 ? `+1${digits}` : (digits.startsWith('1') && digits.length === 11 ? `+${digits}` : String(phone_number));
      // Generate a short-lived code and send via Telnyx Messaging using your number/profile
      const codeLength = Math.max(4, Math.min(8, parseInt(Deno.env.get('VERIFY_CODE_LENGTH') || '5')));
      const code = Array.from({ length: codeLength }, () => Math.floor(Math.random() * 10)).join('');
      const TELNYX_FROM_NUMBER = Deno.env.get('TELNYX_FROM_NUMBER');
      const TELNYX_MESSAGING_PROFILE_ID = Deno.env.get('TELNYX_MESSAGING_PROFILE_ID');
      if (!TELNYX_FROM_NUMBER && !TELNYX_MESSAGING_PROFILE_ID) {
        return json(503, { success: false, error: { code: 'SMS_NOT_CONFIGURED', message: 'Messaging profile or from number not configured' } });
      }
      const msg = (Deno.env.get('VERIFY_SMS_TEMPLATE') || 'Your {{app}} verification code is {{code}}').replace('{{code}}', code).replace('{{app}}', (Deno.env.get('APP_NAME') || 'Blunari'));
      const smsBody = TELNYX_FROM_NUMBER
        ? { from: TELNYX_FROM_NUMBER, to: normalized, text: msg }
        : { messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID, to: normalized, text: msg };
      try {
        await fetch('https://api.telnyx.com/v2/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TELNYX_API_KEY}` },
          body: JSON.stringify(smsBody),
        });
      } catch (e) {
        return json(500, { success: false, error: { code: 'SMS_SEND_FAILED', message: String(e) } });
      }
      // Return a challenge token so we can validate without DB
      const ttl = Math.max(60, parseInt(Deno.env.get('VERIFY_CODE_TTL_SECONDS') || '300'));
      const exp = Math.floor(Date.now() / 1000) + ttl;
      const challenge = signVerificationJWT({ purpose: 'phone-verify-challenge', phone: normalized, h: simpleHMAC(code, getSigningSecret()), exp });
      return json(200, { success: true, status: 'pending', challenge_token: challenge, requestId });
    }

    if (action === 'check') {
      if (!phone_number || !code) return json(400, { success: false, error: { code: 'MISSING_PARAMS', message: 'phone_number and code required', requestId } });
      const digits = String(phone_number).replace(/\D/g,'');
      const normalized = digits.length === 10 ? `+1${digits}` : (digits.startsWith('1') && digits.length === 11 ? `+${digits}` : String(phone_number));
      // Prefer stateless challenge verification if provided
      try {
        const challenge = (challenge_token as string | undefined) || undefined;
        if (challenge) {
          const [h, p, s] = challenge.split('.');
          const expected = simpleHMAC(`${h}.${p}`, getSigningSecret());
          if (s !== expected) return json(400, { success: false, error: { code: 'VERIFY_FAILED', message: 'invalid challenge signature', requestId } });
          const payload = JSON.parse(b64urlDecode(p));
          if (payload?.purpose !== 'phone-verify-challenge') return json(400, { success: false, error: { code: 'VERIFY_FAILED', message: 'invalid challenge', requestId } });
          if (payload?.exp && Math.floor(Date.now() / 1000) > payload.exp) return json(400, { success: false, error: { code: 'VERIFY_FAILED', message: 'code expired', requestId } });
          if (String(payload?.phone) !== normalized) return json(400, { success: false, error: { code: 'VERIFY_FAILED', message: 'phone mismatch', requestId } });
          const ok = simpleHMAC(String(code), getSigningSecret()) === payload?.h;
          if (!ok) return json(400, { success: false, error: { code: 'VERIFY_FAILED', message: 'incorrect code', requestId } });
          const token = signVerificationJWT({ purpose: 'phone-verify', phone: normalized, tenant_id, exp: Math.floor(Date.now() / 1000) + 600 });
          return json(200, { success: true, token, requestId });
        }
      } catch {}

      // Fallback to Telnyx Verify if challenge is not present
      const payload = JSON.stringify({ phone_number: normalized, code, verify_profile_id: VERIFY_PROFILE_ID });
      const endpoints = [
        'https://api.telnyx.com/v2/verifications/by_phone_number/actions/verify',
        'https://api.telnyx.com/v2/verifications/by_phone_number/verify',
        'https://api.telnyx.com/v2/verify/verifications/by_phone_number/actions/verify_code'
      ];
      let ok = false; let lastErr = '';
      for (const url of endpoints) {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TELNYX_API_KEY}` },
          body: payload,
        });
        if (r.ok) { ok = true; break; }
        lastErr = await r.text();
      }
      if (!ok) {
        let message = lastErr.slice(0, 300);
        try { const j = JSON.parse(lastErr); message = j?.errors?.[0]?.detail || j?.errors?.[0]?.title || message; } catch {}
        return json(400, { success: false, error: { code: 'VERIFY_FAILED', message, requestId } });
      }
      // issue signed token for confirm step
      const exp = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes
      const token = signVerificationJWT({ purpose: 'phone-verify', phone: normalized, tenant_id, exp });
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


