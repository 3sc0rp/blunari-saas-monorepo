import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  tenant_id: string
  integration_id: string
  sync_type: 'full' | 'incremental'
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

    const { tenant_id, integration_id, sync_type }: SyncRequest = await req.json()

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

    if (integration.status !== 'connected') {
      throw new Error('Integration is not connected')
    }

    if (!integration.is_enabled) {
      throw new Error('Integration is disabled')
    }

    // Check if there's already a sync in progress
    const { data: existingSync } = await supabaseClient
      .from('sync_history')
      .select('id')
      .eq('integration_id', integration_id)
      .eq('status', 'running')
      .single()

    if (existingSync) {
      throw new Error('Sync already in progress for this integration')
    }

    // Create sync history record
    const { data: syncRecord, error: syncError } = await supabaseClient
      .from('sync_history')
      .insert({
        tenant_id,
        integration_id,
        sync_type,
        status: 'pending',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (syncError || !syncRecord) {
      throw new Error('Failed to create sync record')
    }

    // Update integration status to syncing
    await supabaseClient
      .from('integrations')
      .update({
        status: 'syncing',
        updated_at: new Date().toISOString()
      })
      .eq('id', integration_id)

    // Queue sync job in background-ops service
    const backgroundOpsUrl = Deno.env.get('BACKGROUND_OPS_URL') || 'http://localhost:3001'
    
    try {
      const jobResponse = await fetch(`${backgroundOpsUrl}/api/jobs/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('BACKGROUND_OPS_TOKEN')}`
        },
        body: JSON.stringify({
          sync_id: syncRecord.id,
          tenant_id,
          integration_id,
          provider_slug: integration.provider.slug,
          sync_type,
          config: integration.config,
          credentials: integration.credentials
        })
      })

      if (!jobResponse.ok) {
        throw new Error(`Background job failed: ${jobResponse.status}`)
      }

      const jobResult = await jobResponse.json()

      // Update sync record with job ID
      await supabaseClient
        .from('sync_history')
        .update({
          status: 'running',
          metadata: { job_id: jobResult.job_id }
        })
        .eq('id', syncRecord.id)

    } catch (bgError) {
      console.error('Background job error:', bgError)
      
      // Mark sync as failed
      await supabaseClient
        .from('sync_history')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Failed to queue background job'
        })
        .eq('id', syncRecord.id)

      // Reset integration status
      await supabaseClient
        .from('integrations')
        .update({
          status: 'error',
          error_message: 'Failed to start sync',
          updated_at: new Date().toISOString()
        })
        .eq('id', integration_id)

      throw new Error('Failed to start background sync job')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sync_id: syncRecord.id,
        message: `${sync_type} sync started for ${integration.name}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Integration sync error:', error)
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
