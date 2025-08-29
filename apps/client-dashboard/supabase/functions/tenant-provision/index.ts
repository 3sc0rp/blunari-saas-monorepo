import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TenantProvisioningRequest {
  user_id: string
  restaurant_name: string
  restaurant_slug: string
  timezone?: string
  currency?: string
  description?: string
  phone?: string
  email?: string
  website?: string
  address?: any
  cuisine_type_id?: string
  primary_color?: string
  secondary_color?: string
  logo_url?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'POST') {
      const {
        user_id,
        restaurant_name,
        restaurant_slug,
        timezone = 'America/New_York',
        currency = 'USD',
        description,
        phone,
        email,
        website,
        address,
        cuisine_type_id,
        primary_color,
        secondary_color,
        logo_url
      }: TenantProvisioningRequest = await req.json()

      // Validate required fields
      if (!user_id || !restaurant_name || !restaurant_slug) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields: user_id, restaurant_name, restaurant_slug' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if slug is already taken
      const { data: existingTenant } = await supabaseClient
        .from('tenants')
        .select('id')
        .eq('slug', restaurant_slug)
        .single()

      if (existingTenant) {
        return new Response(
          JSON.stringify({ 
            error: 'Restaurant slug already exists' 
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create tenant using the database function
      const { data: tenantId, error: tenantError } = await supabaseClient
        .rpc('provision_tenant', {
          p_user_id: user_id,
          p_restaurant_name: restaurant_name,
          p_restaurant_slug: restaurant_slug,
          p_timezone: timezone,
          p_currency: currency,
          p_description: description,
          p_phone: phone,
          p_email: email,
          p_website: website,
          p_address: address,
          p_cuisine_type_id: cuisine_type_id
        })

      if (tenantError) {
        console.error('Error creating tenant:', tenantError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create tenant',
            details: tenantError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update tenant with branding if provided
      if (primary_color || secondary_color || logo_url) {
        const { error: brandingError } = await supabaseClient
          .from('tenants')
          .update({
            primary_color,
            secondary_color,
            logo_url
          })
          .eq('id', tenantId)

        if (brandingError) {
          console.error('Error updating tenant branding:', brandingError)
        }
      }

      // Create default subdomain
      const { error: domainError } = await supabaseClient
        .rpc('add_domain', {
          p_tenant_id: tenantId,
          p_domain: `${restaurant_slug}.blunari.ai`,
          p_domain_type: 'subdomain'
        })

      if (domainError) {
        console.error('Error creating domain:', domainError)
      }

      // Get the complete tenant data
      const { data: completeTenant, error: fetchError } = await supabaseClient
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (fetchError) {
        console.error('Error fetching created tenant:', fetchError)
        return new Response(
          JSON.stringify({ 
            error: 'Tenant created but failed to fetch details',
            tenant_id: tenantId 
          }),
          { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Log successful provisioning
      console.log(`Successfully provisioned tenant: ${restaurant_name} (${restaurant_slug})`)

      return new Response(
        JSON.stringify({
          success: true,
          tenant: completeTenant,
          dashboard_url: `https://${restaurant_slug}.blunari.ai`,
          message: 'Tenant dashboard provisioned successfully'
        }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})