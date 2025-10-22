/// <reference path="../shared-types.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Inline CORS helpers for deployment
const createCorsHeaders = (requestOrigin: string | null = null) => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface BasicInfo {
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  cuisineTypeId?: string;
  address?: Address;
}

interface OwnerInfo {
  email: string;
  name?: string;
}

interface TenantProvisioningRequest {
  basics: BasicInfo;
  owner?: OwnerInfo;
  idempotencyKey?: string;
}

const corsHeaders = createCorsHeaders();

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
  'admin', 'api', 'auth', 'login', 'logout', 'register', 
  'signup', 'signin', 'dashboard', 'settings', 'billing',
  'docs', 'help', 'support', 'public', 'static', 'assets',
  'app', 'www', 'mail', 'cdn', 'images', 'files'
];

/**
 * Sanitizes and validates a tenant slug
 */
const sanitizeSlug = (input: string): string => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .substring(0, 50);
};

/**
 * Validates slug against business rules
 */
const validateSlug = (slug: string): { valid: boolean; error?: string } => {
  if (!slug || slug.length < 3) {
    return { valid: false, error: "Slug must be at least 3 characters" };
  }
  
  if (slug.length > 50) {
    return { valid: false, error: "Slug must not exceed 50 characters" };
  }
  
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { valid: false, error: "Slug must be lowercase alphanumeric with hyphens" };
  }
  
  if (RESERVED_SLUGS.includes(slug)) {
    return { valid: false, error: `"${slug}" is a reserved keyword and cannot be used` };
  }
  
  return { valid: true };
};

/**
 * Generates a secure random password
 */
