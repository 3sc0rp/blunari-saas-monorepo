import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const createCorsHeaders = (requestOrigin: string | null = null) => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  const normalize = (origin: string | null) => {
    if (!origin) return null;
    if (origin === 'null') return 'null';
    try { const u = new URL(origin); return `${u.protocol}//${u.host}`; } catch { return null; }
  };
  const origin = normalize(requestOrigin);

  let allowedOrigin = '*';
  if (environment === 'production') {
    const allowedOrigins = [
      'https://app.blunari.ai',
      'https://demo.blunari.ai',
      'https://admin.blunari.ai', 
      'https://services.blunari.ai',
      'https://blunari.ai',
      'https://www.blunari.ai',
      'null' // allow sandboxed/opaque origins (e.g., test runners, data URLs)
    ];

    const chosen = origin && allowedOrigins.includes(origin) ? origin : (origin === 'null' ? 'null' : 'https://app.blunari.ai');
    allowedOrigin = chosen;
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, accept, accept-language, content-length',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
};

// ---- Widget token verification (for public widget context) ----
function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  try { return atob(base64); } catch { return ''; }
}

function simpleHMAC(data: string, secret: string): string {
  // Non-cryptographic lightweight HMAC-like function used in create-widget-token
  let hash = secret;
  for (let i = 0; i < data.length; i++) {
    hash = (((hash.charCodeAt(i % hash.length) ^ data.charCodeAt(i)) % 256).toString(16).padStart(2, '0')) + hash;
  }
  // base64url encode first 64 chars
  const raw = hash.substring(0, 64);
  const b64 = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');
  return b64;
}

function getWidgetSecret(): string {
  return Deno.env.get('WIDGET_JWT_SECRET') || Deno.env.get('VITE_JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET') || 'dev-jwt-secret-change-in-production-2025';
}

function verifyWidgetToken(token: string): { slug?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signature] = parts;
    const expectedSig = simpleHMAC(`${headerB64}.${payloadB64}`, getWidgetSecret());
    if (signature !== expectedSig) return null;
    const payloadStr = b64urlDecode(payloadB64);
    const payload = JSON.parse(payloadStr || '{}');
    if (!payload || typeof payload !== 'object') return null;
    if (payload.exp && typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) return null;
    }
    return { slug: payload.slug, exp: payload.exp };
  } catch {
    return null;
  }
}

interface TenantRequest {
  slug?: string;
  token?: string; // optional widget token for public context
}

interface TenantResponse {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  currency: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createSuccessResponse(data: TenantResponse, requestOrigin: string | null = null) {
  return new Response(
    JSON.stringify({ data }),
    { 
      headers: { 
        'Content-Type': 'application/json',
        ...createCorsHeaders(requestOrigin)
      } 
    }
  );
}

function createErrorResponse(code: string, message: string, status: number, requestId: string, requestOrigin: string | null = null) {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      requestId
    }
  };
  
  return new Response(
    JSON.stringify(errorResponse),
    { 
      status, 
      headers: { 
        'Content-Type': 'application/json',
        ...createCorsHeaders(requestOrigin)
      } 
    }
  );
}

