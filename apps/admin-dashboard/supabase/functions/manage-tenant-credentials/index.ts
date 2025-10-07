import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CredentialUpdateRequest {
  tenantId: string;
  action:
    | "update_email"
    | "update_password"
    | "generate_password"
    | "reset_password";
  newEmail?: string;
  newPassword?: string;
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const generateSecurePassword = (): string => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, action, newEmail, newPassword }: CredentialUpdateRequest =
      await req.json();

    console.log(`[CREDENTIALS] Starting ${action} for tenant ${tenantId}`);
    console.log(`[CREDENTIALS] Request body:`, { tenantId, action, hasNewEmail: !!newEmail, hasNewPassword: !!newPassword });

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error("Unauthorized");
    }

    console.log(`[CREDENTIALS] User ${user.email} attempting ${action}`);

    // Check if user has admin privileges - check both employee role and profile role
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("role")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    // Also check profiles table for role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = employee?.role || profile?.role;
    const hasAdminAccess =
      (employee &&
        ["SUPER_ADMIN", "ADMIN", "SUPPORT"].includes(employee.role)) ||
      (profile && ["owner", "admin"].includes(profile.role));

    if (!hasAdminAccess) {
      console.error(
        "Insufficient privileges. Employee role:",
        employee?.role,
        "Profile role:",
        profile?.role,
      );
      throw new Error("Insufficient privileges");
    }

    console.log(
      `[CREDENTIALS] User has access. Employee role: ${employee?.role}, Profile role: ${profile?.role}`,
    );

    // Get tenant owner user ID - try auto_provisioning first, then fallback to tenant email
    let tenantOwnerId: string | null = null;
    let ownerEmail: string | null = null;

    // First try to get from auto_provisioning
    const { data: provisioning } = await supabaseAdmin
      .from("auto_provisioning")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .maybeSingle();

    if (provisioning) {
      tenantOwnerId = provisioning.user_id;
      console.log(
        `[CREDENTIALS] Found provisioning record for user ${tenantOwnerId}`,
      );
    } else {
      // Fallback: look for tenant email and find matching user
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("email")
        .eq("id", tenantId)
        .single();

      if (!tenant?.email) {
        throw new Error(
          "No tenant owner found. Tenant has no email and no provisioning record.",
        );
      }

      // Find user by email
      const { data: authUser, error: userError } =
        await supabaseAdmin.auth.admin.listUsers();
      if (userError) throw userError;

      const matchingUser = authUser.users.find((u) => u.email === tenant.email);
      if (!matchingUser) {
        throw new Error(`No user found with email ${tenant.email}`);
      }

      tenantOwnerId = matchingUser.id;
      ownerEmail = tenant.email;
      console.log(
        `[CREDENTIALS] Found tenant owner via email lookup: ${ownerEmail}`,
      );
    }

    if (!tenantOwnerId) {
      throw new Error("Could not determine tenant owner");
    }

    console.log(`[CREDENTIALS] Tenant owner ID determined: ${tenantOwnerId}`);
    
    // Verify the user exists before attempting update
    try {
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(tenantOwnerId);
      if (getUserError || !existingUser) {
        console.error(`[CREDENTIALS] User not found:`, getUserError);
        throw new Error(`User with ID ${tenantOwnerId} not found in auth system`);
      }
      console.log(`[CREDENTIALS] User verified: ${existingUser.user.email}`);
    } catch (verifyError: any) {
      console.error(`[CREDENTIALS] User verification failed:`, verifyError);
      throw new Error(`Failed to verify user exists: ${verifyError.message}`);
    }

    let result: any = {};

    switch (action) {
      case "update_email":
        if (!newEmail) throw new Error("New email required");

        console.log(`[CREDENTIALS] Updating email from auth.users for user ${tenantOwnerId}`);
        
        // Update user email in Supabase Auth
        const { error: emailError } =
          await supabaseAdmin.auth.admin.updateUserById(tenantOwnerId, {
            email: newEmail,
          });

        if (emailError) {
          console.error(`[CREDENTIALS] Auth email update failed:`, emailError);
          throw new Error(`Failed to update email in auth: ${emailError.message}`);
        }

        console.log(`[CREDENTIALS] Updating email in profiles table`);
        
        // Update profiles table
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ email: newEmail })
          .eq("id", tenantOwnerId);

        if (profileError) {
          console.error(`[CREDENTIALS] Profile email update failed:`, profileError);
          // Don't fail - profile might not exist or update might not be critical
          console.warn(`Warning: Could not update profile email: ${profileError.message}`);
        }

        console.log(`[CREDENTIALS] Updating email in tenants table`);
        
        // Update tenant email if this is the owner
        const { error: tenantError } = await supabaseAdmin
          .from("tenants")
          .update({ email: newEmail })
          .eq("id", tenantId);

        if (tenantError) {
          console.error(`[CREDENTIALS] Tenant email update failed:`, tenantError);
          console.warn(`Warning: Could not update tenant email: ${tenantError.message}`);
        }

        console.log(`[CREDENTIALS] Email update completed successfully`);
        result = { message: "Email updated successfully", newEmail };
        break;

      case "update_password":
        if (!newPassword) throw new Error("New password required");

        console.log(`[CREDENTIALS] Updating password for user ${tenantOwnerId}`);
        
        const { error: passwordError } =
          await supabaseAdmin.auth.admin.updateUserById(tenantOwnerId, {
            password: newPassword,
          });

        if (passwordError) {
          console.error(`[CREDENTIALS] Password update failed:`, passwordError);
          throw new Error(`Failed to update password: ${passwordError.message}`);
        }

        console.log(`[CREDENTIALS] Password updated successfully`);
        result = { message: "Password updated successfully" };
        break;

      case "generate_password":
        const generatedPassword = generateSecurePassword();

        const { error: genError } =
          await supabaseAdmin.auth.admin.updateUserById(tenantOwnerId, {
            password: generatedPassword,
          });

        if (genError) throw genError;

        result = {
          message: "New password generated successfully",
          newPassword: generatedPassword,
        };
        break;

      case "reset_password":
        // Get user email first
        const { data: userProfile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", tenantOwnerId)
          .single();

        if (!userProfile?.email) throw new Error("User email not found");

        const { error: resetError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: userProfile.email,
          });

        if (resetError) throw resetError;

        result = { message: "Password reset email sent successfully" };
        break;

      default:
        throw new Error("Invalid action");
    }

    // Log the action for audit purposes (non-blocking)
    try {
      await supabaseAdmin.from("security_events").insert({
        event_type: "credential_change",
        severity: "high",
        user_id: tenantOwnerId,
        event_data: {
          action,
          tenant_id: tenantId,
          changed_by: user.id,
          changed_by_email: user.email,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditError) {
      console.warn("Failed to log security event:", auditError);
      // Don't fail the request if audit logging fails
    }

    console.log(
      `Credential action completed: ${action} for tenant ${tenantId} by ${user.email}`,
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[CREDENTIALS] Error in manage-tenant-credentials:", error);
    console.error("[CREDENTIALS] Error stack:", error.stack);
    
    // Determine appropriate status code
    let status = 500;
    let errorMessage = error.message || 'An error occurred';
    
    if (error.message?.includes('Unauthorized') || error.message?.includes('authorization')) {
      status = 401;
    } else if (error.message?.includes('Insufficient privileges')) {
      status = 403;
    } else if (error.message?.includes('not found') || error.message?.includes('No tenant owner')) {
      status = 404;
    } else if (error.message?.includes('required') || error.message?.includes('Invalid')) {
      status = 400;
    }
    
    console.error(`[CREDENTIALS] Returning ${status} error: ${errorMessage}`);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.details || null,
      hint: error.hint || null
    }), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
