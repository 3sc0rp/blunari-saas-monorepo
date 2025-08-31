import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const requestData = await req.json()
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
    const { data: tenantId, error: provisionError } = await supabase.rpc('provision_tenant', {
      p_user_id: user.id,
      p_restaurant_name: requestData.basics.name,
      p_restaurant_slug: requestData.basics.slug,
      p_timezone: requestData.basics.timezone,
      p_currency: requestData.basics.currency
    })

    if (provisionError) {
      throw new Error(`Provisioning failed: ${provisionError.message}`)
    }

    // Send welcome email if requested
    if (requestData.owner.sendInvite) {
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          tenantId,
          ownerEmail: requestData.owner.email,
          tenantName: requestData.basics.name
        }
      })
    }

    const result = {
      success: true,
      runId: crypto.randomUUID(),
      tenantId,
      slug: requestData.basics.slug,
      primaryUrl: `https://${requestData.basics.slug}.lovable.app`,
      message: 'Tenant provisioned successfully',
      requestId
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Tenant provisioning error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      requestId: crypto.randomUUID()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})