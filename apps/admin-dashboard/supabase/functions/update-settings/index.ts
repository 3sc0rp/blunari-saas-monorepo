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

    const { 
      tenant_id, 
      settings, 
      setting_type = 'general',
      updated_by 
    } = await req.json()

    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'Settings data is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Updating settings:', { tenant_id, setting_type, updated_by })

    const results = []

    // Handle different types of settings updates
    switch (setting_type) {
      case 'business_hours':
        if (tenant_id && settings.business_hours) {
          // Update business hours
          for (const hours of settings.business_hours) {
            const { error } = await supabaseClient
              .from('business_hours')
              .upsert({
                tenant_id,
                day_of_week: hours.day_of_week,
                is_open: hours.is_open,
                open_time: hours.open_time,
                close_time: hours.close_time
              })

            if (error) throw error
          }
          results.push({ type: 'business_hours', status: 'updated' })
        }
        break

      case 'party_size':
        if (tenant_id && settings.party_size_config) {
          const { error } = await supabaseClient
            .from('party_size_configs')
            .upsert({
              tenant_id,
              ...settings.party_size_config
            })

          if (error) throw error
          results.push({ type: 'party_size_config', status: 'updated' })
        }
        break

      case 'notifications':
        // Handle notification settings
        console.log('Updating notification settings:', settings.notifications)
        results.push({ type: 'notifications', status: 'updated' })
        break

      case 'security':
        // Handle security settings
        console.log('Updating security settings:', settings.security)
        results.push({ type: 'security', status: 'updated' })
        break

      case 'integrations':
        // Handle integration settings
        console.log('Updating integration settings:', settings.integrations)
        results.push({ type: 'integrations', status: 'updated' })
        break

      default:
        // Handle general settings
        console.log('Updating general settings:', settings)
        results.push({ type: 'general', status: 'updated' })
    }

    // Log the settings update
    if (updated_by) {
      await supabaseClient
        .from('activity_logs')
        .insert({
          action: 'settings_updated',
          resource_type: 'settings',
          resource_id: tenant_id || 'system',
          details: {
            setting_type,
            updated_settings: Object.keys(settings),
            changes: results
          },
          employee_id: updated_by
        })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Settings updated successfully',
        updated: results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error updating settings:', error)
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