import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsHeaders } from "../_shared/cors";

const corsHeaders = createCorsHeaders();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(req.headers.get("Origin")) });
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
      headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
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
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const { endpoint, ...params } = await req.json();

    const backgroundOpsUrl =
      Deno.env.get("BACKGROUND_OPS_URL") ?? "https://background-ops.fly.dev";
    const backgroundOpsApiKey = Deno.env.get("BACKGROUND_OPS_API_KEY") ?? "";

    // Proxy request to background-ops
    const response = await fetch(`${backgroundOpsUrl}${endpoint}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": backgroundOpsApiKey,
      },
      body: Object.keys(params).length > 0 ? JSON.stringify(params) : undefined,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Background ops proxy error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
    });
  }
});
