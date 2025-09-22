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

function getWidgetSecret(): string {
  return Deno.env.get('WIDGET_JWT_SECRET') || Deno.env.get('VITE_JWT_SECRET') || 'dev-jwt-secret-change-in-production-2025';
}

function signVerificationJWT(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const p = { ...payload } as any;
  const hEncoded = b64urlEncode(JSON.stringify(header));
  const pEncoded = b64urlEncode(JSON.stringify(p));
  const sig = simpleHMAC(`${hEncoded}.${pEncoded}`, getSigningSecret());
  return `${hEncoded}.${pEncoded}.${sig}`;
}
function signWidgetJWT(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const p = { ...payload } as any;
  const hEncoded = b64urlEncode(JSON.stringify(header));
  const pEncoded = b64urlEncode(JSON.stringify(p));
  const sig = simpleHMAC(`${hEncoded}.${pEncoded}`, getWidgetSecret());
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

function verifyJWTWithEitherSecret(token: string): any | null {
  try {
    const [h, p, s] = token.split('.');
    const expectedA = simpleHMAC(`${h}.${p}`, getSigningSecret());
    if (s === expectedA) {
      const payload = JSON.parse(b64urlDecode(p));
      if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
      return payload;
    }
    const expectedB = simpleHMAC(`${h}.${p}`, getWidgetSecret());
    if (s === expectedB) {
      const payload = JSON.parse(b64urlDecode(p));
      if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
      return payload;
    }
    return null;
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
    const body = await req.json().catch(() => ({}));
    const { action, phone_number, code, tenant_id, challenge_token, token } = body as any;
    if (!action) return json(400, { success: false, error: { code: 'MISSING_ACTION', message: 'action required', requestId } });

    const TELNYX_API_KEY = Deno.env.get('TELNYX_API_KEY');
    const VERIFY_PROFILE_ID = Deno.env.get('TELNYX_VERIFY_PROFILE_ID'); // optional when using Messaging API
    if (!TELNYX_API_KEY) {
      return json(503, { success: false, error: { code: 'VERIFY_NOT_CONFIGURED', message: 'Telnyx API key not configured', requestId } });
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
      
      // Log configuration for debugging
      console.log('[phone-verify] Config check:', {
        hasApiKey: !!TELNYX_API_KEY,
        hasFromNumber: !!TELNYX_FROM_NUMBER,
        hasProfileId: !!TELNYX_MESSAGING_PROFILE_ID,
        fromNumber: TELNYX_FROM_NUMBER ? `${TELNYX_FROM_NUMBER.slice(0, 5)}...` : 'none',
        profileId: TELNYX_MESSAGING_PROFILE_ID ? `${TELNYX_MESSAGING_PROFILE_ID.slice(0, 8)}...` : 'none'
      });
      const msg = (Deno.env.get('VERIFY_SMS_TEMPLATE') || 'Your {{app}} verification code is {{code}}').replace('{{code}}', code).replace('{{app}}', (Deno.env.get('APP_NAME') || 'Blunari'));
      // Sanitize FROM number to E.164 if possible
      let sanitizedFrom: string | undefined = undefined;
      if (TELNYX_FROM_NUMBER) {
        const fDigits = String(TELNYX_FROM_NUMBER).replace(/\D/g,'');
        sanitizedFrom = fDigits.length === 10 ? `+1${fDigits}` : (fDigits.length === 11 && fDigits.startsWith('1') ? `+${fDigits}` : (TELNYX_FROM_NUMBER.startsWith('+') ? TELNYX_FROM_NUMBER : TELNYX_FROM_NUMBER));
      }
      const base = { to: normalized, text: msg } as any;
      const attemptBodies: Array<Record<string, unknown>> = [];
      if (sanitizedFrom && TELNYX_MESSAGING_PROFILE_ID) {
        attemptBodies.push({ ...base, from: sanitizedFrom, messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID });
        attemptBodies.push({ ...base, messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID });
        attemptBodies.push({ ...base, from: sanitizedFrom });
      } else if (sanitizedFrom) {
        attemptBodies.push({ ...base, from: sanitizedFrom });
      } else if (TELNYX_MESSAGING_PROFILE_ID) {
        attemptBodies.push({ ...base, messaging_profile_id: TELNYX_MESSAGING_PROFILE_ID });
      }
      console.log('[phone-verify] SMS attempts planned:', { attempts: attemptBodies.length, to: normalized });
      let sentOk = false; let lastErrText = '';
      let usedAttemptIndex: number | null = null;
      let lastMessageId: string | undefined = undefined;
      let lastProviderStatus: string | undefined = undefined;
      for (let i = 0; i < attemptBodies.length; i++) {
        const body = attemptBodies[i];
        console.log('[phone-verify] Attempt', i+1, 'payload keys:', Object.keys(body));
        try {
          const resp = await fetch('https://api.telnyx.com/v2/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TELNYX_API_KEY}` },
            body: JSON.stringify(body),
          });
          const respText = await resp.text();
          console.log('[phone-verify] Telnyx response (attempt', i+1, '):', { status: resp.status, body: respText });
          if (resp.ok) {
            try { const data = JSON.parse(respText); lastMessageId = data?.data?.id; lastProviderStatus = data?.data?.status; console.log('[phone-verify] SMS sent successfully:', { messageId: lastMessageId, status: lastProviderStatus }); } catch {}
            sentOk = true;
            usedAttemptIndex = i + 1;
            break;
          } else {
            lastErrText = respText;
          }
        } catch (e) {
          lastErrText = String(e);
          console.error('[phone-verify] SMS send exception (attempt', i+1, '):', e);
        }
      }
      if (!sentOk) {
        let msg = lastErrText.slice(0, 400);
        try { const j = JSON.parse(lastErrText); msg = j?.errors?.[0]?.detail || j?.errors?.[0]?.title || msg; } catch {}
        return json(400, { success: false, error: { code: 'SMS_SEND_FAILED', message: msg, telnyx: lastErrText, requestId } });
      }
      // Return a challenge token so we can validate without DB
      const ttl = Math.max(60, parseInt(Deno.env.get('VERIFY_CODE_TTL_SECONDS') || '300'));
      const exp = Math.floor(Date.now() / 1000) + ttl;
      const challenge = signVerificationJWT({ purpose: 'phone-verify-challenge', phone: normalized, h: simpleHMAC(code, getSigningSecret()), exp });
      return json(200, { success: true, status: 'pending', challenge_token: challenge, to: normalized, message_id: lastMessageId, provider_status: lastProviderStatus, attempt: usedAttemptIndex, requestId });
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
          // Sign verification token with widget secret so booking confirm can validate it
          const token = signWidgetJWT({ purpose: 'phone-verify', phone: normalized, tenant_id, exp: Math.floor(Date.now() / 1000) + 600 });
          return json(200, { success: true, token, requestId });
        }
      } catch {}

      // Fallback to Telnyx Verify if challenge is not present AND verify profile is configured
      if (!VERIFY_PROFILE_ID) {
        return json(400, { success: false, error: { code: 'VERIFY_FAILED', message: 'missing challenge token', requestId } });
      }
      const payload = JSON.stringify({ phone_number: normalized, code, verify_profile_id: VERIFY_PROFILE_ID });
      const endpoints = [
        'https://api.telnyx.com/v2/verifications/by_phone_number/actions/verify',
        'https://api.telnyx.com/v2/verifications/by_phone_number/verify',
        'https://api.telnyx.com/v2/verify/verifications/by_phone_number/actions/verify_code'
      ];
      let ok = false; let lastErr = '';
      for (const url of endpoints) {
        try {
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TELNYX_API_KEY}` },
            body: payload,
          });
          if (r.ok) { ok = true; break; }
          lastErr = await r.text();
        } catch (e) {
          lastErr = String(e);
        }
      }
      if (!ok) {
        let message = lastErr.slice(0, 300);
        try { const j = JSON.parse(lastErr); message = j?.errors?.[0]?.detail || j?.errors?.[0]?.title || message; } catch {}
        return json(400, { success: false, error: { code: 'VERIFY_FAILED', message, requestId } });
      }
      // issue signed token for confirm step
      const exp = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes
      const token = signWidgetJWT({ purpose: 'phone-verify', phone: normalized, tenant_id, exp });
      return json(200, { success: true, token, requestId });
    }

    if (action === 'validate') {
      const payload = token ? verifyVerificationJWT(token) : null;
      return json(200, { success: !!payload, payload: payload || null });
    }

    if (action === 'status') {
      const message_id = (body as any)?.message_id as string | undefined;
      if (!message_id) return json(400, { success: false, error: { code: 'MISSING_PARAMS', message: 'message_id required', requestId } });
      try {
        const resp = await fetch(`https://api.telnyx.com/v2/messages/${encodeURIComponent(message_id)}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${TELNYX_API_KEY}` },
        });
        const text = await resp.text();
        if (!resp.ok) {
          let message = text.slice(0, 400);
          try { const j = JSON.parse(text); message = j?.errors?.[0]?.detail || j?.errors?.[0]?.title || message; } catch {}
          return json(400, { success: false, error: { code: 'STATUS_FAILED', message, telnyx: text, requestId } });
        }
        try {
          const data = JSON.parse(text);
          return json(200, { success: true, data, requestId });
        } catch {
          return json(200, { success: true, data: text, requestId });
        }
      } catch (e) {
        return json(500, { success: false, error: { code: 'STATUS_ERROR', message: String(e), requestId } });
      }
    }

    if (action === 'bypass') {
      // Emergency bypass for testing when SMS fails - only in dev/test
      const isDev = (Deno.env.get('DENO_DEPLOYMENT_ID') || '').length === 0;
      if (!isDev) return json(403, { success: false, error: { code: 'BYPASS_DISABLED', message: 'Bypass only available in development' } });
      if (!phone_number || !tenant_id) return json(400, { success: false, error: { code: 'MISSING_PARAMS', message: 'phone_number and tenant_id required' } });
      const digits = String(phone_number).replace(/\D/g,'');
      const normalized = digits.length === 10 ? `+1${digits}` : String(phone_number);
      const exp = Math.floor(Date.now() / 1000) + 10 * 60;
      const token = signVerificationJWT({ purpose: 'phone-verify', phone: normalized, tenant_id, exp });
      return json(200, { success: true, token, bypass: true, requestId });
    }

    return json(400, { success: false, error: { code: 'INVALID_ACTION', message: 'Unknown action', requestId } });
  } catch (e) {
    return json(500, { success: false, error: { code: 'INTERNAL', message: String(e) } });
  }
});


