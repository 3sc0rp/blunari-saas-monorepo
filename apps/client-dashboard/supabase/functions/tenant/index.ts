import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface TenantRequest {
  slug?: string;
}

interface TenantResponse {
  tenantId: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Support both GET and POST requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET and POST requests are allowed' } }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: 'Authorization header required' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: { code: 'AUTH_INVALID', message: 'Invalid authorization token' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body if POST, otherwise use empty object for GET
    let body: TenantRequest = {}
    if (req.method === 'POST') {
      try {
        body = await req.json()
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError)
        return new Response(
          JSON.stringify({ error: { code: 'INVALID_JSON', message: 'Invalid JSON in request body' } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    let tenantData;

    if (body.slug) {
      // Resolve tenant by slug
      const { data, error } = await supabaseClient
        .from('tenants')
        .select('id, name, slug, timezone, currency')
        .eq('slug', body.slug)
        .eq('status', 'active')
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify user has access to this tenant
      const { data: membershipData, error: membershipError } = await supabaseClient
        .from('auto_provisioning')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('tenant_id', data.id)
        .eq('status', 'completed')
        .single()

      if (membershipError || !membershipData) {
        return new Response(
          JSON.stringify({ error: { code: 'AUTH_FORBIDDEN', message: 'Access denied to this tenant' } }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      tenantData = data
    } else {
      // Get tenant from user's auto_provisioning record
      const { data, error } = await supabaseClient
        .from('auto_provisioning')
        .select(`
          tenant_id,
          tenants (
            id,
            name,
            slug,
            timezone,
            currency
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .single()

      if (error || !data || !data.tenants) {
        return new Response(
          JSON.stringify({ error: { code: 'TENANT_NOT_FOUND', message: 'No tenant found for user' } }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      tenantData = data.tenants
    }

    const response: TenantResponse = {
      tenantId: tenantData.id,
      name: tenantData.name,
      slug: tenantData.slug,
      timezone: tenantData.timezone || 'America/New_York',
      currency: tenantData.currency || 'USD'
    }

    return new Response(
      JSON.stringify({ data: response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Tenant resolution error:', error)
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Internal server error',
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
