import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProvisionRequest {
  // Basic Information
  restaurantName: string
  slug: string
  description?: string
  phone?: string
  email?: string
  website?: string
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  cuisineTypeId?: string

  // Owner Account
  ownerFirstName: string
  ownerLastName: string
  ownerEmail: string
  ownerPassword: string

  // Business Configuration
  timezone: string
  businessHours: Array<{
    dayOfWeek: number
    isOpen: boolean
    openTime?: string
    closeTime?: string
  }>
  partySizeConfig: {
    minPartySize: number
    maxPartySize: number
    defaultPartySize: number
    allowLargeParties: boolean
    largePartyThreshold: number
  }

  // Billing Setup
  selectedPlanId: string
  billingCycle: 'monthly' | 'yearly'
  
  // Feature Configuration
  enabledFeatures: {
    deposits: boolean
    posIntegration: boolean
    etaNotifications: boolean
    customBranding: boolean
    advancedAnalytics: boolean
    multiLocation: boolean
  }
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : ''
  console.log(`[PROVISION-TENANT] ${step}${detailsStr}`)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep("Function started")

    // Parse request body
    const requestData: ProvisionRequest = await req.json()
    logStep("Request data received", { restaurantName: requestData.restaurantName })

    // Create Supabase clients
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    )

    logStep("Supabase admin client created")

    // Create the owner user account
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.ownerEmail,
      password: requestData.ownerPassword,
      email_confirm: true,
      user_metadata: {
        first_name: requestData.ownerFirstName,
        last_name: requestData.ownerLastName,
        role: 'owner'
      }
    })

    if (userError) {
      logStep("Error creating user", userError)
      throw new Error(`Failed to create owner account: ${userError.message}`)
    }

    logStep("Owner user created", { userId: userData.user.id })

    // Call the enhanced provision_tenant function
    const { data: tenantId, error: tenantError } = await supabaseAdmin.rpc('provision_tenant', {
      p_user_id: userData.user.id,
      p_restaurant_name: requestData.restaurantName,
      p_restaurant_slug: requestData.slug,
      p_timezone: requestData.timezone,
      p_currency: 'USD',
      p_description: requestData.description || null,
      p_phone: requestData.phone || null,
      p_email: requestData.email || null,
      p_website: requestData.website || null,
      p_address: requestData.address ? requestData.address : null,
      p_cuisine_type_id: requestData.cuisineTypeId || null
    })

    if (tenantError) {
      logStep("Error creating tenant", tenantError)
      throw new Error(`Failed to create tenant: ${tenantError.message}`)
    }

    logStep("Tenant created", { tenantId })

    // Update business hours if different from defaults
    const businessHoursToUpdate = requestData.businessHours.filter(h => 
      h.isOpen !== (h.dayOfWeek === 0 ? false : true) || // Sunday default is closed, others open
      h.openTime !== '09:00' || 
      h.closeTime !== (h.dayOfWeek >= 5 ? '23:00' : '22:00') // Fri/Sat until 23:00, others 22:00
    )

    if (businessHoursToUpdate.length > 0) {
      for (const hours of businessHoursToUpdate) {
        const { error: hoursError } = await supabaseAdmin
          .from('business_hours')
          .update({
            is_open: hours.isOpen,
            open_time: hours.openTime,
            close_time: hours.closeTime
          })
          .eq('tenant_id', tenantId)
          .eq('day_of_week', hours.dayOfWeek)

        if (hoursError) {
          logStep("Error updating business hours", hoursError)
        }
      }
      logStep("Business hours updated", { updatedCount: businessHoursToUpdate.length })
    }

    // Update party size config if different from defaults
    if (requestData.partySizeConfig.minPartySize !== 1 ||
        requestData.partySizeConfig.maxPartySize !== 12 ||
        requestData.partySizeConfig.defaultPartySize !== 2 ||
        !requestData.partySizeConfig.allowLargeParties ||
        requestData.partySizeConfig.largePartyThreshold !== 8) {
      
      const { error: partySizeError } = await supabaseAdmin
        .from('party_size_configs')
        .update(requestData.partySizeConfig)
        .eq('tenant_id', tenantId)

      if (partySizeError) {
        logStep("Error updating party size config", partySizeError)
      } else {
        logStep("Party size config updated")
      }
    }

    // Create subscription record (placeholder for now)
    if (requestData.selectedPlanId) {
      const { error: subscriptionError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          tenant_id: tenantId,
          plan_id: requestData.selectedPlanId,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (requestData.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
        })

      if (subscriptionError) {
        logStep("Error creating subscription", subscriptionError)
      } else {
        logStep("Subscription created")
      }
    }

    // Enable additional features based on selection
    const featuresToEnable = Object.entries(requestData.enabledFeatures)
      .filter(([_, enabled]) => enabled)
      .map(([feature, _]) => ({
        tenant_id: tenantId,
        feature_key: feature,
        enabled: true,
        source: 'provisioning'
      }))

    if (featuresToEnable.length > 0) {
      const { error: featuresError } = await supabaseAdmin
        .from('tenant_features')
        .insert(featuresToEnable)

      if (featuresError) {
        logStep("Error enabling features", featuresError)
      } else {
        logStep("Features enabled", { count: featuresToEnable.length })
      }
    }

    logStep("Provisioning completed successfully", { tenantId })

    // Send welcome email to the owner
    try {
      logStep('Sending welcome email to owner')
      const emailResult = await supabaseAdmin.functions.invoke('send-welcome-email', {
        body: {
          ownerName: `${requestData.ownerFirstName} ${requestData.ownerLastName}`,
          ownerEmail: requestData.ownerEmail,
          restaurantName: requestData.restaurantName,
          loginUrl: `${Deno.env.get('SUPABASE_URL')?.replace('/supabase.co', '.lovable.app')}/auth`
        }
      })

      if (emailResult.error) {
        console.warn('Failed to send welcome email:', emailResult.error)
      } else {
        logStep('Welcome email sent successfully')
      }
    } catch (emailError) {
      console.warn('Welcome email error (non-blocking):', emailError)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      tenantId,
      ownerId: userData.user.id,
      message: `${requestData.restaurantName} has been successfully provisioned! Welcome email sent to ${requestData.ownerEmail}.`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logStep("ERROR in provision-tenant", { message: errorMessage })
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})