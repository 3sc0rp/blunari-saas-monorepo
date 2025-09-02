import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    // Parse request body
    const { keyId } = await req.json();

    if (!keyId) {
      throw new Error("API key ID is required");
    }

    // Verify the API key belongs to the user
    const { data: apiKey, error: fetchError } = await supabaseClient
      .from("api_keys")
      .select("id, user_id, key_name")
      .eq("id", keyId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !apiKey) {
      throw new Error("API key not found or access denied");
    }

    // Revoke the API key (set to inactive)
    const { error: revokeError } = await supabaseClient
      .from("api_keys")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", keyId)
      .eq("user_id", user.id);

    if (revokeError) {
      console.error("API key revocation error:", revokeError);
      throw new Error("Failed to revoke API key");
    }

    // Log the API key revocation
    await supabaseClient.rpc("log_security_event", {
      p_event_type: "api_key_revoked",
      p_severity: "medium",
      p_user_id: user.id,
      p_event_data: {
        api_key_id: keyId,
        api_key_name: apiKey.key_name,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "API key revoked successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("API Key revocation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
