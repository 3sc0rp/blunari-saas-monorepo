import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Edge Function: Fix Tenant Owner User
 * 
 * Creates a new dedicated auth user for a tenant that's sharing an owner with others.
 * This fixes the production issue where multiple tenants share the same owner account.
 * 
 * Request body:
 * {
 *   tenantId: string;          // UUID of tenant to fix
 *   newOwnerEmail: string;     // New unique email for tenant owner
 * }
 */

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: employee } = await supabase
      .from("employees")
      .select("role, status")
      .eq("user_id", user.id)
      .single();

    if (!employee || !["SUPER_ADMIN", "ADMIN"].includes(employee.role) || employee.status !== "ACTIVE") {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { tenantId, newOwnerEmail } = await req.json();

    if (!tenantId || !newOwnerEmail) {
      return new Response(JSON.stringify({ error: "Missing tenantId or newOwnerEmail" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[FIX-OWNER] Fixing tenant ${tenantId} with new owner email: ${newOwnerEmail}`);

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, slug, owner_id, email")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if new email already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email === newOwnerEmail);
    
    if (emailExists) {
      return new Response(JSON.stringify({ 
        error: `Email ${newOwnerEmail} is already registered. Please use a different email.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate secure password
    const generatePassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+';
      let password = '';
      for (let i = 0; i < 16; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }
      return password;
    };

    const newPassword = generatePassword();

    // Create new auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: newOwnerEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        is_tenant_owner: true,
        tenant_id: tenantId,
        tenant_name: tenant.name,
        created_by: user.email,
        created_at: new Date().toISOString(),
      },
    });

    if (createError || !newUser?.user) {
      console.error("[FIX-OWNER] Failed to create user:", createError);
      return new Response(JSON.stringify({ error: `Failed to create user: ${createError?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUser.user.id;
    console.log(`[FIX-OWNER] Created new user: ${newUserId}`);

    // Update tenant owner_id
    const { error: updateTenantError } = await supabase
      .from("tenants")
      .update({ owner_id: newUserId, updated_at: new Date().toISOString() })
      .eq("id", tenantId);

    if (updateTenantError) {
      console.error("[FIX-OWNER] Failed to update tenant:", updateTenantError);
      // Try to delete the created user to clean up
      await supabase.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: "Failed to update tenant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create/update profile
    await supabase.from("profiles").upsert({
      user_id: newUserId,
      email: newOwnerEmail,
      role: "owner",
      first_name: tenant.name + " Owner",
    });

    // Update auto_provisioning
    await supabase.from("auto_provisioning").update({
      user_id: newUserId,
      login_email: newOwnerEmail,
    }).eq("tenant_id", tenantId);

    console.log(`[FIX-OWNER] Successfully fixed tenant ${tenant.name}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Tenant owner fixed successfully",
      tenant: {
        id: tenantId,
        name: tenant.name,
        slug: tenant.slug,
      },
      newOwner: {
        userId: newUserId,
        email: newOwnerEmail,
        temporaryPassword: newPassword,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[FIX-OWNER] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
