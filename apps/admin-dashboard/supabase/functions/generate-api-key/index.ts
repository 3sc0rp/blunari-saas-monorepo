import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsHeaders } from "../_shared/cors";

interface APIKeyRequest {
  name: string;
  description?: string;
  permissions: string[];
  expiresAt?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: createCorsHeaders(req.headers.get("Origin")) });
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
    const body: APIKeyRequest = await req.json();

    // Validate input
    if (!body.name || !body.permissions || body.permissions.length === 0) {
      throw new Error("Name and permissions are required");
    }

    // Generate cryptographically secure API key
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const apiKey =
      "blnr_" +
      Array.from(keyBytes, (byte) => byte.toString(16).padStart(2, "0")).join(
        "",
      );

    // Hash the API key for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey + "blunari_salt");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);
    const keyHash = Array.from(hashArray, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    // Create preview (first 8 and last 4 characters)
    const keyPreview = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;

    // Insert API key into database
    const { data: apiKeyData, error: insertError } = await supabaseClient
      .from("api_keys")
      .insert({
        user_id: user.id,
        key_name: body.name,
        description: body.description || "",
        key_hash: keyHash,
        key_preview: keyPreview,
        permissions: body.permissions,
        expires_at: body.expiresAt || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error("Failed to store API key");
    }

    // Log the API key creation
    await supabaseClient.rpc("log_security_event", {
      p_event_type: "api_key_generated",
      p_severity: "medium",
      p_user_id: user.id,
      p_event_data: {
        api_key_name: body.name,
        permissions: body.permissions,
        expires_at: body.expiresAt,
      },
    });

    // Return the response with the actual API key (only time it's revealed)
    return new Response(
      JSON.stringify({
        success: true,
        apiKey: {
          id: apiKeyData.id,
          key: apiKey, // Only returned once
          keyPreview: keyPreview,
          name: body.name,
          description: body.description,
          permissions: body.permissions,
          expiresAt: body.expiresAt,
          createdAt: apiKeyData.created_at,
        },
      }),
      {
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("API Key generation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as any).message,
      }),
      {
        status: 400,
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      },
    );
  }
});
