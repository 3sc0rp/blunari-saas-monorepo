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

    console.log('Running system health check...')

    const healthChecks = []

    // Database health check
    const dbStart = Date.now()
    try {
      const { data, error } = await supabaseClient
        .from('tenants')
        .select('count(*)')
        .single()

      healthChecks.push({
        service: 'Database',
        status: error ? 'unhealthy' : 'healthy',
        response_time: Date.now() - dbStart,
        details: error ? { error: error.message } : { tenant_count: data?.count || 0 }
      })
    } catch (error) {
      healthChecks.push({
        service: 'Database',
        status: 'unhealthy',
        response_time: Date.now() - dbStart,
        details: { error: error.message }
      })
    }

    // Auth service health check
    const authStart = Date.now()
    try {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/health`, {
        headers: {
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        }
      })

      healthChecks.push({
        service: 'Authentication',
        status: response.ok ? 'healthy' : 'degraded',
        response_time: Date.now() - authStart,
        details: { status_code: response.status }
      })
    } catch (error) {
      healthChecks.push({
        service: 'Authentication',
        status: 'unhealthy',
        response_time: Date.now() - authStart,
        details: { error: error.message }
      })
    }

    // Storage service health check
    const storageStart = Date.now()
    try {
      const { data, error } = await supabaseClient.storage.listBuckets()

      healthChecks.push({
        service: 'Storage',
        status: error ? 'degraded' : 'healthy',
        response_time: Date.now() - storageStart,
        details: error ? { error: error.message } : { buckets_count: data?.length || 0 }
      })
    } catch (error) {
      healthChecks.push({
        service: 'Storage',
        status: 'unhealthy',
        response_time: Date.now() - storageStart,
        details: { error: error.message }
      })
    }

    // Edge Functions health check
    const functionsStart = Date.now()
    try {
      const { data, error } = await supabaseClient.functions.invoke('health-check', {
        body: { check: 'ping' }
      })

      healthChecks.push({
        service: 'Edge Functions',
        status: error ? 'degraded' : 'healthy',
        response_time: Date.now() - functionsStart,
        details: error ? { error: error.message } : data
      })
    } catch (error) {
      healthChecks.push({
        service: 'Edge Functions',
        status: 'degraded',
        response_time: Date.now() - functionsStart,
        details: { error: error.message }
      })
    }

    // Record system metrics
    for (const check of healthChecks) {
      await supabaseClient
        .from('system_health_metrics')
        .insert({
          metric_name: `${check.service.toLowerCase()}_response_time`,
          metric_value: check.response_time,
          metric_unit: 'ms',
          service_name: check.service.toLowerCase(),
          severity: check.status === 'healthy' ? 'info' : 'warning',
          metadata: check.details
        })

      await supabaseClient
        .from('system_health_metrics')
        .insert({
          metric_name: `${check.service.toLowerCase()}_status`,
          metric_value: check.status === 'healthy' ? 1 : 0,
          metric_unit: 'boolean',
          service_name: check.service.toLowerCase(),
          severity: check.status === 'healthy' ? 'info' : 'warning',
          metadata: check.details
        })
    }

    const overallStatus = healthChecks.every(check => check.status === 'healthy') 
      ? 'healthy' 
      : healthChecks.some(check => check.status === 'unhealthy') 
        ? 'unhealthy' 
        : 'degraded'

    return new Response(
      JSON.stringify({ 
        success: true,
        overall_status: overallStatus,
        timestamp: new Date().toISOString(),
        services: healthChecks
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('System health check error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        overall_status: 'unhealthy'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})