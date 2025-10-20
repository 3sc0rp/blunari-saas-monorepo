// Week 17-18: Smart Notifications - manage-notification-preferences Edge Function
// User notification preferences management
// Author: AI Agent
// Date: October 20, 2025

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface UpdatePreferencesRequest {
  tenant_id: string;
  user_id: string;
  is_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  timezone?: string;
  channel_preferences?: Record<string, any>;
  category_preferences?: Record<string, any>;
  enable_digest?: boolean;
  digest_frequency?: string;
  digest_time?: string;
  digest_day_of_week?: number | null;
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname;

    // Route: GET /manage-notification-preferences - Get preferences
    if (req.method === 'GET') {
      const userId = url.searchParams.get('user_id');
      const tenantId = url.searchParams.get('tenant_id');

      if (!userId || !tenantId) {
        throw new Error('user_id and tenant_id are required');
      }

      const { data: preferences, error } = await supabase.rpc(
        'get_user_notification_preferences',
        {
          p_user_id: userId,
          p_tenant_id: tenantId,
        }
      );

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          preferences,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /manage-notification-preferences - Update preferences
    if (req.method === 'POST') {
      const requestData: UpdatePreferencesRequest = await req.json();
      console.log('Update preferences request:', requestData);

      if (!requestData.tenant_id || !requestData.user_id) {
        throw new Error('tenant_id and user_id are required');
      }

      // Build update object (only include provided fields)
      const updates: Record<string, any> = {};
      if (requestData.is_enabled !== undefined) updates.is_enabled = requestData.is_enabled;
      if (requestData.quiet_hours_start !== undefined) updates.quiet_hours_start = requestData.quiet_hours_start;
      if (requestData.quiet_hours_end !== undefined) updates.quiet_hours_end = requestData.quiet_hours_end;
      if (requestData.timezone) updates.timezone = requestData.timezone;
      if (requestData.channel_preferences) updates.channel_preferences = requestData.channel_preferences;
      if (requestData.category_preferences) updates.category_preferences = requestData.category_preferences;
      if (requestData.enable_digest !== undefined) updates.enable_digest = requestData.enable_digest;
      if (requestData.digest_frequency) updates.digest_frequency = requestData.digest_frequency;
      if (requestData.digest_time) updates.digest_time = requestData.digest_time;
      if (requestData.digest_day_of_week !== undefined) updates.digest_day_of_week = requestData.digest_day_of_week;

      updates.updated_at = new Date().toISOString();

      // Update or create preferences
      const { data: existingPrefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('tenant_id', requestData.tenant_id)
        .eq('user_id', requestData.user_id)
        .maybeSingle();

      let preferences;
      if (existingPrefs) {
        // Update existing
        const { data, error } = await supabase
          .from('notification_preferences')
          .update(updates)
          .eq('tenant_id', requestData.tenant_id)
          .eq('user_id', requestData.user_id)
          .select()
          .single();

        if (error) {
          throw error;
        }
        preferences = data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('notification_preferences')
          .insert({
            tenant_id: requestData.tenant_id,
            user_id: requestData.user_id,
            ...updates,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }
        preferences = data;
      }

      // If digest enabled, create or update notification group
      if (requestData.enable_digest) {
        await createOrUpdateDigestGroup(supabase, requestData, preferences);
      } else if (requestData.enable_digest === false) {
        // Disable existing groups
        await supabase
          .from('notification_groups')
          .update({ is_active: false })
          .eq('tenant_id', requestData.tenant_id)
          .eq('user_id', requestData.user_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          preferences,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /manage-notification-preferences/test - Test preferences
    if (path.includes('/test')) {
      const requestData = await req.json();
      const { user_id, tenant_id, channel, category, priority } = requestData;

      if (!user_id || !tenant_id || !channel || !category) {
        throw new Error('user_id, tenant_id, channel, and category are required');
      }

      const { data: isEnabled, error } = await supabase.rpc(
        'is_channel_enabled_for_user',
        {
          p_user_id: user_id,
          p_tenant_id: tenant_id,
          p_channel: channel,
          p_category: category,
          p_priority: priority || 'normal',
        }
      );

      if (error) {
        throw error;
      }

      const { data: inQuietHours } = await supabase.rpc('is_in_quiet_hours', {
        p_user_id: user_id,
        p_tenant_id: tenant_id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          is_enabled: isEnabled,
          in_quiet_hours: inQuietHours,
          will_send: isEnabled && (!inQuietHours || priority === 'urgent'),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /manage-notification-preferences/reset - Reset to defaults
    if (path.includes('/reset')) {
      const requestData = await req.json();
      const { user_id, tenant_id } = requestData;

      if (!user_id || !tenant_id) {
        throw new Error('user_id and tenant_id are required');
      }

      // Delete existing preferences (will trigger recreation with defaults)
      await supabase
        .from('notification_preferences')
        .delete()
        .eq('tenant_id', tenant_id)
        .eq('user_id', user_id);

      // Get new default preferences
      const { data: preferences, error } = await supabase.rpc(
        'get_user_notification_preferences',
        {
          p_user_id: user_id,
          p_tenant_id: tenant_id,
        }
      );

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          preferences,
          message: 'Preferences reset to defaults',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /manage-notification-preferences/channels - Get available channels
    if (path.includes('/channels')) {
      const tenantId = url.searchParams.get('tenant_id');

      if (!tenantId) {
        throw new Error('tenant_id is required');
      }

      const { data: channels, error } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_enabled', true);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          channels,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown route
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unknown route',
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in manage-notification-preferences:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper: Create or update digest group
async function createOrUpdateDigestGroup(
  supabase: any,
  requestData: UpdatePreferencesRequest,
  preferences: any
) {
  try {
    const digestFrequency = requestData.digest_frequency || preferences.digest_frequency || 'daily';
    const digestTime = requestData.digest_time || preferences.digest_time || '09:00:00';
    const digestDayOfWeek = requestData.digest_day_of_week !== undefined 
      ? requestData.digest_day_of_week 
      : preferences.digest_day_of_week;

    // Calculate next digest time
    const nextDigestAt = calculateNextDigestTime(
      digestFrequency,
      digestTime,
      digestDayOfWeek,
      preferences.timezone
    );

    // Check if group exists
    const { data: existingGroup } = await supabase
      .from('notification_groups')
      .select('*')
      .eq('tenant_id', requestData.tenant_id)
      .eq('user_id', requestData.user_id)
      .maybeSingle();

    if (existingGroup) {
      // Update existing group
      await supabase
        .from('notification_groups')
        .update({
          digest_frequency: digestFrequency,
          next_digest_at: nextDigestAt.toISOString(),
          is_active: true,
        })
        .eq('id', existingGroup.id);
    } else {
      // Create new group
      await supabase.from('notification_groups').insert({
        tenant_id: requestData.tenant_id,
        user_id: requestData.user_id,
        name: 'Default Digest',
        digest_frequency: digestFrequency,
        next_digest_at: nextDigestAt.toISOString(),
        is_active: true,
      });
    }
  } catch (error) {
    console.error('Error creating/updating digest group:', error);
    throw error;
  }
}

// Helper: Calculate next digest time
function calculateNextDigestTime(
  frequency: string,
  time: string,
  dayOfWeek: number | null,
  timezone: string
): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);

  let nextDigest = new Date(now);
  nextDigest.setHours(hours, minutes, 0, 0);

  if (frequency === 'daily') {
    // If time has passed today, schedule for tomorrow
    if (nextDigest <= now) {
      nextDigest.setDate(nextDigest.getDate() + 1);
    }
  } else if (frequency === 'weekly' && dayOfWeek !== null) {
    // Calculate next occurrence of the specified day
    const currentDay = now.getDay();
    let daysUntilNext = dayOfWeek - currentDay;
    
    if (daysUntilNext < 0 || (daysUntilNext === 0 && nextDigest <= now)) {
      daysUntilNext += 7;
    }
    
    nextDigest.setDate(nextDigest.getDate() + daysUntilNext);
  }

  return nextDigest;
}
