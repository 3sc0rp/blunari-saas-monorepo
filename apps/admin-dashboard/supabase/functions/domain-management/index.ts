import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CloudflareResponse {
  success: boolean
  errors?: any[]
  messages?: any[]
  result?: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...params } = await req.json()
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    const cloudflareToken = Deno.env.get('CLOUDFLARE_API_TOKEN')
    const cloudflareHeaders = cloudflareToken ? {
      'Authorization': `Bearer ${cloudflareToken}`,
      'Content-Type': 'application/json',
    } : null

    let result
    
    switch (action) {
      case 'add_domain':
        result = await addDomain(supabase, params, cloudflareHeaders)
        break
      case 'verify_domain':
        result = await verifyDomain(supabase, params, cloudflareHeaders)
        break
      case 'provision_ssl':
        result = await provisionSSL(supabase, params, cloudflareHeaders)
        break
      case 'check_domain_health':
        result = await checkDomainHealth(supabase, params, cloudflareHeaders)
        break
      case 'update_dns_records':
        result = await updateDNSRecords(supabase, params, cloudflareHeaders)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Domain management error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function addDomain(supabase: any, params: any, cloudflareHeaders: any) {
  const { domain, tenant_id, domain_type = 'custom' } = params
  
  // Check if domain already exists
  const { data: existingDomain } = await supabase
    .from('domains')
    .select('id')
    .eq('domain', domain)
    .single()
    
  if (existingDomain) {
    throw new Error(`Domain ${domain} already exists`)
  }
  
  // Create domain in our database
  const { data: domainData, error: domainError } = await supabase
    .rpc('add_domain', {
      p_tenant_id: tenant_id,
      p_domain: domain,
      p_domain_type: domain_type
    })

  if (domainError) {
    throw new Error(`Failed to create domain: ${domainError.message}`)
  }

  // Get the created domain
  const { data: createdDomain } = await supabase
    .from('domains')
    .select('*')
    .eq('id', domainData)
    .single()

  // Check if Cloudflare is configured
  const cloudflareZoneId = Deno.env.get('CLOUDFLARE_ZONE_ID')
  if (!cloudflareZoneId || !cloudflareHeaders) {
    console.log('Cloudflare not configured, skipping external DNS setup')
    return { domain_id: domainData, cloudflare_data: null }
  }

  // Add to Cloudflare as custom hostname
  const cloudflareResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/custom_hostnames`, {
    method: 'POST',
    headers: cloudflareHeaders,
    body: JSON.stringify({
      hostname: domain,
      ssl: {
        method: 'http',
        type: 'dv',
        settings: {
          http2: 'on',
          min_tls_version: '1.2',
          tls_1_3: 'on'
        }
      }
    })
  })

  const cloudflareData: CloudflareResponse = await cloudflareResponse.json()
  
  if (!cloudflareData.success) {
    console.log('Cloudflare error:', cloudflareData.errors)
    // Don't throw error - just log it and continue without Cloudflare
    return { domain_id: domainData, cloudflare_data: null, warning: 'Domain created but Cloudflare setup failed' }
  }

  // Update domain with Cloudflare data
  await supabase
    .from('domains')
    .update({
      cloudflare_hostname_id: cloudflareData.result.id,
      status: 'pending',
      metadata: {
        cloudflare_status: cloudflareData.result.status,
        verification_errors: cloudflareData.result.verification_errors || []
      }
    })
    .eq('id', domainData)

  return { domain_id: domainData, cloudflare_data: cloudflareData.result }
}

async function verifyDomain(supabase: any, params: any, cloudflareHeaders: any) {
  const { domain_id } = params
  
  // Get domain from database
  const { data: domain } = await supabase
    .from('domains')
    .select('*')
    .eq('id', domain_id)
    .single()

  if (!domain?.cloudflare_hostname_id) {
    throw new Error('Domain not found or not configured with Cloudflare')
  }

  // Check status with Cloudflare
  const cloudflareResponse = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${Deno.env.get('CLOUDFLARE_ZONE_ID')}/custom_hostnames/${domain.cloudflare_hostname_id}`,
    { headers: cloudflareHeaders }
  )

  const cloudflareData: CloudflareResponse = await cloudflareResponse.json()
  
  if (!cloudflareData.success) {
    throw new Error(`Cloudflare error: ${cloudflareData.errors?.[0]?.message || 'Unknown error'}`)
  }

  const isVerified = cloudflareData.result.status === 'active'
  
  // Update domain verification status
  await supabase.rpc('verify_domain', {
    p_domain_id: domain_id,
    p_verification_success: isVerified
  })

  return {
    verified: isVerified,
    status: cloudflareData.result.status,
    ssl_status: cloudflareData.result.ssl?.status,
    verification_errors: cloudflareData.result.verification_errors || []
  }
}