serve(async (req) => {
  const requestId = generateRequestId();
  const requestOrigin = req.headers.get('origin');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: createCorsHeaders(requestOrigin) });
  }

  // Only allow POST requests for consistent API design
  if (req.method !== 'POST') {
    return createErrorResponse(
      'METHOD_NOT_ALLOWED', 
      'Only POST requests are allowed', 
      405, 
      requestId,
      requestOrigin
    );
  }

  try {
    // Create Supabase client with service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create anon client for user verification
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse request body with enhanced error handling
    let body: TenantRequest = {};
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim().length > 0) {
        body = JSON.parse(bodyText);
      }
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      return createErrorResponse(
        'INVALID_JSON', 
        'Invalid JSON in request body', 
        400, 
        requestId,
        requestOrigin
      );
    }

    // Determine auth mode: user JWT or widget token
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    const tokenFromBody = body.token && typeof body.token === 'string' ? body.token : undefined;
    const widgetTokenPayload = tokenFromBody ? verifyWidgetToken(tokenFromBody) : null;
    const isWidgetTokenFlow = !!widgetTokenPayload;

    let user: any = null;
    if (!isWidgetTokenFlow) {
      if (!authHeader) {
        return createErrorResponse(
          'AUTH_REQUIRED',
          'Authorization header required',
          401,
          requestId,
          requestOrigin
        );
      }
      const { data: { user: supaUser }, error: authError } = await anonClient.auth.getUser(authHeader);
      if (authError || !supaUser) {
        console.error('Auth error:', authError);
        return createErrorResponse(
          'AUTH_INVALID',
          'Invalid authorization token',
          401,
          requestId,
          requestOrigin
        );
      }
      user = supaUser;
    }

    let tenantData;

    if (body.slug || (isWidgetTokenFlow && widgetTokenPayload?.slug)) {
      // Resolve tenant by slug
      const slug = (body.slug || widgetTokenPayload?.slug) as string;
      console.log(`Resolving tenant by slug: ${slug}${isWidgetTokenFlow ? ' (widget token)' : ''}`);
      
      const { data, error } = await supabaseClient
        .from('tenants')
        .select('id, name, slug, timezone, currency')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        console.error('Tenant not found for slug:', slug, error);
        return createErrorResponse(
          'TENANT_NOT_FOUND', 
          `Restaurant "${slug}" not found`, 
          404, 
          requestId,
          requestOrigin
        );
      }

      // Verify access for dashboard users; widget token flow bypasses user check
      if (!isWidgetTokenFlow) {
        const hasAccess = await checkUserTenantAccess(supabaseClient, user.id, data.id);
        if (!hasAccess) {
          console.error('User access denied to tenant:', user.id, data.id);
          return createErrorResponse(
            'ACCESS_DENIED', 
            'Access denied to this restaurant', 
            403, 
            requestId,
            requestOrigin
          );
        }
      }

      tenantData = data;
    } else {
      // Resolve tenant by user memberships
      if (isWidgetTokenFlow) {
        return createErrorResponse(
          'TENANT_SLUG_REQUIRED',
          'slug is required when using widget token',
          400,
          requestId,
          requestOrigin
        );
      }
      console.log(`Resolving tenant by user memberships: ${user.id}`);
      
      const tenantId = await resolveUserTenant(supabaseClient, user.id);
      if (!tenantId) {
        return createErrorResponse(
          'NO_TENANT_ACCESS', 
          'No restaurant access found for your account', 
          404, 
          requestId,
          requestOrigin
        );
      }

      // Get the full tenant data
      const { data, error } = await supabaseClient
        .from('tenants')
        .select('id, name, slug, timezone, currency')
        .eq('id', tenantId)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        console.error('Tenant data fetch error:', error);
        return createErrorResponse(
          'TENANT_DATA_ERROR', 
          'Unable to load restaurant data', 
          500, 
          requestId,
          requestOrigin
        );
      }

      tenantData = data;
    }

    const response: TenantResponse = {
      id: tenantData.id,
      slug: tenantData.slug,
      name: tenantData.name,
      timezone: tenantData.timezone || 'America/New_York',
      currency: tenantData.currency || 'USD'
    };

    console.log(`Tenant resolved successfully:`, { tenantId: response.id, slug: response.slug, userId: user.id });
    return createSuccessResponse(response, requestOrigin);

  } catch (error) {
    console.error('Tenant resolution error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR', 
      'Internal server error', 
      500, 
      requestId,
      requestOrigin
    );
  }
});

async function checkUserTenantAccess(supabaseClient: any, userId: string, tenantId: string): Promise<boolean> {
  // Check user_tenant_access table
  const { data: userAccess } = await supabaseClient
    .from('user_tenant_access')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .single();

  if (userAccess) return true;

  // Check auto_provisioning table
  const { data: autoProvision } = await supabaseClient
    .from('auto_provisioning')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .single();

  if (autoProvision) return true;

  // For demo purposes, allow access to demo tenant
  const { data: demoTenant } = await supabaseClient
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .eq('slug', 'demo')
    .eq('status', 'active')
    .single();

  return !!demoTenant;
}

async function resolveUserTenant(supabaseClient: any, userId: string): Promise<string | null> {
  // Method 1: Check user_tenant_access table (with preference for default/recently used)
  const { data: userTenantAccess } = await supabaseClient
    .from('user_tenant_access')
    .select('tenant_id, is_default, last_accessed_at')
    .eq('user_id', userId)
    .eq('active', true)
    .order('is_default', { ascending: false })
    .order('last_accessed_at', { ascending: false });

  if (userTenantAccess && userTenantAccess.length > 0) {
    return userTenantAccess[0].tenant_id;
  }

  // Method 2: Check auto_provisioning table
  const { data: autoProvisionData } = await supabaseClient
    .from('auto_provisioning')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1);

  if (autoProvisionData && autoProvisionData.length > 0) {
    return autoProvisionData[0].tenant_id;
  }

  // Method 3: Demo tenant fallback for testing
  const { data: demoTenant } = await supabaseClient
    .from('tenants')
    .select('id')
    .eq('slug', 'demo')
    .eq('status', 'active')
    .single();

  if (demoTenant) {
    return demoTenant.id;
  }

  return null;
}
