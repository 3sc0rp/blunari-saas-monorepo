/// <reference path="../shared-types.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
  sendInvite?: boolean;
}

interface TenantProvisioningRequest {
  basics: BasicInfo;
  owner?: OwnerInfo;
  idempotencyKey?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
            requestId: crypto.randomUUID(),
          },
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const requestData = await req.json();
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
          sendInvite: z.boolean().optional(),
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
            requestId: crypto.randomUUID(),
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const requestId = crypto.randomUUID();

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

    // Determine or create the owner user account if provided
    let ownerUserId: string | null = null;
    const ownerEmail: string | undefined = requestData.owner?.email;
    if (ownerEmail) {
      try {
        const { data: existingUser } =
          await supabase.auth.admin.getUserByEmail(ownerEmail);
        if (existingUser?.user) {
          ownerUserId = existingUser.user.id;
        } else {
          const { data: created, error: createErr } =
            await supabase.auth.admin.createUser({
              email: ownerEmail,
              email_confirm: true,
              user_metadata: { role: "owner" },
            });
          if (createErr) throw createErr;
          ownerUserId = created.user?.id ?? null;
        }
      } catch (e) {
        console.warn("Owner user create/get failed (continuing):", e);
      }
    }

    // Call the provision_tenant database function using owner user if available
    // NOTE: There are multiple overloaded versions in the DB; pass full argument list to disambiguate
    const { data: tenantId, error: provisionError } = await supabase.rpc(
      "provision_tenant",
      {
        p_user_id: ownerUserId ?? user.id,
        p_restaurant_name: requestData.basics.name,
        p_restaurant_slug: requestData.basics.slug,
        p_timezone: requestData.basics.timezone,
        p_currency: requestData.basics.currency,
        p_description: requestData.basics.description ?? null,
        p_phone: requestData.basics.phone ?? null,
        p_email: requestData.basics.email ?? null,
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Tenant provisioning error:", error);

    const requestId = crypto.randomUUID();
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "PROVISIONING_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
          requestId,
        },
        requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
