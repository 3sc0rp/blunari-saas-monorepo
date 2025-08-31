import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify admin access
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header', requestId: crypto.randomUUID() }
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const requestData = await req.json()
    // Validate minimally to avoid shape mismatches
    const Schema = z.object({
      basics: z.object({ name: z.string(), slug: z.string(), timezone: z.string(), currency: z.string() }),
      owner: z.object({ email: z.string().email(), sendInvite: z.boolean().optional() }).optional(),
      idempotencyKey: z.string().uuid().optional(),
    })
    const parsed = Schema.safeParse(requestData)
    if (!parsed.success) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; '), requestId: crypto.randomUUID() }
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const requestId = crypto.randomUUID()
    
    console.log('Tenant provisioning request:', {
      requestId,
      idempotencyKey: requestData.idempotencyKey,
      tenantName: requestData.basics?.name
    })

    // Check idempotency
    if (requestData.idempotencyKey) {
      const { data: existing } = await supabase
        .from('auto_provisioning')
        .select('*')
        .eq('user_id', user.id)
        .eq('restaurant_slug', requestData.basics.slug)
        .single()

      if (existing) {
        console.log('Idempotent request detected, returning existing result')
        return new Response(JSON.stringify({
          success: true,
          message: 'Tenant already provisioned (idempotent)',
          tenantId: existing.tenant_id,
          slug: existing.restaurant_slug,
          requestId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Call the provision_tenant database function
    // NOTE: There are multiple overloaded versions in the DB; pass full argument list to disambiguate
    const { data: tenantId, error: provisionError } = await supabase.rpc('provision_tenant', {
      p_user_id: user.id,
      p_restaurant_name: requestData.basics.name,
      p_restaurant_slug: requestData.basics.slug,
      p_timezone: requestData.basics.timezone,
      p_currency: requestData.basics.currency,
      p_description: null,
      p_phone: null,
      p_email: null,
      p_website: null,
      p_address: null,
      p_cuisine_type_id: null,
    })

    if (provisionError) {
      const msg = provisionError.message?.includes('duplicate key')
        ? 'Slug already exists. Choose a different slug.'
        : provisionError.message
      throw new Error(`Provisioning failed: ${msg}`)
    }

    // Send emails if requested
    if (requestData.owner?.sendInvite && requestData.owner?.email) {
      const baseUrl = Deno.env.get('ADMIN_BASE_URL') ?? 'https://admin.blunari.ai'
      const ownerEmail = requestData.owner.email
      const restaurantName = requestData.basics.name

      // Fire-and-forget; do not block provisioning on email transport
      try { await supabase.functions.invoke('send-welcome-email', { body: { ownerName: restaurantName, ownerEmail, restaurantName, loginUrl: baseUrl } }) } catch (_) {}
      try { await supabase.functions.invoke('send-welcome-pack', { body: { ownerName: restaurantName, ownerEmail, restaurantName, loginUrl: baseUrl } }) } catch (_) {}
      try { await supabase.functions.invoke('send-credentials-email', { body: { ownerEmail, tenantName: restaurantName, loginUrl: baseUrl } }) } catch (_) {}
    }

    const responseData = {
      runId: crypto.randomUUID(),
      tenantId,
      slug: requestData.basics.slug,
      primaryUrl: Deno.env.get('ADMIN_BASE_URL') ?? 'https://admin.blunari.ai',
      message: 'Tenant provisioned successfully'
    }

    return new Response(JSON.stringify({
      success: true,
      data: responseData,
      requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Tenant provisioning error:', error)
    
    const requestId = crypto.randomUUID()
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'PROVISIONING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId
      },
      requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})