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
      // Get tenant features
      const { data: features, error: featuresError } = await supabaseClient
        .from("tenant_features")
        .select("*")
        .eq("tenant_id", tenantId);

      if (featuresError) {
        throw featuresError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: features || [],
          requestId: crypto.randomUUID(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "update") {
      // Update or create feature override
      const { data: existingFeature } = await supabaseClient
        .from("tenant_features")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("feature_key", featureKey)
        .single();

      if (existingFeature) {
        // Update existing feature
        const { error: updateError } = await supabaseClient
          .from("tenant_features")
          .update({
            enabled,
            source: "OVERRIDE",
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId)
          .eq("feature_key", featureKey);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create new feature override
        const { error: insertError } = await supabaseClient
          .from("tenant_features")
          .insert({
            tenant_id: tenantId,
            feature_key: featureKey,
            enabled,
            source: "OVERRIDE",
          });

        if (insertError) {
          throw insertError;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Feature ${featureKey} ${enabled ? "enabled" : "disabled"}`,
          requestId: crypto.randomUUID(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "reset-to-plan") {
      // Remove all overrides, keeping only plan features
      const { error: deleteError } = await supabaseClient
        .from("tenant_features")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("source", "OVERRIDE");

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message:
            "All feature overrides removed. Features now match the plan.",
          requestId: crypto.randomUUID(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
