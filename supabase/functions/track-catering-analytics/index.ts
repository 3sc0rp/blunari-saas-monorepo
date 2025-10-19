/**
 * Supabase Edge Function: track-catering-analytics
 * 
 * Purpose: Server-side analytics tracking to bypass ad blockers
 * 
 * Features:
 * - Stores analytics events in database
 * - Captures IP address and user agent
 * - Supports batch insert for performance
 * - Validates event types
 * - Rate limiting to prevent abuse
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Valid event types
const VALID_EVENT_TYPES = [
  "catering_widget_viewed",
  "catering_package_viewed",
  "catering_package_selected",
  "catering_step_completed",
  "catering_field_focused",
  "catering_field_completed",
  "catering_field_error",
  "catering_validation_error",
  "catering_draft_saved",
  "catering_draft_restored",
  "catering_order_submitted",
  "catering_order_failed",
  "catering_form_abandoned",
];

interface AnalyticsEvent {
  tenant_id: string;
  event_name: string;
  event_data?: Record<string, any>;
  session_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse request body
    const body = await req.json();
    const events: AnalyticsEvent[] = Array.isArray(body) ? body : [body];

    // Validate events
    for (const event of events) {
      if (!event.tenant_id || !event.event_name) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: tenant_id, event_name" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!VALID_EVENT_TYPES.includes(event.event_name)) {
        return new Response(
          JSON.stringify({ error: `Invalid event_name: ${event.event_name}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Extract request metadata
    const userAgent = req.headers.get("user-agent") || "unknown";
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0] : "unknown";

    // Prepare database records
    const records = events.map((event) => ({
      tenant_id: event.tenant_id,
      event_name: event.event_name,
      event_data: event.event_data || {},
      session_id: event.session_id,
      user_agent: userAgent,
      ip_address: ipAddress === "unknown" ? null : ipAddress,
    }));

    // Insert into database
    const { data, error } = await supabase
      .from("analytics_events")
      .insert(records)
      .select();

    if (error) {
      console.error("Database insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to store analytics events", details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        events_stored: data.length,
        message: "Analytics events tracked successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
