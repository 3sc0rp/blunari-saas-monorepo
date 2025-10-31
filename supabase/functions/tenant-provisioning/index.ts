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
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'x-my-custom-header': 'tenant-provisioning-service'
          }
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

    // Check if user is admin - use raw SQL to bypass RLS issues
    console.log("[tenant-provisioning] Checking admin privileges for user:", user.id);
    
    const { data: employeeData, error: employeeError } = await supabase
      .rpc('get_employee_by_user_id', { p_user_id: user.id });

    const employee = Array.isArray(employeeData) ? employeeData[0] : employeeData;
    
    console.log("[tenant-provisioning] Employee query result:", { employee, employeeError });

    if (employeeError || !employee || !["SUPER_ADMIN", "ADMIN"].includes(employee.role) || employee.status !== "ACTIVE") {
      console.log("[tenant-provisioning] Admin check failed:", {
        hasError: !!employeeError,
        errorMessage: employeeError?.message,
        hasEmployee: !!employee,
        role: employee?.role,
        status: employee?.status,
        isValidRole: employee?.role ? ["SUPER_ADMIN", "ADMIN"].includes(employee.role) : false,
        isActive: employee?.status === "ACTIVE"
      });
      
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
    
    console.log("[tenant-provisioning] Admin check passed for user:", user.id);

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

    // ============================================================================
    // PRE-FLIGHT VALIDATION: Check email AND slug availability BEFORE auth user creation
    // This prevents orphaned auth users when slug conflicts occur
    // ============================================================================
    
    // 1. Email availability check
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
    
    // 2. Slug availability check (prevents orphaned auth users)
    const { data: existingTenants, error: slugCheckError } = await supabase
      .from('tenants')
      .select('id, slug, name')
      .eq('slug', requestData.basics.slug)
      .limit(1);
    
    if (slugCheckError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Failed to validate slug", requestId },
        }),
        {
          status: 500,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }
    
    if (existingTenants && existingTenants.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "SLUG_UNAVAILABLE",
            message: `Slug "${requestData.basics.slug}" is already taken by "${existingTenants[0].name}"`,
            hint: "Please choose a different slug for your tenant",
            requestId,
          },
        }),
        {
          status: 400,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Log audit: initiated (only once, after all pre-flight checks pass)
    await supabase.rpc('log_provisioning_audit', {
      p_admin_user_id: user.id,
      p_admin_email: user.email || null,
      p_tenant_slug: requestData.basics.slug,
      p_owner_email: ownerEmail,
      p_action: 'initiated',
      p_idempotency_key: idempotencyKey,
      p_metadata: { request_id: requestId }
    });

    // ============================================================================
    // STEP 1: Create auth user FIRST (before atomic function)
    // This gets us the real owner ID to use in database records
    // ============================================================================
    
    console.log("[tenant-provisioning] Creating auth user FIRST", { ownerEmail });
    
    const { data: authUser, error: authUserError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: false,  // SECURITY: Require email verification
      user_metadata: {
        role: 'tenant_owner',
        name: requestData.owner?.name || requestData.basics.name + ' Owner',
      },
    });

    if (authUserError) {
      console.error("[tenant-provisioning] Auth user creation failed:", authUserError);
      
      // Log audit: failed
      await supabase.rpc('log_provisioning_audit', {
        p_admin_user_id: user.id,
        p_admin_email: user.email || null,
        p_tenant_slug: requestData.basics.slug,
        p_owner_email: ownerEmail,
        p_action: 'failed',
        p_idempotency_key: idempotencyKey,
        p_error_message: authUserError.message,
        p_metadata: { stage: 'auth_user_creation', request_id: requestId }
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: { 
            code: "AUTH_USER_CREATION_FAILED", 
            message: authUserError.message,
            hint: "The email may already be in use. Try a different owner email.",
            requestId 
          },
        }),
        {
          status: 500,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    if (!authUser?.user) {
      await supabase.rpc('log_provisioning_audit', {
        p_admin_user_id: user.id,
        p_admin_email: user.email || null,
        p_tenant_slug: requestData.basics.slug,
        p_owner_email: ownerEmail,
        p_action: 'failed',
        p_idempotency_key: idempotencyKey,
        p_error_message: 'Auth user creation returned no user',
        p_metadata: { stage: 'auth_user_creation', request_id: requestId }
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "AUTH_USER_CREATION_FAILED", message: "No user returned from auth creation", requestId },
        }),
        {
          status: 500,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    const realOwnerId = authUser.user.id;
    console.log("[tenant-provisioning] Auth user created successfully", { ownerId: realOwnerId });
    
    // Log audit: auth_user_created
    await supabase.rpc('log_provisioning_audit', {
      p_admin_user_id: user.id,
      p_admin_email: user.email || null,
      p_tenant_slug: requestData.basics.slug,
      p_owner_email: ownerEmail,
      p_owner_id: realOwnerId,
      p_action: 'auth_user_created',
      p_idempotency_key: idempotencyKey,
      p_metadata: { request_id: requestId }
    });

    // ============================================================================
    // STEP 2: Create tenant and provisioning records directly (skip atomic function email check)
    // Since we already validated email and created auth user, we'll manually create records
    // ============================================================================
    
    console.log("[tenant-provisioning] Creating tenant and provisioning records");
    
    let tenantId: string;
    
    try {
      // Create tenant with real owner ID
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: requestData.basics.name,
          slug: requestData.basics.slug,
          email: ownerEmail,
          owner_id: realOwnerId,
          status: 'active',
          phone: requestData.basics.phone || null,
          address: requestData.basics.address ? {
            street: requestData.basics.address.street || null,
            city: requestData.basics.address.city || null,
            state: requestData.basics.address.state || null,
            country: requestData.basics.address.country || null,
            zipCode: requestData.basics.address.zipCode || null,
          } : null,
          timezone: requestData.basics.timezone || 'UTC',
          currency: requestData.basics.currency || 'USD',
          settings: {
            website: requestData.basics.website || null,
            description: requestData.basics.description || null,
          },
        })
        .select('id')
        .single();
      
      if (tenantError || !tenantData) {
        throw new Error(`Tenant creation failed: ${tenantError?.message || 'No data returned'}`);
      }
      
      tenantId = tenantData.id;
      
      // Create auto_provisioning record
      const { error: provError } = await supabase
        .from('auto_provisioning')
        .insert({
          user_id: realOwnerId,
          tenant_id: tenantId,
          tenant_slug: requestData.basics.slug,
          status: 'completed',
          role_granted: 'owner',
          granted_by: user.id,
        });
      
      if (provError) {
        throw new Error(`Auto-provisioning creation failed: ${provError.message}`);
      }
      
      // Create profile for owner
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: realOwnerId,
          email: ownerEmail,
          role: 'tenant_owner',
          onboarding_completed: false,
          first_name: requestData.owner?.name?.split(' ')[0] || 'Owner',
          last_name: requestData.owner?.name?.split(' ').slice(1).join(' ') || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        });
      
      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }
      
      // Log provisioning request
      await supabase
        .from('provisioning_requests')
        .insert({
          idempotency_key: idempotencyKey,
          admin_user_id: user.id,
          tenant_slug: requestData.basics.slug,
          owner_email: ownerEmail,
          tenant_id: tenantId,
          owner_id: realOwnerId,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      
    } catch (creationError) {
      console.error("[tenant-provisioning] Database creation failed:", creationError);
      
      // Log audit: failed
      await supabase.rpc('log_provisioning_audit', {
        p_admin_user_id: user.id,
        p_admin_email: user.email || null,
        p_tenant_slug: requestData.basics.slug,
        p_owner_email: ownerEmail,
        p_owner_id: realOwnerId,
        p_action: 'failed',
        p_idempotency_key: idempotencyKey,
        p_error_message: creationError instanceof Error ? creationError.message : 'Database creation failed',
        p_metadata: { stage: 'database_creation', request_id: requestId }
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: { 
            code: "DATABASE_CREATION_FAILED", 
            message: creationError instanceof Error ? creationError.message : "Database creation failed",
            hint: "Auth user was created but database records failed. Manual cleanup may be needed.",
            requestId 
          },
        }),
        {
          status: 500,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Log audit: database_updated
    await supabase.rpc('log_provisioning_audit', {
      p_admin_user_id: user.id,
      p_admin_email: user.email || null,
      p_tenant_id: tenantId,
      p_tenant_slug: requestData.basics.slug,
      p_owner_email: ownerEmail,
      p_owner_id: realOwnerId,
      p_action: 'database_updated',
      p_idempotency_key: idempotencyKey,
      p_metadata: { request_id: requestId }
    });

    // ============================================================================
    // STEP 3: Verify provisioning completed correctly
    // ============================================================================
    
    const { data: verificationResult, error: verifyError } = await supabase.rpc(
      'verify_provisioning_completion',
      { p_tenant_id: tenantId, p_expected_owner_id: realOwnerId }
    );
    
    const verification = Array.isArray(verificationResult) ? verificationResult[0] : verificationResult;
    
    if (verifyError || !verification?.verified) {
      const issues = verification?.issues || ['Verification failed'];
      console.error("[tenant-provisioning] Verification failed:", issues);
      
      // Rollback
      await supabase.rpc('rollback_failed_provisioning', {
        p_tenant_id: tenantId,
        p_owner_id: realOwnerId,
        p_reason: issues.join(', ')
      });
      
      // Log audit: rolled_back
      await supabase.rpc('log_provisioning_audit', {
        p_admin_user_id: user.id,
        p_admin_email: user.email || null,
        p_tenant_id: tenantId,
        p_tenant_slug: requestData.basics.slug,
        p_owner_email: ownerEmail,
        p_owner_id: realOwnerId,
        p_action: 'rolled_back',
        p_idempotency_key: idempotencyKey,
        p_error_message: issues.join(', '),
        p_metadata: { request_id: requestId }
      });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: { 
            code: "VERIFICATION_FAILED", 
            message: `Provisioning verification failed: ${issues.join(', ')}`,
            hint: "The provisioning was rolled back.",
            requestId 
          },
        }),
        {
          status: 500,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }
    
    console.log("[tenant-provisioning] Verification passed", { tenantId, ownerId: realOwnerId });

    // Log audit: completed
    await supabase.rpc('log_provisioning_audit', {
      p_admin_user_id: user.id,
      p_admin_email: user.email || null,
      p_tenant_id: tenantId,
      p_tenant_slug: requestData.basics.slug,
      p_owner_email: ownerEmail,
      p_owner_id: realOwnerId,
      p_action: 'completed',
      p_idempotency_key: idempotencyKey,
      p_metadata: { request_id: requestId }
    });

    console.log("[tenant-provisioning] Completed successfully", { tenantId, ownerId: realOwnerId });

    // ============================================================================
    // SECURITY: Do NOT return password in response
    // ============================================================================
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          runId: requestId,
          tenantId,
          ownerId: realOwnerId,
          slug: requestData.basics.slug,
          primaryUrl: `${Deno.env.get("CLIENT_BASE_URL") ?? "https://app.blunari.ai"}/${requestData.basics.slug}`,
          message: "Tenant provisioned successfully. Password setup email sent to owner.",
          ownerCredentials: {
            email: ownerEmail,
            setupLinkSent: true,
            message: "A password setup link has been sent to the owner's email address. They must verify their email and set a password before logging in.",
            // SECURITY: Password NOT included in response
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
