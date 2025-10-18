import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConnectRequest {
  tenant_id: string
  provider_id: string
  redirect_url: string
}

interface OAuthConfig {
  client_id: string
  auth_url: string
  scopes: string[]
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  'clover': {
    client_id: Deno.env.get('CLOVER_CLIENT_ID') || '',
    auth_url: 'https://www.clover.com/oauth/authorize',
    scopes: ['read:orders', 'read:payments', 'read:inventory', 'read:customers']
  },
  'square': {
    client_id: Deno.env.get('SQUARE_CLIENT_ID') || '',
    auth_url: 'https://connect.squareup.com/oauth2/authorize',
    scopes: ['PAYMENTS_READ', 'ORDERS_READ', 'INVENTORY_READ', 'CUSTOMERS_READ']
  },
  'quickbooks': {
    client_id: Deno.env.get('QUICKBOOKS_CLIENT_ID') || '',
    auth_url: 'https://appcenter.intuit.com/connect/oauth2',
    scopes: ['com.intuit.quickbooks.accounting']
  }
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

    const { tenant_id, provider_id, redirect_url }: ConnectRequest = await req.json()

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

    // Get provider details
    const { data: provider, error: providerError } = await supabaseClient
      .from('integration_providers')
      .select('*')
      .eq('id', provider_id)
      .single()

    if (providerError || !provider) {
      throw new Error('Provider not found')
    }

    // Check if integration already exists
    const { data: existingIntegration } = await supabaseClient
      .from('integrations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('provider_id', provider_id)
      .single()

    if (existingIntegration) {
      throw new Error('Integration already exists')
    }

    if (provider.auth_type === 'oauth2') {
      const oauthConfig = OAUTH_CONFIGS[provider.slug]
      if (!oauthConfig || !oauthConfig.client_id) {
        throw new Error('OAuth configuration not available for this provider')
      }

      // Generate state parameter for security
      const state = crypto.randomUUID()
      
      // Store state in database for verification
      await supabaseClient
        .from('oauth_states')
        .insert({
          state,
          tenant_id,
          provider_id,
          redirect_url,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })

      // Build OAuth URL
      const authUrl = new URL(oauthConfig.auth_url)
      authUrl.searchParams.set('client_id', oauthConfig.client_id)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('redirect_uri', redirect_url)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('scope', oauthConfig.scopes.join(' '))

      return new Response(
        JSON.stringify({ 
          success: true, 
          auth_url: authUrl.toString() 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // Manual configuration required
      const { error: insertError } = await supabaseClient
        .from('integrations')
        .insert({
          tenant_id,
          provider_id,
          name: provider.name,
          status: 'disconnected',
          is_enabled: true,
          config: {},
          credentials: {}
        })

      if (insertError) {
        throw new Error('Failed to create integration')
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          requires_manual_config: true 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Integration connect error:', error)
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
