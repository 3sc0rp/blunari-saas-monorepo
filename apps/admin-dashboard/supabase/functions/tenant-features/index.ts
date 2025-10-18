import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get auth header from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  const { action, tenantSlug, featureKey, enabled } = await req.json();

    // Resolve tenant ID from slug
    const { data: tenant, error: tenantError } = await supabaseClient
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found", code: "TENANT_NOT_FOUND" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tenantId = tenant.id;

    if (action === "get") {
      const { data: flags, error: flagsError } = await supabaseClient
        .from("tenant_feature_flags")
        .select("id, feature_key, enabled, enabled_at, enabled_by")
        .eq("tenant_id", tenantId)
        .order("feature_key", { ascending: true });
      if (flagsError) throw flagsError;
  const payload = (flags || []).map((f: any) => ({
        id: f.id,
        feature_key: f.feature_key,
        enabled: f.enabled,
        source: "OVERRIDE", // For backward compat with UI expectations
        enabled_at: f.enabled_at,
        enabled_by: f.enabled_by,
      }));
      return new Response(JSON.stringify({ success: true, data: payload, requestId: crypto.randomUUID() }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update") {
      if (!featureKey) {
        return new Response(JSON.stringify({ error: "featureKey required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Upsert flag row
      const { error: upsertError } = await supabaseClient
        .from("tenant_feature_flags")
        .upsert({ tenant_id: tenantId, feature_key: featureKey, enabled, enabled_by: user.id, enabled_at: new Date().toISOString() }, { onConflict: "tenant_id,feature_key" });
      if (upsertError) throw upsertError;

      // Audit log
      await supabaseClient.from("activity_logs").insert({
        activity_type: "feature_flag_update",
        message: `Feature flag ${featureKey} set ${enabled ? "ENABLED" : "DISABLED"}`,
        user_id: user.id,
        details: { tenantId, featureKey, enabled },
      });

      return new Response(JSON.stringify({ success: true, message: `Feature ${featureKey} ${enabled ? "enabled" : "disabled"}`, requestId: crypto.randomUUID() }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reset-to-plan") {
      // Rather than delete all rows, we disable overrides (set enabled false) preserving history
      const { error: disableError } = await supabaseClient
        .from("tenant_feature_flags")
        .update({ enabled: false })
        .eq("tenant_id", tenantId);
      if (disableError) throw disableError;
      await supabaseClient.from("activity_logs").insert({
        activity_type: "feature_flags_reset",
        message: "All feature flags disabled (reset to plan)",
        user_id: user.id,
        details: { tenantId },
      });
      return new Response(JSON.stringify({ success: true, message: "All feature flags disabled.", requestId: crypto.randomUUID() }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tenant features error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        code: "INTERNAL_ERROR",
        requestId: crypto.randomUUID(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
