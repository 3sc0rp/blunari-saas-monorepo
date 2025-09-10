// Get tenant information by slug or ID
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const createCorsHeaders = (requestOrigin: string | null = null) => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';
  
  let allowedOrigin = '*';
  if (environment === 'production' && requestOrigin) {
    const allowedOrigins = [
      'https://app.blunari.ai',
      'https://demo.blunari.ai',
      'https://admin.blunari.ai', 
      'https://services.blunari.ai',
      'https://blunari.ai',
      'https://www.blunari.ai'
    ];
    allowedOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : 'https://app.blunari.ai';
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
};

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = createCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ 
      error: "Method not allowed" 
    }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const id = url.searchParams.get('id');
    
    if (!slug && !id) {
      return new Response(JSON.stringify({
        error: "Either slug or id parameter is required"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Query tenant by slug or id
    let query = supabase
      .from('tenants')
      .select('*');
    
    if (slug) {
      query = query.eq('slug', slug);
    } else if (id) {
      query = query.eq('id', id);
    }
    
    const { data: tenant, error } = await query.single();

    if (error || !tenant) {
      return new Response(JSON.stringify({
        error: "Tenant not found"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      tenant
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Tenant lookup error:", error);
    
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
