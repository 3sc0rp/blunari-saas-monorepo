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

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body for action and parameters
    const requestData = await req.json()
    const action = requestData.action || 'list'
    
    console.log(`Jobs API called with action: ${action}`, requestData)
    
    // If action is 'cleanup', handle database cleanup
    if (action === 'cleanup') {
      console.log('Cleaning up corrupted jobs from database...')
      
      try {
        // Delete jobs with corrupted payloads or invalid data
        const { data: corruptedJobs, error: selectError } = await supabaseClient
          .from('background_jobs')
          .select('id, job_type, status, payload')
          .limit(100)
        
        if (selectError) {
          console.error('Error selecting jobs:', selectError)
          return new Response(
            JSON.stringify({ error: 'Failed to select jobs', details: selectError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log(`Found ${corruptedJobs?.length || 0} jobs in database`)
        
        // Delete old health check jobs or jobs with invalid data
        const { data: deletedJobs, error: deleteError } = await supabaseClient
          .from('background_jobs')
          .delete()
          .or('job_type.eq.health_check,status.eq.failed,created_at.lt.2024-01-01')
          .select()
        
        if (deleteError) {
          console.error('Error deleting corrupted jobs:', deleteError)
          return new Response(
            JSON.stringify({ error: 'Failed to delete corrupted jobs', details: deleteError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log(`Deleted ${deletedJobs?.length || 0} corrupted jobs`)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Cleaned up ${deletedJobs?.length || 0} corrupted jobs`,
            remainingJobs: corruptedJobs?.length || 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError)
        return new Response(
          JSON.stringify({ error: 'Cleanup failed', details: cleanupError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // If action is 'debug', show database contents
    if (action === 'debug') {
      console.log('Debugging database contents...')
      
      try {
        const { data: jobs, error: dbError } = await supabaseClient
          .from('background_jobs')
          .select('*')
          .limit(10)
        
        if (dbError) {
          console.error('Database error:', dbError)
          return new Response(
            JSON.stringify({ error: 'Database query failed', details: dbError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log('Database jobs:', JSON.stringify(jobs, null, 2))
        
        return new Response(
          JSON.stringify({ 
            debug: true,
            jobsInDatabase: jobs?.length || 0,
            jobs: jobs || [],
            backgroundOpsUrl: Deno.env.get('BACKGROUND_OPS_URL'),
            apiKeyPresent: !!Deno.env.get('BACKGROUND_OPS_API_KEY')
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (debugError) {
        console.error('Debug error:', debugError)
        return new Response(
          JSON.stringify({ error: 'Debug failed', details: debugError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    const backgroundOpsUrl = Deno.env.get('BACKGROUND_OPS_URL')
    const backgroundOpsApiKey = Deno.env.get('BACKGROUND_OPS_API_KEY') ?? ''

    console.log(`Jobs API: ${action}`)
    console.log(`Background Ops URL: ${backgroundOpsUrl}`)
    console.log(`API Key present: ${backgroundOpsApiKey ? 'Yes' : 'No'}`)

    // If no background ops URL is configured, use database for real data
    if (!backgroundOpsUrl) {
      console.log('BACKGROUND_OPS_URL not configured, using database data')
      
      if (action === 'list') {
        try {
          const { data: jobs, error: dbError } = await supabaseClient
            .from('background_jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
          
          if (dbError) {
            console.error('Database error fetching jobs:', dbError)
            return new Response(
              JSON.stringify({ error: 'Failed to fetch jobs from database', details: dbError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          
          // Transform database format to API format
          const transformedJobs = (jobs || []).map(job => ({
            id: job.id,
            type: job.job_type,
            status: job.status,
            payload: job.payload || {},
            priority: job.priority || 0,
            progress: Math.min(100, Math.max(0, job.progress || 0)),
            created_at: job.created_at,
            started_at: job.started_at,
            completed_at: job.completed_at,
            error: job.error_message
          }))
          
          return new Response(
            JSON.stringify({
              jobs: transformedJobs,
              total: transformedJobs.length
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        } catch (error) {
          console.error('Error fetching jobs from database:', error)
          return new Response(
            JSON.stringify({ error: 'Database connection failed', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
      
      if (action === 'create') {
        try {
          const { data: newJob, error: createError } = await supabaseClient
            .from('background_jobs')
            .insert({
              job_type: requestData.type,
              status: 'pending',
              payload: requestData.payload || {},
              priority: requestData.priority || 0,
              progress: 0
            })
            .select()
            .single()
          
          if (createError) {
            console.error('Error creating job:', createError)
            return new Response(
              JSON.stringify({ error: 'Failed to create job', details: createError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          
          const transformedJob = {
            id: newJob.id,
            type: newJob.job_type,
            status: newJob.status,
            payload: newJob.payload || {},
            priority: newJob.priority || 0,
            progress: newJob.progress || 0,
            created_at: newJob.created_at
          }
          
          return new Response(
            JSON.stringify(transformedJob),
            { 
              status: 201,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        } catch (error) {
          console.error('Error creating job:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to create job', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
      
      if (action === 'cancel') {
        try {
          const { data: updatedJob, error: updateError } = await supabaseClient
            .from('background_jobs')
            .update({ status: 'cancelled' })
            .eq('id', requestData.id)
            .select()
            .single()
          
          if (updateError) {
            console.error('Error cancelling job:', updateError)
            return new Response(
              JSON.stringify({ error: 'Failed to cancel job', details: updateError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          
          return new Response(
            JSON.stringify({ success: true, job: updatedJob }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        } catch (error) {
          console.error('Error cancelling job:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to cancel job', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Using database for background operations' }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let endpoint = '/api/v1/jobs'
    let method = 'GET'
    let body = null

    switch (action) {
      case 'list':
        endpoint = '/api/v1/jobs'
        method = 'GET'
        break
      case 'get':
        endpoint = `/api/v1/jobs/${requestData.id}`
        method = 'GET'
        break
      case 'create':
        endpoint = '/api/v1/jobs'
        method = 'POST'
        body = JSON.stringify({
          type: requestData.type,
          payload: requestData.payload || {},
          priority: requestData.priority || 1
        })
        break
      case 'cancel':
        endpoint = `/api/v1/jobs/${requestData.id}/cancel`
        method = 'POST'
        break
      case 'retry':
        endpoint = `/api/v1/jobs/${requestData.id}/retry`
        method = 'POST'
        break
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    const response = await fetch(`${backgroundOpsUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': backgroundOpsApiKey,
      },
      body,
    })

    console.log(`Response status: ${response.status}`)
    console.log(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Background service error: ${response.status} - ${errorText}`)
      return new Response(
        JSON.stringify({ 
          error: `Background service returned ${response.status}`, 
          details: errorText 
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      { 
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Jobs API error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})