async function provisionSSL(supabase: any, params: any, cloudflareHeaders: any) {
  const { domain_id } = params
  
  // Get domain from database
  const { data: domain } = await supabase
    .from('domains')
    .select('*')
    .eq('id', domain_id)
    .single()

  if (!domain?.cloudflare_hostname_id) {
    throw new Error('Domain not found or not configured with Cloudflare')
  }

  // Force SSL certificate generation
  const cloudflareResponse = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${Deno.env.get('CLOUDFLARE_ZONE_ID')}/custom_hostnames/${domain.cloudflare_hostname_id}`,
    {
      method: 'PATCH',
      headers: cloudflareHeaders,
      body: JSON.stringify({
        ssl: {
          method: 'http',
          type: 'dv'
        }
      })
    }
  )

  const cloudflareData: CloudflareResponse = await cloudflareResponse.json()
  
  if (!cloudflareData.success) {
    throw new Error(`Cloudflare SSL error: ${cloudflareData.errors?.[0]?.message || 'Unknown error'}`)
  }

  const sslData = cloudflareData.result.ssl
  const expiresAt = sslData?.expires_on ? new Date(sslData.expires_on) : null

  if (sslData?.status === 'active' && expiresAt) {
    // Update SSL certificate in database
    await supabase.rpc('update_ssl_certificate', {
      p_domain_id: domain_id,
      p_certificate_data: JSON.stringify(sslData),
      p_expires_at: expiresAt.toISOString(),
      p_status: 'active'
    })
  }

  return {
    ssl_status: sslData?.status,
    expires_at: expiresAt?.toISOString(),
    validation_method: sslData?.validation_method
  }
}

async function checkDomainHealth(supabase: any, params: any, cloudflareHeaders: any) {
  const { domain_id } = params
  
  // Get domain from database
  const { data: domain } = await supabase
    .from('domains')
    .select('*')
    .eq('id', domain_id)
    .single()

  if (!domain) {
    throw new Error('Domain not found')
  }

  const startTime = Date.now()
  const healthData: any = {
    domain: domain.domain,
    status: 'unknown',
    response_time_ms: 0,
    ssl_days_remaining: null,
    check_data: {}
  }

  try {
    // Test HTTP connectivity
    const httpResponse = await fetch(`https://${domain.domain}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    healthData.response_time_ms = Date.now() - startTime
    healthData.status = httpResponse.ok ? 'healthy' : 'degraded'
    healthData.check_data.http_status = httpResponse.status
    
    // Check SSL certificate if domain uses HTTPS
    if (domain.ssl_expires_at) {
      const expiresAt = new Date(domain.ssl_expires_at)
      const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      healthData.ssl_days_remaining = daysRemaining
      
      if (daysRemaining < 30) {
        healthData.status = daysRemaining < 7 ? 'unhealthy' : 'degraded'
      }
    }

  } catch (error) {
    healthData.status = 'unhealthy'
    healthData.check_data.error = error.message
  }

  // Save health check result
  await supabase
    .from('domain_health_checks')
    .insert({
      domain_id: domain_id,
      tenant_id: domain.tenant_id,
      check_type: 'automated',
      status: healthData.status,
      response_time_ms: healthData.response_time_ms,
      ssl_days_remaining: healthData.ssl_days_remaining,
      check_data: healthData.check_data
    })

  return healthData
}

async function updateDNSRecords(supabase: any, params: any, cloudflareHeaders: any) {
  const { domain_id, records } = params
  
  // Get domain from database
  const { data: domain } = await supabase
    .from('domains')
    .select('*')
    .eq('id', domain_id)
    .single()

  if (!domain?.cloudflare_zone_id) {
    throw new Error('Domain not found or zone not configured')
  }

  const results = []
  
  for (const record of records) {
    try {
      let cloudflareResponse
      
      if (record.cloudflare_record_id) {
        // Update existing record
        cloudflareResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${domain.cloudflare_zone_id}/dns_records/${record.cloudflare_record_id}`,
          {
            method: 'PUT',
            headers: cloudflareHeaders,
            body: JSON.stringify({
              type: record.record_type,
              name: record.name,
              content: record.value,
              ttl: record.ttl || 3600,
              priority: record.priority
            })
          }
        )
      } else {
        // Create new record
        cloudflareResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${domain.cloudflare_zone_id}/dns_records`,
          {
            method: 'POST',
            headers: cloudflareHeaders,
            body: JSON.stringify({
              type: record.record_type,
              name: record.name,
              content: record.value,
              ttl: record.ttl || 3600,
              priority: record.priority
            })
          }
        )
      }

      const cloudflareData: CloudflareResponse = await cloudflareResponse.json()
      
      if (cloudflareData.success) {
        // Update or create DNS record in our database
        const { data: dnsRecord } = await supabase
          .from('dns_records')
          .upsert({
            id: record.id || undefined,
            domain_id: domain_id,
            tenant_id: domain.tenant_id,
            record_type: record.record_type,
            name: record.name,
            value: record.value,
            ttl: record.ttl || 3600,
            priority: record.priority,
            cloudflare_record_id: cloudflareData.result.id,
            status: 'active'
          })
          .select()
          .single()

        results.push({ success: true, record: dnsRecord })
      } else {
        results.push({ 
          success: false, 
          error: cloudflareData.errors?.[0]?.message || 'Unknown error',
          record: record
        })
      }
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message,
        record: record
      })
    }
  }

  return { results }
}