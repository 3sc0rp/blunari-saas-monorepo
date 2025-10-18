// @ts-ignore - Deno remote import (valid at runtime)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Deno remote import (valid at runtime)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createCorsHeaders } from "../_shared/cors";

interface GetUserRequest {
  email: string;
}

serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user making the request
    const {
      data: { user: requestingUser },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin privileges
    const { data: employee } = await supabaseClient
      .from("employees")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", requestingUser.id)
      .single();

    const isAdmin =
      employee?.role === "admin" ||
      employee?.role === "super_admin" ||
      profile?.role === "admin" ||
      profile?.role === "super_admin";

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the request body
    const { email }: GetUserRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[GET-USER-BY-EMAIL] Looking up user: ${email}`);

    // Get user by email using admin API
    const { data: userData, error: userError } =
      await supabaseClient.auth.admin.getUserByEmail(email);

    if (userError) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userData?.user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[GET-USER-BY-EMAIL] Found user: ${userData.user.id}`);

    return new Response(
      JSON.stringify({ 
        user: userData.user,
        success: true 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[GET-USER-BY-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
