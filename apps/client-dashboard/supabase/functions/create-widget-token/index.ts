import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
function createCorsHeaders(requestOrigin: string | null = null) {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  // Normalize and validate origin
  const normalize = (origin: string | null) => {
    try { if (!origin) return null; const u = new URL(origin); return `${u.protocol}//${u.host}`; } catch { return null; }
  };
  const origin = normalize(requestOrigin);

  const isAllowed = (o: string | null) => {
    if (!o) return false;
    try {
      const { hostname, protocol } = new URL(o);
      if (!/^https?:$/.test(protocol)) return false;
      if (hostname === 'app.blunari.ai' || hostname === 'demo.blunari.ai' || hostname === 'admin.blunari.ai' || hostname === 'services.blunari.ai' || hostname === 'blunari.ai' || hostname === 'www.blunari.ai') return true;
      if (hostname.endsWith('.blunari.ai')) return true;
      // Allow localhost in non-production for development/tests
      if (environment !== 'production' && (hostname === 'localhost' || hostname === '127.0.0.1')) return true;
      return false;
    } catch { return false; }
  };

  let allowedOrigin = '*';
  if (environment === 'production') {
    allowedOrigin = isAllowed(origin) ? (origin as string) : 'https://app.blunari.ai';
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, x-correlation-id, accept, accept-language, content-length',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  } as Record<string, string>;
}

// Base64 URL helpers
function b64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');
}

// Simple HMAC-like signature (non-crypto) for parity with client dev utils. Replace with crypto in production.
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

interface CreateWidgetTokenRequest {
  slug: string;
  widget_type: 'booking' | 'catering';
  config_version?: string; // default: '2.0'
  ttl_seconds?: number; // default: 3600
}

serve(async (req) => {
  const requestOrigin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: createCorsHeaders(requestOrigin) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' }), { status: 405, headers: createCorsHeaders(requestOrigin) });
  }

  try {
    const body: CreateWidgetTokenRequest = await req.json();
    const { slug, widget_type, config_version = '2.0', ttl_seconds = 3600 } = body || {} as CreateWidgetTokenRequest;

    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return new Response(JSON.stringify({ error: 'VALIDATION_ERROR', message: 'slug is required' }), { status: 400, headers: createCorsHeaders(requestOrigin) });
    }
    if (widget_type !== 'booking' && widget_type !== 'catering') {
      return new Response(JSON.stringify({ error: 'VALIDATION_ERROR', message: 'widget_type must be booking or catering' }), { status: 400, headers: createCorsHeaders(requestOrigin) });
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      slug,
      configVersion: config_version,
      timestamp: now,
      widgetType: widget_type,
      exp: now + Math.max(60, Math.min(6 * 3600, Number(ttl_seconds) || 3600)),
      iat: now
    } as Record<string, unknown>;

    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = b64urlEncode(JSON.stringify(header));
    const encodedPayload = b64urlEncode(JSON.stringify(payload));
    const signature = simpleHMAC(`${encodedHeader}.${encodedPayload}`, getWidgetSecret());
    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    const res = {
      token,
      expires_at: payload.exp,
    };

    return new Response(JSON.stringify(res), { status: 200, headers: createCorsHeaders(requestOrigin) });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Failed to create token', details: `${error}` }), { status: 500, headers: createCorsHeaders(requestOrigin) });
  }
});


