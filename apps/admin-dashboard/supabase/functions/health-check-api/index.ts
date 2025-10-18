import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsHeaders } from "../_shared/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
  return new Response(null, { headers: createCorsHeaders(req.headers.get("Origin")) });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      console.error("Health check auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
  headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      });
    }

    // Parse request body (if any) - health check doesn't require body parameters
    let requestData = {};
    try {
      if (req.body) {
        requestData = await req.json();
      }
    } catch (e) {
      // No body or invalid JSON, use empty object
      console.log("Health check called without body (this is normal)");
    }

    const backgroundOpsUrl = Deno.env.get("BACKGROUND_OPS_URL");
    const backgroundOpsApiKey = Deno.env.get("BACKGROUND_OPS_API_KEY") ?? "";

    console.log("Health check request to background-ops");
    console.log(`Background Ops URL: ${backgroundOpsUrl}`);
    console.log(`API Key present: ${backgroundOpsApiKey ? "Yes" : "No"}`);
    console.log("Using updated environment variables");

    // If no background ops URL is configured, return error instead of mock data
  if (!backgroundOpsUrl) {
      console.log("BACKGROUND_OPS_URL not configured - returning error");

      return new Response(
        JSON.stringify({
          success: false,
          status: "configuration_error",
          error: "Background operations service not configured",
          services: {},
          uptime: 0,
        }),
        {
          status: 503,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    const response = await fetch(`${backgroundOpsUrl}/api/v1/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": backgroundOpsApiKey,
      },
    });

    console.log(`Health check response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Background service health error: ${response.status} - ${errorText}`,
      );
      throw new Error(`Health check failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Health check data: ${JSON.stringify(data)}`);

    // Store health check result in database
    await supabaseClient.from("system_health_metrics").insert({
      metric_name: "background_ops_health",
      metric_value: response.status === 200 ? 1 : 0,
      metric_unit: "status",
      service_name: "background-ops",
      status_code: response.status,
      metadata: data,
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: response.status === 200 ? "healthy" : "unhealthy",
        ...data,
      }),
      {
        status: 200,
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Health check API error:", error);

    // Store failed health check
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );

      await supabaseClient.from("system_health_metrics").insert({
        metric_name: "background_ops_health",
        metric_value: 0,
        metric_unit: "status",
        service_name: "background-ops",
        status_code: 0,
  metadata: { error: error instanceof Error ? error.message : "Unknown error" },
      });
    } catch (dbError) {
      console.error("Failed to store error metrics:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      },
    );
  }
});
