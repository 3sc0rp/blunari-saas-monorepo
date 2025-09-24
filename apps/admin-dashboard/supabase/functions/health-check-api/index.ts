import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const createCorsHeaders = (origin: string | null = null) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Max-Age": "86400",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
  return new Response(null, { headers: createCorsHeaders(req.headers.get("Origin")) });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      // Use anon key; we don't need service role to verify a JWT token
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    // Optional authentication (allow anonymous checks)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
      } catch (e) {
        // Ignore auth errors – health endpoint is public
      }
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

    const response = await fetch(`${backgroundOpsUrl.replace(/\/$/, '')}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": backgroundOpsApiKey,
      },
    });

    console.log(`Health check response status: ${response.status}`);

    // Continue even if Background Ops is temporarily unhealthy; report status instead of throwing
    let data: any = {};
    try { data = await response.json(); } catch { data = { raw: await response.text() }; }

    console.log(`Health check data: ${JSON.stringify(data)}`);

    // Store health check result in database
    try {
      await supabaseClient.from("system_health_metrics").insert({
        metric_name: "background_ops_health",
        metric_value: response.ok ? 1 : 0,
        metric_unit: "status",
        service_name: "background-ops",
        status_code: response.status,
        metadata: data,
      });
    } catch (metricsError) {
      console.warn("system_health_metrics insert skipped:", metricsError);
    }

    return new Response(
      JSON.stringify({ success: true, status: response.ok ? "healthy" : "unhealthy", ...data }),
      {
        status: response.ok ? 200 : 200,
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
