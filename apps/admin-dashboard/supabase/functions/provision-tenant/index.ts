// @ts-ignore - Deno remote import (valid at runtime)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Deno remote import (valid at runtime)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createCorsHeaders } from "../_shared/cors";

interface ProvisionRequest {
  // Basic Information
  restaurantName: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  cuisineTypeId?: string;

  // Owner Account
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPassword: string;

  // Business Configuration
  timezone: string;
  businessHours: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  }>;
  partySizeConfig: {
    minPartySize: number;
    maxPartySize: number;
    defaultPartySize: number;
    allowLargeParties: boolean;
    largePartyThreshold: number;
  };

  // Billing Setup
  selectedPlanId: string;
  billingCycle: "monthly" | "yearly";

  // Feature Configuration
  enabledFeatures: {
    deposits: boolean;
    posIntegration: boolean;
    etaNotifications: boolean;
    customBranding: boolean;
    advancedAnalytics: boolean;
    multiLocation: boolean;
  };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : "";
  console.log(`[PROVISION-TENANT] ${step}${detailsStr}`);
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(req.headers.get("Origin")) });
  }

  try {
    logStep("Function started");

    // Parse request body
    const requestData: ProvisionRequest = await req.json();

    // Validate required fields more thoroughly
    const requiredFields: string[] = [];
    if (!requestData.restaurantName?.trim()) requiredFields.push("restaurantName");
    if (!requestData.slug?.trim()) requiredFields.push("slug");
    if (!requestData.ownerEmail?.trim()) requiredFields.push("ownerEmail");
    if (!requestData.ownerPassword?.trim()) requiredFields.push("ownerPassword");
    if (!requestData.ownerFirstName?.trim()) requiredFields.push("ownerFirstName");
    if (!requestData.ownerLastName?.trim()) requiredFields.push("ownerLastName");

    if (requiredFields.length > 0) {
      logStep("Missing required fields", { missingFields: requiredFields });
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required fields: ${requiredFields.join(", ")}`,
        }),
        { headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestData.ownerEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid admin email format" }),
        { headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 400 },
      );
    }

    if (requestData.email && !emailRegex.test(requestData.email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid business email format" }),
        { headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Validate password strength
    if (requestData.ownerPassword.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: "Password must be at least 8 characters long" }),
        { headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Create Supabase clients
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    logStep("Supabase admin client created");

    // Try to create the owner user account, or get existing user
    let userData: any;
    const { data: createUserData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.ownerEmail,
      password: requestData.ownerPassword,
      email_confirm: true,
      user_metadata: {
        first_name: requestData.ownerFirstName,
        last_name: requestData.ownerLastName,
        role: "owner",
      },
    });

    if (userError && userError.message?.includes("already been registered")) {
      // Try to get the existing user by email
      const { data: existingUsers, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
      if (getUserError) {
        throw new Error(`Failed to fetch existing user: ${getUserError.message}`);
      }
      const existingUser = existingUsers.users.find((user: any) => user.email === requestData.ownerEmail);
      if (!existingUser) {
        throw new Error(`User with email ${requestData.ownerEmail} should exist but was not found`);
      }
      userData = { user: existingUser };
    } else if (userError) {
      throw new Error(`Failed to create owner account: ${userError.message}`);
    } else {
      userData = createUserData;
    }

    // Call the enhanced provision_tenant function
    const { data: tenantId, error: tenantError } = await supabaseAdmin.rpc(
      "provision_tenant",
      {
        p_user_id: userData.user.id,
        p_restaurant_name: requestData.restaurantName,
        p_restaurant_slug: requestData.slug,
        p_timezone: requestData.timezone,
        p_currency: "USD",
        p_description: requestData.description || null,
        p_phone: requestData.phone || null,
        p_email: requestData.email || null,
        p_website: requestData.website || null,
        p_address: requestData.address ? requestData.address : null,
        p_cuisine_type_id: requestData.cuisineTypeId || null,
      },
    );

    if (tenantError) {
      // Provide specific error messages for common issues
      if (tenantError.message.includes("duplicate key value violates unique constraint")) {
        if (tenantError.message.includes("restaurant_slug")) {
          throw new Error(`Restaurant slug "${requestData.slug}" is already taken. Please choose a different slug.`);
        }
        if (tenantError.message.includes("email")) {
          throw new Error(`Business email "${requestData.email}" is already registered. Please use a different email address.`);
        }
        throw new Error("This information is already registered. Please check your details and try again.");
      }

      if (tenantError.message.includes("foreign key")) {
        throw new Error("Invalid cuisine type selected. Please choose a valid cuisine type.");
      }

      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    logStep("Tenant created", { tenantId });

    // Update business hours if different from defaults
    const businessHoursToUpdate = requestData.businessHours.filter(
      (h) =>
        h.isOpen !== (h.dayOfWeek === 0 ? false : true) || // Sunday default is closed, others open
        h.openTime !== "09:00" ||
        h.closeTime !== (h.dayOfWeek >= 5 ? "23:00" : "22:00"), // Fri/Sat until 23:00, others 22:00
    );

    if (businessHoursToUpdate.length > 0) {
      for (const hours of businessHoursToUpdate) {
        const { error: hoursError } = await supabaseAdmin
          .from("business_hours")
          .update({
            is_open: hours.isOpen,
            open_time: hours.openTime,
            close_time: hours.closeTime,
          })
          .eq("tenant_id", tenantId)
          .eq("day_of_week", hours.dayOfWeek);

        if (hoursError) {
          logStep("Error updating business hours", hoursError);
        }
      }
      logStep("Business hours updated", { updatedCount: businessHoursToUpdate.length });
    }

    // Update party size config if different from defaults
    if (
      requestData.partySizeConfig.minPartySize !== 1 ||
      requestData.partySizeConfig.maxPartySize !== 12 ||
      requestData.partySizeConfig.defaultPartySize !== 2 ||
      !requestData.partySizeConfig.allowLargeParties ||
      requestData.partySizeConfig.largePartyThreshold !== 8
    ) {
      const { error: partySizeError } = await supabaseAdmin
        .from("party_size_configs")
        .update(requestData.partySizeConfig)
        .eq("tenant_id", tenantId);

      if (partySizeError) {
        logStep("Error updating party size config", partySizeError);
      } else {
        logStep("Party size config updated");
      }
    }

    // Create subscription record (placeholder for now)
    if (requestData.selectedPlanId) {
      try {
        const { error: subscriptionError } = await supabaseAdmin
          .from("subscriptions")
          .insert({
            tenant_id: tenantId,
            plan_id: requestData.selectedPlanId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + (requestData.billingCycle === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
            ).toISOString(),
          });

        if (subscriptionError) {
          logStep("Error creating subscription", subscriptionError);
          // Don't fail the whole process for subscription errors, just log
        } else {
          logStep("Subscription created");
        }
      } catch (subscriptionError) {
        logStep("Subscription creation failed (non-blocking)", subscriptionError);
      }
    }

    // Enable additional features based on selection
    if (requestData.enabledFeatures && Object.keys(requestData.enabledFeatures).length > 0) {
      try {
        const featuresToEnable = Object.entries(requestData.enabledFeatures)
          .filter(([, enabled]) => enabled)
          .map(([feature]) => ({
            tenant_id: tenantId,
            feature_key: feature,
            enabled: true,
            source: "provisioning",
          }));

        if (featuresToEnable.length > 0) {
          const { error: featuresError } = await supabaseAdmin
            .from("tenant_features")
            .insert(featuresToEnable);

          if (featuresError) {
            logStep("Error enabling features (non-blocking)", featuresError);
          } else {
            logStep("Features enabled", { count: featuresToEnable.length });
          }
        }
      } catch (featuresError) {
        logStep("Features setup failed (non-blocking)", featuresError);
      }
    }

    // Don't send email automatically - let user choose which email to send
    const emailStatus = "pending";

    return new Response(
      JSON.stringify({
        success: true,
        tenantId,
        ownerId: userData.user.id,
        emailStatus,
        provisioningData: {
          ownerName: `${requestData.ownerFirstName} ${requestData.ownerLastName}`,
          ownerEmail: requestData.ownerEmail,
          ownerPassword: requestData.ownerPassword,
          restaurantName: requestData.restaurantName,
          loginUrl: `${req.headers.get("origin") || "https://lovable.app"}/auth`,
        },
        message: `${requestData.restaurantName} has been successfully provisioned! You can now send welcome emails.`,
      }),
      { headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in provision-tenant", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" }, status: 500 },
    );
  }
});