const generateSecurePassword = (): string => {
  const length = 16;
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*-_=+';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(req.headers.get("Origin")) });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "METHOD_NOT_ALLOWED", message: "Only POST is allowed" },
      }),
      {
        status: 405,
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      },
    );
  }

  try {
    const requestId = crypto.randomUUID();
    console.log("[tenant-provisioning] Request started:", requestId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Missing Authorization header", requestId },
        }),
        {
          status: 401,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }
    
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid or expired token", requestId },
        }),
        {
          status: 401,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Check if user is admin
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("role, status")
      .eq("user_id", user.id)
      .single();

    if (employeeError || !employee || !["SUPER_ADMIN", "ADMIN"].includes(employee.role) || employee.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "FORBIDDEN", message: "Admin privileges required", requestId },
        }),
        {
          status: 403,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    const requestData: TenantProvisioningRequest = await req.json();
    
    // Sanitize slug
    if (requestData.basics?.slug) {
      requestData.basics.slug = sanitizeSlug(requestData.basics.slug);
    }
    
    // Basic validation
    if (!requestData.basics?.name || !requestData.basics?.slug) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Tenant name and slug are required",
            requestId,
          },
        }),
        {
          status: 400,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Validate slug
    const slugValidation = validateSlug(requestData.basics.slug);
    if (!slugValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "INVALID_SLUG", message: slugValidation.error, requestId },
        }),
        {
          status: 400,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    const ownerEmail = requestData.owner?.email;
    
    if (!ownerEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "OWNER_EMAIL_REQUIRED", message: "Owner email is required", requestId },
        }),
        {
          status: 400,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    const idempotencyKey = requestData.idempotencyKey || crypto.randomUUID();
    const ownerPassword = generateSecurePassword();
    
    console.log("[tenant-provisioning] Starting atomic provisioning", { slug: requestData.basics.slug, ownerEmail, idempotencyKey });

    // Pre-flight email validation
    const { data: emailCheckResult, error: emailCheckError } = await supabase.rpc(
      "check_owner_email_availability",
      { p_email: ownerEmail }
    );
    
    if (emailCheckError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Failed to validate email", requestId },
        }),
        {
          status: 500,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }
    
    const emailCheck = Array.isArray(emailCheckResult) ? emailCheckResult[0] : emailCheckResult;
    
    if (!emailCheck?.available) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "EMAIL_UNAVAILABLE",
            message: emailCheck?.reason || "Email is already in use",
            hint: "Each tenant must have a unique owner email",
            requestId,
          },
        }),
        {
          status: 400,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Call atomic provisioning function
    const { data: atomicResult, error: atomicError } = await supabase.rpc(
      "provision_tenant_atomic",
      {
        p_idempotency_key: idempotencyKey,
        p_admin_user_id: user.id,
        p_tenant_name: requestData.basics.name,
        p_tenant_slug: requestData.basics.slug,
        p_owner_email: ownerEmail,
        p_owner_password: ownerPassword,
        p_tenant_data: {
          address: requestData.basics.address?.street || null,
          city: requestData.basics.address?.city || null,
          state: requestData.basics.address?.state || null,
          country: requestData.basics.address?.country || null,
          postal_code: requestData.basics.address?.zipCode || null,
          phone: requestData.basics.phone || null,
          website: requestData.basics.website || null,
          description: requestData.basics.description || null,
          timezone: requestData.basics.timezone || 'UTC',
          currency: requestData.basics.currency || 'USD',
        },
      },
    );

    if (atomicError) {
      console.error("[tenant-provisioning] Atomic provisioning failed:", atomicError);
      
      const errorMessage = atomicError.message || "Unknown error";
      let errorCode = "PROVISIONING_FAILED";
      let statusCode = 500;
      
      if (errorMessage.includes("Email validation failed")) {
        errorCode = "EMAIL_VALIDATION_FAILED";
        statusCode = 400;
      } else if (errorMessage.includes("Slug") && errorMessage.includes("already taken")) {
        errorCode = "DUPLICATE_SLUG";
        statusCode = 400;
      } else if (errorMessage.includes("not authorized")) {
        errorCode = "FORBIDDEN";
        statusCode = 403;
      } else if (errorMessage.includes("already in progress")) {
        errorCode = "DUPLICATE_REQUEST";
        statusCode = 409;
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: errorCode, message: errorMessage, requestId },
        }),
        {
          status: statusCode,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    const tenantId = atomicResult?.tenant_id;
    const ownerId = atomicResult?.owner_id;
    
    if (!tenantId || !ownerId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "PROVISIONING_FAILED", message: "Missing tenant or owner ID", requestId },
        }),
        {
          status: 500,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Create auth user
    console.log("[tenant-provisioning] Creating auth user", { ownerId, ownerEmail });
    
    const { data: authUser, error: authUserError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        role: 'tenant_owner',
        tenant_id: tenantId,
        name: requestData.owner?.name || 'Owner',
      },
    });

    if (authUserError) {
      console.error("[tenant-provisioning] Auth user creation failed:", authUserError);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "AUTH_USER_CREATION_FAILED", message: authUserError.message, requestId },
        }),
        {
          status: 500,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    if (!authUser?.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "AUTH_USER_CREATION_FAILED", message: "No user returned", requestId },
        }),
        {
          status: 500,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Update tenant with actual auth user ID
    await supabase
      .from('tenants')
      .update({ owner_id: authUser.user.id, status: 'active' })
      .eq('id', tenantId);
    
    // Update auto_provisioning
    await supabase
      .from('auto_provisioning')
      .update({ user_id: authUser.user.id, status: 'completed' })
      .eq('tenant_id', tenantId);
    
    // Create profile
    await supabase
      .from('profiles')
      .upsert({
        user_id: authUser.user.id,
        email: ownerEmail,
        role: 'tenant_owner',
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      });

    console.log("[tenant-provisioning] Completed successfully", { tenantId, ownerId: authUser.user.id });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          runId: crypto.randomUUID(),
          tenantId,
          slug: requestData.basics.slug,
          primaryUrl: Deno.env.get("CLIENT_BASE_URL") ?? "https://app.blunari.ai",
          message: "Tenant provisioned successfully",
          ownerCredentials: {
            email: ownerEmail,
            password: ownerPassword,
            temporaryPassword: true,
            message: "Save these credentials securely. The password will not be shown again."
          },
        },
        requestId,
      }),
      {
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Tenant provisioning error:", error);
    
    const errId = crypto.randomUUID();
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    let errorCode = "PROVISIONING_FAILED";
    let statusCode = 500;
    
    if (errorMessage.includes("slug") && errorMessage.includes("already exists")) {
      errorCode = "DUPLICATE_SLUG";
      statusCode = 400;
    } else if (errorMessage.includes("validation")) {
      errorCode = "VALIDATION_ERROR";
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: errorCode, message: errorMessage, requestId: errId },
      }),
      {
        status: statusCode,
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      },
    );
  }
});
