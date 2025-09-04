import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestRequest {
  tenant_id: string
  integration_id: string
}

interface TestResult {
  success: boolean
  message: string
  details?: Record<string, any>
}

async function testCloverConnection(config: any, credentials: any): Promise<TestResult> {
  try {
    const response = await fetch(`https://api.clover.com/v3/merchants/${config.merchant_id}`, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`
      }
    })

    if (!response.ok) {
      return {
        success: false,
        message: `Clover API error: ${response.status} ${response.statusText}`
      }
    }

    const merchant = await response.json()
    return {
      success: true,
      message: `Connected to ${merchant.name}`,
      details: {
        merchant_name: merchant.name,
        merchant_id: merchant.id,
        timezone: merchant.timezone
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

async function testSquareConnection(config: any, credentials: any): Promise<TestResult> {
  try {
    const response = await fetch('https://connect.squareup.com/v2/locations', {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Square-Version': '2023-10-18'
      }
    })

    if (!response.ok) {
      return {
        success: false,
        message: `Square API error: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()
    return {
      success: true,
      message: `Connected to ${data.locations?.length || 0} location(s)`,
      details: {
        locations: data.locations?.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          status: loc.status
        }))
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

async function testQuickBooksConnection(config: any, credentials: any): Promise<TestResult> {
  try {
    const response = await fetch(`${config.base_url}/v3/company/${config.company_id}/companyinfo/${config.company_id}`, {
      headers: {
        'Authorization': `Bearer ${credentials.access_token}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      return {
        success: false,
        message: `QuickBooks API error: ${response.status} ${response.statusText}`
      }
    }

    const data = await response.json()
    const company = data.QueryResponse?.CompanyInfo?.[0]
    
    return {
      success: true,
      message: `Connected to ${company?.CompanyName || 'QuickBooks'}`,
      details: {
        company_name: company?.CompanyName,
        company_id: company?.Id,
        country: company?.Country
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

async function testAPIKeyConnection(provider: any, config: any): Promise<TestResult> {
  // Generic API key test - ping a simple endpoint
  const testEndpoints: Record<string, string> = {
    'mailchimp': `https://${config.data_center}.api.mailchimp.com/3.0/ping`,
    'doordash': 'https://openapi.doordash.com/v1/business',
    'twilio': `https://api.twilio.com/2010-04-01/Accounts/${config.account_sid}.json`
  }

  const endpoint = testEndpoints[provider.slug]
  if (!endpoint) {
    return {
      success: false,
      message: 'Test endpoint not configured for this provider'
    }
  }

  try {
    const headers: Record<string, string> = {}
    
    // Provider-specific auth headers
    switch (provider.slug) {
      case 'mailchimp':
        headers['Authorization'] = `apikey ${config.api_key}`
        break
      case 'doordash':
        headers['Authorization'] = `Bearer ${config.api_key}`
        break
      case 'twilio':
        const auth = btoa(`${config.account_sid}:${config.auth_token}`)
        headers['Authorization'] = `Basic ${auth}`
        break
    }

    const response = await fetch(endpoint, { headers })
    
    if (!response.ok) {
      return {
        success: false,
        message: `API error: ${response.status} ${response.statusText}`
      }
    }

    return {
      success: true,
      message: 'API connection successful'
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
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

    const { tenant_id, integration_id }: TestRequest = await req.json()

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

    // Get integration with provider details
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

    let testResult: TestResult

    if (integration.provider.auth_type === 'oauth2') {
      // Test OAuth connections
      switch (integration.provider.slug) {
        case 'clover':
          testResult = await testCloverConnection(integration.config, integration.credentials)
          break
        case 'square':
          testResult = await testSquareConnection(integration.config, integration.credentials)
          break
        case 'quickbooks':
          testResult = await testQuickBooksConnection(integration.config, integration.credentials)
          break
        default:
          testResult = {
            success: false,
            message: 'Test not implemented for this OAuth provider'
          }
      }
    } else if (integration.provider.auth_type === 'api_key') {
      // Test API key connections
      testResult = await testAPIKeyConnection(integration.provider, integration.config)
    } else {
      testResult = {
        success: false,
        message: 'Test not supported for this authentication type'
      }
    }

    // Update integration status based on test result
    const newStatus = testResult.success ? 'connected' : 'error'
    const errorMessage = testResult.success ? null : testResult.message

    await supabaseClient
      .from('integrations')
      .update({
        status: newStatus,
        error_message: errorMessage,
        error_count: testResult.success ? 0 : (integration.error_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', integration_id)
      .eq('tenant_id', tenant_id)

    return new Response(
      JSON.stringify(testResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Integration test error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
