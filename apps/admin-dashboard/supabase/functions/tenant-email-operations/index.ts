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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get auth header from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { tenantSlug, emailType } = await req.json()

    // Resolve tenant ID from slug
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, name, email')
      .eq('slug', tenantSlug)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found', code: 'TENANT_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create background job for email sending
    const jobPayload = {
      tenantId: tenant.id,
      tenantSlug,
      emailType,
      recipientEmail: tenant.email,
      tenantName: tenant.name,
      timestamp: new Date().toISOString()
    }

    const { data: backgroundJob, error: jobError } = await supabaseClient
      .from('background_jobs')
      .insert({
        job_type: emailType === 'welcome' ? 'WELCOME_EMAIL' : 'NOTIFICATION_EMAIL',
        status: 'pending',
        payload: jobPayload,
        priority: 5,
        max_retries: 3,
        retry_count: 0
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create background job:', jobError)
      throw new Error('Failed to queue email for delivery')
    }

    // Log the email operation
    await supabaseClient
      .from('activity_logs')
      .insert({
        activity_type: 'email_resend',
        message: `${emailType} email queued for tenant ${tenant.name}`,
        details: {
          tenantSlug,
          emailType,
          jobId: backgroundJob.id,
          requestedBy: user.id
        },
        user_id: user.id
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${emailType} email has been queued for delivery`,
        jobId: backgroundJob.id,
        requestId: crypto.randomUUID()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Email operation error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTERNAL_ERROR',
        requestId: crypto.randomUUID()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})