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
 * Ensures slug is safe, follows conventions, and is not reserved
 */
const sanitizeSlug = (input: string): string => {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '') // Remove invalid characters
    .replace(/^-+|-+$/g, '')     // Remove leading/trailing dashes
    .replace(/-{2,}/g, '-')      // Replace consecutive dashes with single dash
    .substring(0, 50);           // Max length 50 characters
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
    return { valid: false, error: "Slug must be lowercase alphanumeric with hyphens (no leading/trailing hyphens)" };
  }
  
  if (RESERVED_SLUGS.includes(slug)) {
    return { valid: false, error: `"${slug}" is a reserved keyword and cannot be used` };
  }
  
  return { valid: true };
};

serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(req.headers.get("Origin")) });
  }

  // Allow only POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST is allowed",
        },
      }),
      {
        status: 405,
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json", Allow: "POST, OPTIONS" },
      },
    );
  }

  try {
    // Generate a request id for tracing
    const requestId = crypto.randomUUID();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing Authorization header",
            requestId,
          },
        }),
        {
          status: 401,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // CRITICAL SECURITY: Check if user is an admin
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("role, status")
      .eq("user_id", user.id)
      .single();

    if (employeeError || !employee) {
      console.warn("Non-employee attempted provisioning:", user.id);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only administrators can provision tenants",
            requestId,
          },
        }),
        {
          status: 403,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    const isAdmin = ["super_admin", "admin"].includes(employee.role);
    const isActive = employee.status === "active";

    if (!isAdmin || !isActive) {
      console.warn("Insufficient permissions for provisioning:", { 
        userId: user.id, 
        role: employee.role, 
        status: employee.status 
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: isActive 
              ? "Insufficient permissions. Admin role required." 
              : "Account is not active",
            requestId,
          },
        }),
        {
          status: 403,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    console.log("Admin authorization verified:", { userId: user.id, role: employee.role });

    const requestData = await req.json();
    
    // SECURITY: Sanitize slug on backend (don't trust client)
    if (requestData.basics?.slug) {
      const originalSlug = requestData.basics.slug;
      requestData.basics.slug = sanitizeSlug(originalSlug);
      
      if (originalSlug !== requestData.basics.slug) {
        console.log("Slug sanitized:", { original: originalSlug, sanitized: requestData.basics.slug });
      }
    }
    
    // Validate minimally to avoid shape mismatches
    const Schema = z.object({
      basics: z.object({
        name: z.string(),
        slug: z.string(),
        timezone: z.string(),
        currency: z.string(),
        description: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        website: z.string().url().optional(),
        cuisineTypeId: z.string().uuid().optional(),
        address: z
          .object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zipCode: z.string().optional(),
            country: z.string().optional(),
          })
          .optional(),
      }),
      owner: z
        .object({
          email: z.string().email(),
        })
        .optional(),
      idempotencyKey: z.string().uuid().optional(),
    });
    const parsed = Schema.safeParse(requestData);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues
              .map((i: { message: string }) => i.message)
              .join("; "),
            details: parsed.error.issues,
            requestId,
          },
        }),
        {
          status: 400,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Additional slug validation after parsing
    const slugValidation = validateSlug(requestData.basics.slug);
    if (!slugValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INVALID_SLUG",
            message: slugValidation.error,
            requestId,
          },
        }),
        {
          status: 400,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Check slug uniqueness in BOTH auto_provisioning AND tenants tables
    const [autoprovCheck, tenantCheck] = await Promise.all([
      supabase
        .from("auto_provisioning")
        .select("restaurant_slug")
        .eq("restaurant_slug", requestData.basics.slug)
        .limit(1),
      supabase
        .from("tenants")
        .select("slug")
        .eq("slug", requestData.basics.slug)
        .limit(1),
    ]);

    const slugExists = 
      (autoprovCheck.data && autoprovCheck.data.length > 0) ||
      (tenantCheck.data && tenantCheck.data.length > 0);

    if (slugExists) {
      console.log("Slug already exists:", requestData.basics.slug);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "DUPLICATE_SLUG",
            message: `The slug "${requestData.basics.slug}" is already taken. Please choose a different name.`,
            requestId,
          },
        }),
        {
          status: 400,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    console.log("Tenant provisioning request:", {
      requestId,
      idempotencyKey: requestData.idempotencyKey,
      tenantName: requestData.basics?.name,
    });

    // Check idempotency
    if (requestData.idempotencyKey) {
      const { data: existing } = await supabase
        .from("auto_provisioning")
        .select("*")
        .eq("user_id", user.id)
        .eq("restaurant_slug", requestData.basics.slug)
        .single();

      if (existing) {
        console.log("Idempotent request detected, returning existing result");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Tenant already provisioned (idempotent)",
            tenantId: existing.tenant_id,
            slug: existing.restaurant_slug,
            requestId,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Check if owner user already exists, create if not
    // We need to create the user so they can be linked to the tenant
    let ownerUserId: string | null = null;
    const ownerEmail: string | undefined = requestData.owner?.email;
    
    if (ownerEmail) {
      // RACE CONDITION FIX: Retry logic with exponential backoff
      const createUserWithRetry = async (email: string, maxRetries = 3): Promise<string> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // Check if user exists
            const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email);
            if (existingUser?.user) {
              console.log("Found existing user for tenant owner:", existingUser.user.id);
              return existingUser.user.id;
            }

            // Try to create user
            console.log(`Creating new owner user account (attempt ${attempt}):`, email);
            const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
              email: email,
              email_confirm: false, // Disable auto-confirmation email
              user_metadata: {
                role: 'owner',
                full_name: requestData.basics.name + ' Owner',
                provisioned_at: new Date().toISOString(),
              },
            });

            if (createUserError) {
              // Check if error is due to duplicate (race condition)
              if (createUserError.message && 
                  (createUserError.message.includes('duplicate') || 
                   createUserError.message.includes('already exists') ||
                   createUserError.message.includes('unique constraint'))) {
                
                console.log("Duplicate user detected (race condition), fetching existing user...");
                
                // Wait a bit for the other request to complete
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
                
                // Fetch the user that was just created by another request
                const { data: raceUser } = await supabase.auth.admin.getUserByEmail(email);
                if (raceUser?.user) {
                  console.log("Successfully recovered from race condition:", raceUser.user.id);
                  return raceUser.user.id;
                }
              }
              
              // If not the last attempt and retriable error, retry
              if (attempt < maxRetries) {
                console.log(`User creation failed, retrying (${attempt}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
                continue;
              }
              
              throw new Error(`Failed to create owner user: ${createUserError.message}`);
            }

            if (!newUser?.user) {
              throw new Error("Failed to create owner user: No user returned");
            }

            console.log("Created owner user successfully:", newUser.user.id);
            return newUser.user.id;
            
          } catch (error) {
            if (attempt === maxRetries) {
              console.error("All user creation attempts failed:", error);
              throw error;
            }
            console.log(`Attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          }
        }
        
        throw new Error("Failed to create user after all retries");
      };

      try {
        ownerUserId = await createUserWithRetry(ownerEmail);
      } catch (e) {
        console.error("Owner user creation failed after retries:", e);
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "USER_CREATION_FAILED",
              message: e instanceof Error ? e.message : "Failed to create owner user",
              requestId,
            },
          }),
          {
            status: 500,
            headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
          },
        );
      }
    }
    
    // Owner user is required - don't fall back to admin
    if (!ownerUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "OWNER_EMAIL_REQUIRED",
            message: "Owner email is required to provision a tenant",
            requestId,
          },
        }),
        {
          status: 400,
          headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
        },
      );
    }

    // Call the provision_tenant database function using owner user
    // NOTE: There are multiple overloaded versions in the DB; pass full argument list to disambiguate
    // IMPORTANT: Use owner email for tenant.email field, not business email
    // This ensures tenant.email always points to the login credential
    const { data: tenantId, error: provisionError } = await supabase.rpc(
      "provision_tenant",
      {
        p_user_id: ownerUserId, // Now guaranteed to be the owner's user ID
        p_restaurant_name: requestData.basics.name,
        p_restaurant_slug: requestData.basics.slug,
        p_timezone: requestData.basics.timezone,
        p_currency: requestData.basics.currency,
        p_description: requestData.basics.description ?? null,
        p_phone: requestData.basics.phone ?? null,
        p_email: ownerEmail ?? requestData.basics.email ?? null, // Use owner email as primary
        p_website: requestData.basics.website ?? null,
        p_address: requestData.basics.address
          ? JSON.stringify(requestData.basics.address)
          : null,
        p_cuisine_type_id: requestData.basics.cuisineTypeId ?? null,
      },
    );

    if (provisionError) {
      const msg = provisionError.message?.includes("duplicate key")
        ? "Slug already exists. Choose a different slug."
        : provisionError.message;
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "DB_ERROR",
            message: `Provisioning failed: ${msg}`,
            requestId,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

  // Manual email sending: disabled automatic emails. Use Admin UI button instead.

    const responseData = {
      runId: crypto.randomUUID(),
      tenantId,
      slug: requestData.basics.slug,
      primaryUrl:
        Deno.env.get("CLIENT_BASE_URL") ??
        Deno.env.get("APP_BASE_URL") ??
        "https://app.blunari.ai",
      message: "Tenant provisioned successfully",
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        requestId,
      }),
      {
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Tenant provisioning error:", error);
    
    // Enhanced error handling with proper codes
    const errId = crypto.randomUUID();
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Determine appropriate error code based on error message
    let errorCode = "PROVISIONING_FAILED";
    let statusCode = 500;
    
    if (errorMessage.includes("slug") && errorMessage.includes("already exists")) {
      errorCode = "DUPLICATE_SLUG";
      statusCode = 400;
    } else if (errorMessage.includes("Unauthorized") || errorMessage.includes("permission")) {
      errorCode = "FORBIDDEN";
      statusCode = 403;
    } else if (errorMessage.includes("validation") || errorMessage.includes("Invalid")) {
      errorCode = "VALIDATION_ERROR";
      statusCode = 400;
    } else if (errorMessage.includes("user") && errorMessage.includes("failed")) {
      errorCode = "USER_CREATION_FAILED";
      statusCode = 500;
    } else if (errorMessage.includes("duplicate key")) {
      errorCode = "DUPLICATE_SLUG";
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          requestId: errId,
        },
        requestId: errId,
      }),
      {
        status: statusCode,
        headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      },
    );
  }
});
