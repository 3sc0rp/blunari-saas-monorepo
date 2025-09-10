// Minimal test version of tenant-password-setup-email function
// @ts-ignore Deno runtime remote import
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
// @ts-ignore Deno runtime remote import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  console.log("Test function started");
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    console.log("Parsing request body...");
    const body = await req.json().catch(() => ({}));
    console.log("Body parsed:", body);
    
    console.log("Checking environment variables...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      supabaseUrlStart: supabaseUrl ? supabaseUrl.substring(0, 20) + "..." : "null"
    });
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ 
        error: "Missing environment variables",
        details: {
          hasSupabaseUrl: !!supabaseUrl,
          hasServiceRoleKey: !!serviceRoleKey
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log("Creating Supabase client...");
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    console.log("Supabase client created successfully");
    
    console.log("Checking authorization header...");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log("Testing Supabase connection...");
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    
    if (authErr) {
      console.error("Auth error:", authErr);
      return new Response(JSON.stringify({ 
        error: "Authentication failed",
        details: authErr
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log("User authenticated:", { userId: user?.id });
    
    return new Response(JSON.stringify({
      success: true,
      message: "Test function executed successfully",
      user: { id: user?.id, email: user?.email },
      env: {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Test function error:", error);
    return new Response(JSON.stringify({ 
      error: "Function execution failed",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
