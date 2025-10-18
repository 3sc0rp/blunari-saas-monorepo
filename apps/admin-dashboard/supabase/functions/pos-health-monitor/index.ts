import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integration_id, check_all } = await req.json();

    console.log(
      `Starting health check for integration: ${integration_id || "all"}`,
    );

    if (check_all) {
      // Check all active integrations
      const results = await checkAllIntegrations();
      return new Response(
        JSON.stringify({
          success: true,
          results,
          checked_at: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } else if (integration_id) {
      // Check specific integration
      const result = await checkIntegrationHealth(integration_id);
      return new Response(
        JSON.stringify({
          success: true,
          integration_id,
          health_status: result.health_status,
          response_time_ms: result.response_time_ms,
          error_message: result.error_message,
          checked_at: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } else {
      throw new Error("Either integration_id or check_all must be provided");
    }
  } catch (error) {
    console.error("Health check error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});

async function checkAllIntegrations() {
  console.log("Checking all active integrations...");

  // Get all active integrations
  const { data: integrations, error } = await supabase
    .from("pos_integrations")
    .select(
      `
      id,
      integration_name,
      provider_id,
      status,
      configuration,
      pos_providers!inner(name, slug)
    `,
    )
    .eq("status", "connected");

  if (error) {
    throw new Error(`Failed to fetch integrations: ${error.message}`);
  }

  const results = [];

  for (const integration of integrations || []) {
    try {
      const result = await checkIntegrationHealth(integration.id);
      results.push({
        integration_id: integration.id,
        integration_name: integration.integration_name,
        provider: integration.pos_providers.name,
        ...result,
      });
    } catch (error) {
      console.error(`Error checking integration ${integration.id}:`, error);
      results.push({
        integration_id: integration.id,
        integration_name: integration.integration_name,
        provider: integration.pos_providers.name,
        health_status: "unhealthy",
        error_message: error.message,
        response_time_ms: null,
      });
    }
  }

  return results;
}

async function checkIntegrationHealth(integrationId: string) {
  const startTime = Date.now();

  try {
    // Get integration details
    const { data: integration, error } = await supabase
      .from("pos_integrations")
      .select(
        `
        *,
        pos_providers!inner(name, slug, configuration_schema)
      `,
      )
      .eq("id", integrationId)
      .single();

    if (error || !integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    console.log(
      `Checking health for ${integration.pos_providers.name} integration`,
    );

    let healthResult;
    const provider = integration.pos_providers.slug;

    // Perform provider-specific health checks
    switch (provider) {
      case "toast":
        healthResult = await checkToastHealth(integration);
        break;
      case "square":
        healthResult = await checkSquareHealth(integration);
        break;
      case "clover":
        healthResult = await checkCloverHealth(integration);
        break;
      case "resy":
        healthResult = await checkResyHealth(integration);
        break;
      case "opentable":
        healthResult = await checkOpenTableHealth(integration);
        break;
      case "custom":
        healthResult = await checkCustomHealth(integration);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    const responseTime = Date.now() - startTime;
    const result = {
      health_status: healthResult.status,
      response_time_ms: responseTime,
      error_message: healthResult.error_message,
      check_data: healthResult.check_data,
    };

    // Update integration health in database
    await supabase.rpc("update_pos_integration_health", {
      p_integration_id: integrationId,
      p_status: result.health_status,
      p_error_message: result.error_message,
    });

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const result = {
      health_status: "unhealthy",
      response_time_ms: responseTime,
      error_message: error.message,
      check_data: null,
    };

    // Update integration health in database
    try {
      await supabase.rpc("update_pos_integration_health", {
        p_integration_id: integrationId,
        p_status: result.health_status,
        p_error_message: result.error_message,
      });
    } catch (updateError) {
      console.error("Failed to update health status:", updateError);
    }

    return result;
  }
}

async function checkToastHealth(integration: any) {
  // Simulate Toast API health check
  const apiKey = integration.configuration?.api_key;
  const restaurantId = integration.configuration?.restaurant_id;

  if (!apiKey || !restaurantId) {
    return {
      status: "unhealthy",
      error_message: "Missing required configuration: api_key or restaurant_id",
      check_data: null,
    };
  }

  // In real implementation, make actual API call to Toast
  // For demo, simulate response
  const simulatedResponse = Math.random() > 0.1; // 90% success rate

  if (simulatedResponse) {
    return {
      status: "healthy",
      error_message: null,
      check_data: {
        api_version: "2.0",
        restaurant_status: "open",
        last_order_sync: new Date().toISOString(),
      },
    };
  } else {
    return {
      status: "unhealthy",
      error_message: "API connection timeout",
      check_data: null,
    };
  }
}

async function checkSquareHealth(integration: any) {
  const accessToken = integration.configuration?.access_token;
  const applicationId = integration.configuration?.application_id;

  if (!accessToken || !applicationId) {
    return {
      status: "unhealthy",
      error_message:
        "Missing required configuration: access_token or application_id",
      check_data: null,
    };
  }

  // Simulate Square API health check
  const simulatedResponse = Math.random() > 0.05; // 95% success rate

  if (simulatedResponse) {
    return {
      status: "healthy",
      error_message: null,
      check_data: {
        merchant_id: "simulated-merchant-123",
        webhook_status: "active",
        payment_processing: "enabled",
      },
    };
  } else {
    return {
      status: "degraded",
      error_message: "Webhook delivery delayed",
      check_data: { webhook_lag_ms: 5000 },
    };
  }
}

async function checkCloverHealth(integration: any) {
  // Simulate Clover health check
  return {
    status: "healthy",
    error_message: null,
    check_data: {
      merchant_status: "active",
      device_count: 3,
      last_heartbeat: new Date().toISOString(),
    },
  };
}

async function checkResyHealth(integration: any) {
  // Simulate Resy health check
  return {
    status: "healthy",
    error_message: null,
    check_data: {
      venue_status: "accepting_reservations",
      api_rate_limit: "500/hour",
      webhook_health: "green",
    },
  };
}

async function checkOpenTableHealth(integration: any) {
  // Simulate OpenTable health check
  return {
    status: "healthy",
    error_message: null,
    check_data: {
      restaurant_status: "active",
      reservation_sync: "real_time",
      guest_data_sync: "enabled",
    },
  };
}

async function checkCustomHealth(integration: any) {
  const webhookUrl = integration.configuration?.webhook_url;

  if (!webhookUrl) {
    return {
      status: "unhealthy",
      error_message: "Missing webhook_url configuration",
      check_data: null,
    };
  }

  // For custom integrations, we can only check if webhook URL is reachable
  try {
    const response = await fetch(webhookUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      return {
        status: "healthy",
        error_message: null,
        check_data: {
          webhook_url: webhookUrl,
          response_status: response.status,
          last_check: new Date().toISOString(),
        },
      };
    } else {
      return {
        status: "degraded",
        error_message: `Webhook returned status ${response.status}`,
        check_data: { status_code: response.status },
      };
    }
  } catch (error) {
    return {
      status: "unhealthy",
      error_message: `Webhook unreachable: ${error.message}`,
      check_data: null,
    };
  }
}
