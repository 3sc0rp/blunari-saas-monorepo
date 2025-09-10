// Validate and consume password setup link token for single-use security
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

interface ValidationRequest {
  linkToken: string;
  action?: 'validate' | 'consume'; // validate = check only, consume = mark as used
}

interface ValidationResponse {
  valid: boolean;
  expired?: boolean;
  used?: boolean;
  tenant?: {
    id: string;
    slug: string;
    name: string;
    email: string;
  };
  expiresAt?: string;
  message?: string;
}

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = createCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ 
      valid: false, 
      message: "Method not allowed" 
    }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const requestId = crypto.randomUUID();
  
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const body: ValidationRequest = await req.json().catch(() => ({}));
    
    console.log("Password setup link validation request:", {
      hasToken: !!body.linkToken,
      action: body.action || 'validate',
      requestId
    });
    
    if (!body.linkToken) {
      return new Response(JSON.stringify({
        valid: false,
        message: "Link token is required"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const action = body.action || 'validate';
    
    // Look up the link token
    const { data: linkData, error: linkError } = await supabase
      .from('password_setup_links')
      .select(`
        id,
        token,
        tenant_id,
        email,
        expires_at,
        used,
        used_at,
        created_at,
        tenants (
          id,
          slug,
          name,
          email
        )
      `)
      .eq('token', body.linkToken)
      .single();

    if (linkError || !linkData) {
      console.log("Link token not found:", { token: body.linkToken, error: linkError, requestId });
      return new Response(JSON.stringify({
        valid: false,
        message: "Invalid link token"
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Link token found:", {
      tokenId: linkData.id,
      tenantId: linkData.tenant_id,
      email: linkData.email,
      used: linkData.used,
      expiresAt: linkData.expires_at,
      requestId
    });

    // Check if already used
    if (linkData.used) {
      console.log("Link token already used:", { 
        tokenId: linkData.id, 
        usedAt: linkData.used_at, 
        requestId 
      });
      return new Response(JSON.stringify({
        valid: false,
        used: true,
        message: "This password setup link has already been used"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(linkData.expires_at);
    if (now > expiresAt) {
      console.log("Link token expired:", { 
        tokenId: linkData.id, 
        expiresAt: linkData.expires_at, 
        now: now.toISOString(),
        requestId 
      });
      return new Response(JSON.stringify({
        valid: false,
        expired: true,
        expiresAt: linkData.expires_at,
        message: "This password setup link has expired"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // If action is 'consume', mark the link as used
    if (action === 'consume') {
      const { error: updateError } = await supabase
        .from('password_setup_links')
        .update({
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('id', linkData.id);

      if (updateError) {
        console.error("Failed to mark link as used:", { 
          tokenId: linkData.id, 
          error: updateError, 
          requestId 
        });
        return new Response(JSON.stringify({
          valid: false,
          message: "Failed to consume link token"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log("Link token consumed successfully:", { 
        tokenId: linkData.id, 
        requestId 
      });
    }

    // Return validation result
    const response: ValidationResponse = {
      valid: true,
      expired: false,
      used: false,
      tenant: {
        id: linkData.tenants.id,
        slug: linkData.tenants.slug,
        name: linkData.tenants.name,
        email: linkData.tenants.email
      },
      expiresAt: linkData.expires_at,
      message: action === 'consume' ? "Link consumed successfully" : "Link is valid"
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Password setup link validation error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });
    
    return new Response(JSON.stringify({
      valid: false,
      message: "Internal server error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
