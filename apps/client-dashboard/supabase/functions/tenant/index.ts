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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const createCorsHeaders = (requestOrigin: string | null = null) => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';
  
  let allowedOrigin = '*';
  if (environment === 'production' && requestOrigin) {
    const allowedOrigins = [
      'https://app.blunari.ai',
      'https://demo.blunari.ai',
      'https://admin.blunari.ai', 
      'https://services.blunari.ai',
      'https://blunari.ai',
      'https://www.blunari.ai'
    ];
    
    console.log('CORS check:', {
      requestOrigin,
      allowedOrigins,
      isAllowed: allowedOrigins.includes(requestOrigin),
      environment
    });
    
    allowedOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : 'https://app.blunari.ai';
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, accept, accept-language, content-length',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
};

interface TenantRequest {
  slug?: string;
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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return createErrorResponse(
        'AUTH_REQUIRED', 
        'Authorization header required', 
        401, 
        requestId,
        requestOrigin
      );
    }

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return createErrorResponse(
        'AUTH_INVALID', 
        'Invalid authorization token', 
        401, 
        requestId,
        requestOrigin
      );
    }

    // Parse request body
    let body: TenantRequest = {};
    try {
      body = await req.json();
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

    let tenantData;

    if (body.slug) {
      // Resolve tenant by slug
      console.log(`Resolving tenant by slug: ${body.slug}`);
      
      const { data, error } = await supabaseClient
        .from('tenants')
        .select('id, name, slug, timezone, currency')
        .eq('slug', body.slug)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        console.error('Tenant not found for slug:', body.slug, error);
        return createErrorResponse(
          'TENANT_NOT_FOUND', 
          `Restaurant "${body.slug}" not found`, 
          404, 
          requestId,
          requestOrigin
        );
      }

      // Verify user has access to this tenant
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

      tenantData = data;
    } else {
      // Resolve tenant by user memberships
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
