import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// Health check functions for different POS providers
const performHealthCheck = async (
  integration: any,
): Promise<{
  status: string;
  responseTime: number;
  error?: string;
}> => {
  const startTime = Date.now();

  try {
    let result;

    switch (integration.provider) {
      case "toast":
        result = await checkToastHealth(integration);
        break;
      case "square":
        result = await checkSquareHealth(integration);
        break;
      case "clover":
        result = await checkCloverHealth(integration);
        break;
      case "resy":
        result = await checkResyHealth(integration);
        break;
      case "opentable":
        result = await checkOpenTableHealth(integration);
        break;
      case "custom_webhook":
        result = await checkCustomWebhookHealth(integration);
        break;
      default:
        throw new Error(`Unknown provider: ${integration.provider}`);
    }

    const responseTime = Date.now() - startTime;
    return { ...result, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: "unhealthy",
      responseTime,
      error: error.message,
    };
  }
};

const checkToastHealth = async (integration: any) => {
  const { api_key, restaurant_id } = integration.credentials;

  if (!api_key || !restaurant_id) {
    throw new Error("Missing Toast API credentials");
  }

  const response = await fetch(
    `https://ws-api.toasttab.com/restaurants/${restaurant_id}`,
    {
      headers: {
        Authorization: `Bearer ${api_key}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Toast API error: ${response.status} ${response.statusText}`,
    );
  }

  return { status: "healthy" };
};

const checkSquareHealth = async (integration: any) => {
  const { access_token, application_id } = integration.credentials;

  if (!access_token) {
    throw new Error("Missing Square access token");
  }

  const response = await fetch("https://connect.squareup.com/v2/locations", {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      "Square-Version": "2023-10-18",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Square API error: ${response.status} ${response.statusText}`,
    );
  }

  return { status: "healthy" };
};

const checkCloverHealth = async (integration: any) => {
  const { access_token, merchant_id } = integration.credentials;

  if (!access_token || !merchant_id) {
    throw new Error("Missing Clover API credentials");
  }

  const response = await fetch(
    `https://api.clover.com/v3/merchants/${merchant_id}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Clover API error: ${response.status} ${response.statusText}`,
    );
  }

  return { status: "healthy" };
};

const checkResyHealth = async (integration: any) => {
  const { api_key, venue_id } = integration.credentials;

  if (!api_key || !venue_id) {
    throw new Error("Missing Resy API credentials");
  }

  const response = await fetch(`https://api.resy.com/4/venue/${venue_id}`, {
    headers: {
      Authorization: `ResyAPI api_key="${api_key}"`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Resy API error: ${response.status} ${response.statusText}`,
    );
  }

  return { status: "healthy" };
};

const checkOpenTableHealth = async (integration: any) => {
  const { client_id, client_secret, restaurant_id } = integration.credentials;

  if (!client_id || !client_secret || !restaurant_id) {
    throw new Error("Missing OpenTable API credentials");
  }

  // OpenTable uses OAuth, so this is a simplified health check
  const response = await fetch(
    "https://platform.otrest.com/sync/listRestaurants",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: client_id,
        signature: client_secret, // Simplified for demo
        restaurantIds: [restaurant_id],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `OpenTable API error: ${response.status} ${response.statusText}`,
    );
  }

  return { status: "healthy" };
};

const checkCustomWebhookHealth = async (integration: any) => {
  const { webhook_url } = integration.credentials;

  if (!webhook_url) {
    throw new Error("Missing webhook URL");
  }

  const response = await fetch(webhook_url, {
    method: "HEAD",
    signal: AbortSignal.timeout(5000), // 5 second timeout
  });

  if (!response.ok) {
    throw new Error(
      `Webhook endpoint error: ${response.status} ${response.statusText}`,
    );
  }

  return { status: "healthy" };
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const integrationId = url.searchParams.get("integration_id");

    if (!integrationId) {
      return new Response(
        JSON.stringify({ error: "Integration ID required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from("pos_integrations")
      .select("*")
      .eq("id", integrationId)
      .single();

    if (integrationError || !integration) {
      console.error("Integration not found:", integrationError);
      return new Response(JSON.stringify({ error: "Integration not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `Performing health check for ${integration.provider} integration: ${integrationId}`,
    );

    // Perform health check
    const healthResult = await performHealthCheck(integration);

    // Update integration health status
    await supabase.rpc("update_pos_integration_health", {
      p_integration_id: integrationId,
      p_status: healthResult.status,
      p_error_message: healthResult.error || null,
    });

    // Insert detailed health check record
    const { error: healthCheckError } = await supabase
      .from("pos_health_checks")
      .insert({
        integration_id: integrationId,
        tenant_id: integration.tenant_id,
        check_type: "api",
        status: healthResult.status === "healthy" ? "success" : "error",
        response_time_ms: healthResult.responseTime,
        error_message: healthResult.error,
        endpoint_tested: integration.api_endpoint || "default",
        metadata: {
          provider: integration.provider,
          check_timestamp: new Date().toISOString(),
          ...healthResult,
        },
      });

    if (healthCheckError) {
      console.error("Error inserting health check record:", healthCheckError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        integration_id: integrationId,
        provider: integration.provider,
        status: healthResult.status,
        response_time_ms: healthResult.responseTime,
        error: healthResult.error,
        checked_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Health check error:", error);

    return new Response(
      JSON.stringify({
        error: "Health check failed",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
