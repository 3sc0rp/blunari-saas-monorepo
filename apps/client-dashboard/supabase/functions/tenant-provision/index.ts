import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TenantProvisionRequest {
  email: string;
  password: string;
  restaurant_name: string;
  restaurant_slug: string;
  timezone?: string;
  currency?: string;
  description?: string;
  phone?: string;
  website?: string;
  address?: any;
  cuisine_type_id?: string;
  admin_user_id?: string; // The admin who created this tenant
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const {
      email,
      password,
      restaurant_name,
      restaurant_slug,
      timezone = "America/New_York",
      currency = "USD",
      description,
      phone,
      website,
      address,
      cuisine_type_id,
      admin_user_id,
    }: TenantProvisionRequest = await req.json();

    console.log("Starting tenant provisioning for:", email, restaurant_name);

    // Step 1: Create user account if it doesn't exist
    let userId: string;

    // First check if user already exists
    const { data: existingUser, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (existingUser?.user) {
      userId = existingUser.user.id;
      console.log("User already exists:", userId);

      // Update password if provided
      if (password) {
        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        if (updateError) {
          console.error("Error updating password:", updateError);
          throw updateError;
        }
      }
    } else {
      // Create new user
      const { data: newUser, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email for admin-created accounts
          user_metadata: {
            created_by_admin: true,
            admin_user_id,
          },
        });

      if (createUserError) {
        console.error("Error creating user:", createUserError);
        throw createUserError;
      }

      userId = newUser.user!.id;
      console.log("Created new user:", userId);
    }

    // Step 2: Check if tenant already exists for this user
    const { data: existingProvisioning } = await supabaseAdmin
      .from("auto_provisioning")
      .select("tenant_id, status")
      .eq("user_id", userId)
      .eq("restaurant_slug", restaurant_slug)
      .single();

    if (existingProvisioning?.tenant_id) {
      console.log("Tenant already exists for user");
      return new Response(
        JSON.stringify({
          success: true,
          tenant_id: existingProvisioning.tenant_id,
          user_id: userId,
          message: "Tenant already exists",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Step 3: Create tenant using the existing function
    const { data: tenantId, error: provisionError } = await supabaseAdmin.rpc(
      "provision_tenant",
      {
        p_user_id: userId,
        p_restaurant_name: restaurant_name,
        p_restaurant_slug: restaurant_slug,
        p_timezone: timezone,
        p_currency: currency,
        p_description: description,
        p_phone: phone,
        p_email: email,
        p_website: website,
        p_address: address,
        p_cuisine_type_id: cuisine_type_id,
      },
    );

    if (provisionError) {
      console.error("Error provisioning tenant:", provisionError);
      throw provisionError;
    }

    console.log("Tenant provisioned successfully:", tenantId);

    // Step 4: Create profile entry if it doesn't exist
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email: email,
        first_name: restaurant_name.split(" ")[0] || "Restaurant",
        last_name: "Owner",
      },
      {
        onConflict: "id",
      },
    );

    if (profileError) {
      console.warn("Profile creation warning:", profileError);
      // Don't fail the whole process for profile errors
    }

    // Step 5: Log the provisioning event
    await supabaseAdmin.from("activity_feed").insert({
      activity_type: "tenant_provisioned",
      message: `New restaurant "${restaurant_name}" provisioned`,
      service_name: "tenant-provision",
      status: "success",
      user_id: admin_user_id || userId,
      details: {
        tenant_id: tenantId,
        restaurant_name,
        restaurant_slug,
        created_by_admin: !!admin_user_id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenantId,
        user_id: userId,
        restaurant_slug,
        message: "Tenant provisioned successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Tenant provisioning error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
