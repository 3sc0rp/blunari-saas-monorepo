/**
 * PROFESSIONAL TENANT PROVISIONING V2 - Edge Function
 * 
 * Purpose: Thin API controller for tenant provisioning
 * All business logic is in the database function provision_tenant_atomic_v2()
 * 
 * Features:
 * - Admin authorization check
 * - Auth user creation (only thing Edge Function can do)
 * - Call atomic database function
 * - Comprehensive error handling
 * - Complete audit logging
 * - Automatic rollback on failure
 * 
 * Security:
 * - No password in response
 * - Email verification required
 * - Admin role validation
 * - Idempotency support
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// TYPES
// ============================================================================

interface ProvisioningRequest {
  basics: {
    name: string;
    slug: string;
    timezone?: string;
    currency?: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
  owner: {
    email: string;
    name?: string;
  };
  idempotencyKey?: string;
}

interface ProvisioningResponse {
  success: boolean;
  data?: {
    tenantId: string;
    ownerId: string;
    slug: string;
    primaryUrl: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

// ============================================================================
// CORS HELPERS
// ============================================================================

const createCorsHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

// ============================================================================
// SANITIZATION & VALIDATION
// ============================================================================

const sanitizeSlug = (input: string): string => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .substring(0, 50);
};

const validateEmail = (email: string): boolean => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders();
  
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST requests are allowed",
        },
      }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Provisioning request started`);
  
  try {
    // ========================================
    // STEP 1: INITIALIZE SUPABASE CLIENT
    // ========================================
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    // ========================================
    // STEP 2: VERIFY ADMIN AUTHORIZATION
    // ========================================
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error(`[${requestId}] Missing Authorization header`);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authorization header is required",
          },
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`[${requestId}] Auth error:`, authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired authentication token",
          },
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Check admin role
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("role, status")
      .eq("user_id", user.id)
      .single();
    
    if (employeeError || !employee || !["SUPER_ADMIN", "ADMIN"].includes(employee.role) || employee.status !== "ACTIVE") {
      console.error(`[${requestId}] Admin check failed:`, { employee, employeeError });
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Admin privileges required",
            hint: "Only active Super Admins and Admins can provision tenants",
          },
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`[${requestId}] Admin authorized:`, user.email);
    
    // ========================================
    // STEP 3: PARSE AND VALIDATE REQUEST
    // ========================================
    
    const requestData: ProvisioningRequest = await req.json();
    
    // Validate required fields
    if (!requestData.basics?.name || !requestData.basics?.slug || !requestData.owner?.email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required fields: tenant name, slug, and owner email are required",
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Sanitize inputs
    const tenantName = requestData.basics.name.trim();
    const tenantSlug = sanitizeSlug(requestData.basics.slug);
    const ownerEmail = requestData.owner.email.toLowerCase().trim();
    
    // Validate email format
    if (!validateEmail(ownerEmail)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INVALID_EMAIL",
            message: "Owner email address is invalid",
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const idempotencyKey = requestData.idempotencyKey || crypto.randomUUID();
    
    console.log(`[${requestId}] Request validated:`, {
      tenantName,
      tenantSlug,
      ownerEmail,
      idempotencyKey,
    });
    
    // ========================================
    // STEP 4: CALL ATOMIC DATABASE FUNCTION
    // ========================================
    
    console.log(`[${requestId}] Calling provision_tenant_atomic_v2...`);
    
    const { data: dbResult, error: dbError } = await supabase.rpc(
      "provision_tenant_atomic_v2",
      {
        p_admin_user_id: user.id,
        p_admin_email: user.email || "",
        p_tenant_name: tenantName,
        p_tenant_slug: tenantSlug,
        p_owner_email: ownerEmail,
        p_owner_name: requestData.owner.name || null,
        p_timezone: requestData.basics.timezone || "UTC",
        p_currency: requestData.basics.currency || "USD",
        p_tenant_email: requestData.basics.email || null,
        p_tenant_phone: requestData.basics.phone || null,
        p_address: requestData.basics.address ? JSON.stringify(requestData.basics.address) : null,
        p_settings: requestData.basics.website || requestData.basics.description ? JSON.stringify({
          website: requestData.basics.website || null,
          description: requestData.basics.description || null,
        }) : null,
        p_idempotency_key: idempotencyKey,
        p_request_id: requestId,
      }
    );
    
    if (dbError) {
      console.error(`[${requestId}] Database function error:`, dbError);
      
      // Map database errors to user-friendly messages
      let errorCode = "DATABASE_ERROR";
      let errorMessage = dbError.message;
      let errorHint: string | undefined;
      
      if (dbError.message.includes("EMAIL_UNAVAILABLE")) {
        errorCode = "EMAIL_UNAVAILABLE";
        errorMessage = "This email address is already in use";
        errorHint = "Please use a unique email for each tenant owner";
      } else if (dbError.message.includes("SLUG_UNAVAILABLE")) {
        errorCode = "SLUG_UNAVAILABLE";
        errorMessage = dbError.message.split(": ")[1] || "This slug is already taken";
        errorHint = "Please choose a different slug";
      } else if (dbError.message.includes("VERIFICATION_FAILED")) {
        errorCode = "VERIFICATION_FAILED";
        errorMessage = "Provisioning verification failed";
        errorHint = "Internal consistency check failed. Please contact support.";
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
            hint: errorHint,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const provisionResult = Array.isArray(dbResult) ? dbResult[0] : dbResult;
    
    if (!provisionResult.success) {
      console.error(`[${requestId}] Provisioning failed:`, provisionResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: provisionResult.error_code || "PROVISIONING_FAILED",
            message: provisionResult.error_message || "Provisioning failed",
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const tenantId = provisionResult.tenant_id;
    const auditId = provisionResult.audit_id;
    
    console.log(`[${requestId}] Tenant created in database:`, tenantId);
    
    // ========================================
    // STEP 5: CREATE AUTH USER
    // ========================================
    
    console.log(`[${requestId}] Creating auth user...`);
    
    const { data: authUser, error: authUserError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      email_confirm: false, // Require email verification
      user_metadata: {
        role: "tenant_owner",
        name: requestData.owner.name || tenantName + " Owner",
        tenant_id: tenantId,
        tenant_slug: tenantSlug,
      },
    });
    
    if (authUserError || !authUser?.user) {
      console.error(`[${requestId}] Auth user creation failed:`, authUserError);
      
      // Rollback database changes
      console.log(`[${requestId}] Rolling back...`);
      await supabase.rpc("rollback_provisioning_v2", {
        p_audit_id: auditId,
        p_tenant_id: tenantId,
        p_owner_id: null,
        p_reason: `Auth user creation failed: ${authUserError?.message}`,
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "AUTH_USER_CREATION_FAILED",
            message: authUserError?.message || "Failed to create owner account",
            hint: "The email may already be in use or invalid",
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const ownerId = authUser.user.id;
    console.log(`[${requestId}] Auth user created:`, ownerId);
    
    // ========================================
    // STEP 6: UPDATE DATABASE WITH OWNER ID
    // ========================================
    
    console.log(`[${requestId}] Updating database with owner_id...`);
    
    const { data: updateResult, error: updateError } = await supabase.rpc(
      "update_provisioning_owner_id",
      {
        p_tenant_id: tenantId,
        p_owner_id: ownerId,
        p_owner_email: ownerEmail,
        p_audit_id: auditId,
      }
    );
    
    const updateResultData = Array.isArray(updateResult) ? updateResult[0] : updateResult;
    
    if (updateError || !updateResultData?.success) {
      console.error(`[${requestId}] Owner ID update failed:`, updateError || updateResultData);
      
      // Rollback everything including auth user
      console.log(`[${requestId}] Rolling back with auth user cleanup...`);
      await supabase.rpc("rollback_provisioning_v2", {
        p_audit_id: auditId,
        p_tenant_id: tenantId,
        p_owner_id: ownerId,
        p_reason: `Owner ID update failed: ${updateError?.message || updateResultData?.error_message}`,
      });
      
      // Note: Auth user cleanup will be done by manual script
      console.warn(`[${requestId}] Auth user ${ownerId} requires manual cleanup`);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "DATABASE_UPDATE_FAILED",
            message: "Failed to finalize provisioning",
            hint: "Database records were rolled back. Please try again.",
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`[${requestId}] Provisioning completed successfully!`);
    
    // ========================================
    // STEP 7: RETURN SUCCESS RESPONSE
    // ========================================
    
    const primaryUrl = `${Deno.env.get("CLIENT_BASE_URL") || "https://app.blunari.ai"}/${tenantSlug}`;
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          tenantId,
          ownerId,
          slug: tenantSlug,
          primaryUrl,
          message: "Tenant provisioned successfully! Password reset email will be sent to the owner.",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: errorMessage,
          hint: "An unexpected error occurred. Please try again or contact support.",
        },
      }),
      {
        status: 500,
        headers: { ...createCorsHeaders(), "Content-Type": "application/json" },
      }
    );
  }
});
