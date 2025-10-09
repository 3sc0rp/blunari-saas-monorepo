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

    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(employee.role);
    const isActive = employee.status === "ACTIVE";

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
    
    // Clean up empty strings to undefined for optional fields
    const cleanOptional = (value: unknown) => {
      if (typeof value === 'string' && value.trim() === '') return undefined;
      return value;
    };
    
    if (requestData.basics) {
      requestData.basics.description = cleanOptional(requestData.basics.description);
      requestData.basics.email = cleanOptional(requestData.basics.email);
      requestData.basics.phone = cleanOptional(requestData.basics.phone);
      requestData.basics.website = cleanOptional(requestData.basics.website);
      requestData.basics.cuisineTypeId = cleanOptional(requestData.basics.cuisineTypeId);
      
      if (requestData.basics.address) {
        requestData.basics.address.street = cleanOptional(requestData.basics.address.street);
        requestData.basics.address.city = cleanOptional(requestData.basics.address.city);
        requestData.basics.address.state = cleanOptional(requestData.basics.address.state);
        requestData.basics.address.zipCode = cleanOptional(requestData.basics.address.zipCode);
        requestData.basics.address.country = cleanOptional(requestData.basics.address.country);
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
      access: z
        .object({
          mode: z.string(),
        })
        .optional(),
      seed: z
        .object({
          seatingPreset: z.string(),
          enablePacing: z.boolean(),
          enableDepositPolicy: z.boolean(),
        })
        .optional(),
      billing: z
        .object({
          createSubscription: z.boolean(),
          plan: z.string(),
        })
        .optional(),
      sms: z
        .object({
          startRegistration: z.boolean(),
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
            // Check if user exists using REST Admin API
            const checkUserResponse = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
              {
                headers: {
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
                }
              }
            );
            
            if (checkUserResponse.ok) {
              const checkData = await checkUserResponse.json();
              if (checkData.users && checkData.users.length > 0) {
                console.log("Found existing user for tenant owner:", checkData.users[0].id);
                return checkData.users[0].id;
              }
            }

            // Try to create user using REST Admin API
            console.log(`Creating new owner user account (attempt ${attempt}):`, email);
            const createUserResponse = await fetch(
              `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: email,
                  email_confirm: false, // Disable auto-confirmation email
                  user_metadata: {
                    role: 'owner',
                    full_name: requestData.basics.name + ' Owner',
                    provisioned_at: new Date().toISOString(),
                  },
                }),
              }
            );

            if (!createUserResponse.ok) {
              const createUserError = await createUserResponse.json();
              // Check if error is due to duplicate (race condition)
              if (createUserError.message && 
                  (createUserError.message.includes('duplicate') || 
                   createUserError.message.includes('already exists') ||
                   createUserError.message.includes('unique constraint'))) {
                
                console.log("Duplicate user detected (race condition), fetching existing user...");
                
                // Wait a bit for the other request to complete
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
                
                // Fetch the user that was just created by another request via REST API
                const retryCheckResponse = await fetch(
                  `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
                  {
                    headers: {
                      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                      "apikey": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
                    }
                  }
                );
                if (retryCheckResponse.ok) {
                  const retryData = await retryCheckResponse.json();
                  if (retryData.users && retryData.users.length > 0) {
                    console.log("Successfully recovered from race condition:", retryData.users[0].id);
                    return retryData.users[0].id;
                  }
                }
              }
              
              // If not the last attempt and retriable error, retry
              if (attempt < maxRetries) {
                console.log(`User creation failed, retrying (${attempt}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
                continue;
              }
              
              throw new Error(`Failed to create owner user: ${createUserError.message || 'Unknown error'}`);
            }

            const newUser = await createUserResponse.json();
            if (!newUser?.id) {
              throw new Error("Failed to create owner user: No user returned");
            }

            console.log("Created owner user successfully:", newUser.id);
            return newUser.id;
            
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

    // Call the provision_tenant database function using the new signature
    // New signature: provision_tenant(p_tenant_data jsonb, p_owner_email text, p_owner_user_id uuid)
    const { data: provisionResult, error: provisionError } = await supabase.rpc(
      "provision_tenant",
      {
        p_tenant_data: {
          slug: requestData.basics.slug,
          name: requestData.basics.name,
          address: requestData.basics.address?.street ?? null,
          city: requestData.basics.address?.city ?? null,
          state: requestData.basics.address?.state ?? null,
          country: requestData.basics.address?.country ?? null,
          postal_code: requestData.basics.address?.postalCode ?? null,
          plan_tier: 'premium',
          plan_status: 'trialing',
          billing_cycle: 'monthly',
          owner_name: requestData.owner?.name ?? 'Owner',
        },
        p_owner_email: ownerEmail,
        p_owner_user_id: ownerUserId,
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

    // Extract tenant_id from the result
    // The function returns: { success: true, tenant_id: uuid, tenant_slug: text, tenant_name: text, owner_employee_id: uuid }
    const tenantId = provisionResult?.tenant_id;
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "DB_ERROR",
            message: "Provisioning failed: No tenant ID returned",
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
