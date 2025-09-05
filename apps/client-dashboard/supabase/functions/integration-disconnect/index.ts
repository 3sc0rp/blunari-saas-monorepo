import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DisconnectRequest {
  tenant_id: string
  integration_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the JWT token
    const { data: user, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user.user) {
      throw new Error('Unauthorized')
    }

    const { tenant_id, integration_id }: DisconnectRequest = await req.json()

    // Verify user has access to tenant
    const { data: tenantUser, error: tenantError } = await supabaseClient
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', user.user.id)
      .single()

    if (tenantError || !tenantUser) {
      throw new Error('Access denied to tenant')
    }

    // Get integration details
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select(`
        *,
        provider:integration_providers(*)
      `)
      .eq('id', integration_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (integrationError || !integration) {
      throw new Error('Integration not found')
    }

    // Cancel any running syncs
    await supabaseClient
      .from('sync_history')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Integration disconnected'
      })
      .eq('integration_id', integration_id)
      .eq('status', 'running')

    // For OAuth integrations, we should revoke the token
    if (integration.provider.auth_type === 'oauth2' && integration.credentials?.access_token) {
      try {
        // Provider-specific token revocation
        switch (integration.provider.slug) {
          case 'clover':
            await fetch('https://api.clover.com/oauth/revoke', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: `token=${integration.credentials.access_token}`
            })
            break
          case 'square':
            await fetch('https://connect.squareup.com/oauth2/revoke', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Client ${Deno.env.get('SQUARE_CLIENT_SECRET')}`
              },
              body: JSON.stringify({
                access_token: integration.credentials.access_token
              })
            })
            break
          case 'quickbooks':
            // QuickBooks uses a different revocation flow
            const qbRevokeUrl = `https://appcenter.intuit.com/api/v1/connection/disconnect?access_token=${integration.credentials.access_token}`
            await fetch(qbRevokeUrl, { method: 'GET' })
            break
        }
      } catch (revokeError) {
        console.error('Token revocation error:', revokeError)
        // Continue with disconnect even if token revocation fails
      }
    }

    // Update integration to disconnected state
    const { error: updateError } = await supabaseClient
      .from('integrations')
      .update({
        status: 'disconnected',
        is_enabled: false,
        credentials: {}, // Clear credentials
        error_message: null,
        error_count: 0,
        last_sync_at: null,
        next_sync_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', integration_id)
      .eq('tenant_id', tenant_id)

    if (updateError) {
      throw new Error('Failed to update integration status')
    }

    // Log the disconnection
    await supabaseClient
      .from('sync_history')
      .insert({
        tenant_id,
        integration_id,
        sync_type: 'disconnect',
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        records_processed: 0,
        metadata: {
          disconnected_by: user.user.id,
          reason: 'manual_disconnect'
        }
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${integration.name} has been disconnected successfully`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Integration disconnect error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
