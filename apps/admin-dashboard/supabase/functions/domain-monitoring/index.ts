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

    console.log('Starting domain monitoring check...')

    // Get all active domains
    const { data: domains, error: domainsError } = await supabaseClient
      .from('domains')
      .select('*')
      .eq('status', 'active')

    if (domainsError) {
      throw domainsError
    }

    console.log(`Found ${domains?.length || 0} active domains to monitor`)

    const results = []

    for (const domain of domains || []) {
      try {
        // Check domain health
        const response = await fetch(`https://${domain.domain}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        const status = response.ok ? 'healthy' : 'unhealthy'
        const responseTime = Date.now() // Simplified response time

        // Insert health check record
        await supabaseClient
          .from('domain_health_checks')
          .insert({
            domain_id: domain.id,
            tenant_id: domain.tenant_id,
            check_type: 'http',
            status: status,
            response_time_ms: responseTime,
            check_data: {
              status_code: response.status,
              headers: Object.fromEntries(response.headers.entries())
            }
          })

        results.push({
          domain: domain.domain,
          status,
          response_time: responseTime
        })

        console.log(`Domain ${domain.domain}: ${status} (${responseTime}ms)`)

      } catch (error) {
        console.error(`Error checking domain ${domain.domain}:`, error)
        
        // Insert failed health check
        await supabaseClient
          .from('domain_health_checks')
          .insert({
            domain_id: domain.id,
            tenant_id: domain.tenant_id,
            check_type: 'http',
            status: 'error',
            error_message: error.message,
            check_data: { error: error.message }
          })

        results.push({
          domain: domain.domain,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: results.length,
        results: results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Domain monitoring error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})