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

    const { tenantSlug, tenantId: inputTenantId, emailType } = await req.json()

    // Resolve tenant either by id or slug
    let tenantIdToUse = inputTenantId as string | undefined
    let tenantQuery
    if (tenantIdToUse) {
      tenantQuery = supabaseClient
        .from('tenants')
        .select('id, name, email')
        .eq('id', tenantIdToUse)
        .single()
    } else {
      tenantQuery = supabaseClient
        .from('tenants')
        .select('id, name, email')
        .eq('slug', tenantSlug)
        .single()
    }

    const { data: tenant, error: tenantError } = await tenantQuery

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

    // Build deterministic job_name to satisfy NOT NULL and aid debugging
    const jobName = `WELCOME_EMAIL:${tenant.id}:${crypto.randomUUID()}`

    const { data: backgroundJob, error: jobError } = await supabaseClient
      .from('background_jobs')
      .insert({
        job_type: emailType === 'welcome' ? 'WELCOME_EMAIL' : 'NOTIFICATION_EMAIL',
        job_name: jobName,
        // compatibility with schemas that also store generic columns
        type: emailType === 'welcome' ? 'WELCOME_EMAIL' : 'NOTIFICATION_EMAIL',
        name: jobName,
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
      const err: any = jobError
      return new Response(
        JSON.stringify({ 
          success: false,
          error: {
            message: err.message || 'Failed to queue email for delivery',
            code: err.code || 'DB_ERROR',
            details: err.details || null,
            hint: err.hint || null
          },
          requestId: crypto.randomUUID()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Optionally send the email immediately via the dedicated function (if SMTP is configured)
    let emailDispatch: any = null;
    try {
      const sendResp = await supabaseClient.functions.invoke('send-welcome-email', {
        body: {
          ownerName: tenant.name,
          ownerEmail: tenant.email,
          restaurantName: tenant.name,
          loginUrl: Deno.env.get('ADMIN_BASE_URL') ?? 'https://admin.blunari.ai'
        }
      });
      emailDispatch = sendResp.data;
    } catch (e) {
      // Soft-fail: keep the job queued even if direct send fails
      emailDispatch = { success: false, error: e instanceof Error ? e.message : 'Email dispatch failed' };
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
          requestedBy: user.id,
          emailDispatch
        },
        user_id: user.id
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${emailType} email has been queued for delivery`,
        jobId: backgroundJob.id,
        email: emailDispatch,
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