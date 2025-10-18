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
  const start = Date.now();
  const correlationId = crypto.randomUUID();
  // Ensure correlation id propagates via logs for multi-line tracing
  console.log(`[CREDENTIALS][${correlationId}] Incoming request`);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, action, newEmail, newPassword }: CredentialUpdateRequest =
      await req.json();

  console.log(`[CREDENTIALS][${correlationId}] Starting ${action} for tenant ${tenantId}`);
  console.log(`[CREDENTIALS][${correlationId}] Request body:`, { tenantId, action, hasNewEmail: !!newEmail, hasNewPassword: !!newPassword });

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

  console.log(`[CREDENTIALS][${correlationId}] User ${user.email} attempting ${action}`);

    // Check if user has admin privileges - check both employee role and profile role
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("role")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    // Also check profiles table for role
    // IMPORTANT: profiles are linked to auth users via user_id (NOT id)
    const { data: profile, error: profileRoleError } = await supabaseAdmin
      .from("profiles")
      .select("role, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileRoleError) {
      console.warn(`[CREDENTIALS] Profile role lookup warning:`, profileRoleError);
    }

    const userRole = employee?.role || profile?.role;
    const hasAdminAccess =
      (employee && ["SUPER_ADMIN", "ADMIN", "SUPPORT"].includes(employee.role)) ||
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
      `[CREDENTIALS][${correlationId}] User has access. Employee role: ${employee?.role}, Profile role: ${profile?.role}`,
    );

    // Get tenant owner user ID - try auto_provisioning first, then fallback to tenant email
    let tenantOwnerId: string | null = null;
    let ownerEmail: string | null = null;

    // First try to get from auto_provisioning
    const { data: provisioning, error: provisioningError } = await supabaseAdmin
      .from("auto_provisioning")
      .select("user_id, status")
      .eq("tenant_id", tenantId)
      // Status comparison made case-insensitive by fetching then checking (DB may store uppercase)
      .maybeSingle();

    if (provisioningError) {
      console.warn(`[CREDENTIALS] Provisioning lookup warning:`, provisioningError);
    }

    if (provisioning && (provisioning.status?.toLowerCase?.() === 'completed')) {
      tenantOwnerId = provisioning.user_id;
      console.log(
        `[CREDENTIALS][${correlationId}] Found provisioning record for user ${tenantOwnerId}`,
      );
    } else if (provisioning) {
      console.log(`[CREDENTIALS] Provisioning record found but status='${provisioning.status}' (expect completed) – falling back to email lookup.`);
    } else {
  console.log(`[CREDENTIALS][${correlationId}] No provisioning record found, looking up user by tenant email...`);
      
      // Fallback: look for tenant email and find matching user
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .select("email")
        .eq("id", tenantId)
        .single();

      if (tenantError) {
        console.error(`[CREDENTIALS][${correlationId}] Failed to fetch tenant:`, tenantError);
        throw new Error(`Failed to fetch tenant: ${tenantError.message}`);
      }

      if (!tenant?.email) {
        console.error(`[CREDENTIALS] Tenant has no email`);
        throw new Error(
          "No tenant owner found. Tenant has no email and no provisioning record.",
        );
      }

  console.log(`[CREDENTIALS][${correlationId}] Looking up user by email: ${tenant.email}`);

      // Find user ID from profiles table (faster than auth API)
      const { data: profileData, error: profileLookupError } = await supabaseAdmin
        .from("profiles")
        .select("id, user_id, email")
        .eq("email", tenant.email)
        .maybeSingle();
      
      if (profileLookupError) {
        console.error(`[CREDENTIALS][${correlationId}] Profile lookup failed:`, profileLookupError);
        throw new Error(`Failed to lookup user profile: ${profileLookupError.message}`);
      }
      
      if (!profileData) {
        console.error(`[CREDENTIALS][${correlationId}] No profile found with email ${tenant.email}`);
        throw new Error(`No user found with email ${tenant.email}. User may need to complete account setup first.`);
      }

      console.log(`[CREDENTIALS][${correlationId}] Profile found:`, { 
        id: profileData.id, 
        user_id: profileData.user_id, 
        email: profileData.email 
      });

      // Must have user_id (auth.users FK) – if missing, treat as data integrity issue
      if (!profileData.user_id) {
        console.error(`[CREDENTIALS][${correlationId}] Profile has NULL user_id. Data integrity issue – requires manual fix.`);
        throw new Error("Profile has NULL user_id. Link profile to auth user before credential changes.");
      }
      tenantOwnerId = profileData.user_id;
      console.log(`[CREDENTIALS][${correlationId}] Using user_id: ${tenantOwnerId}`);
      
      ownerEmail = tenant.email;
      console.log(
        `[CREDENTIALS][${correlationId}] Found tenant owner via profile lookup: ${ownerEmail} (ID: ${tenantOwnerId})`,
      );
    }

    if (!tenantOwnerId) {
      throw new Error("Could not determine tenant owner");
    }

  console.log(`[CREDENTIALS][${correlationId}] Tenant owner ID determined: ${tenantOwnerId}`);
    
    // Verify the user exists before attempting update (optional - don't fail if verification fails)
    try {
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(tenantOwnerId);
      if (getUserError) {
        console.warn(`[CREDENTIALS][${correlationId}] User lookup warning:`, getUserError);
      } else if (!existingUser || !existingUser.user) {
        console.warn(`[CREDENTIALS][${correlationId}] User not found in verification, will attempt update anyway`);
      } else {
        console.log(`[CREDENTIALS][${correlationId}] User verified: ${existingUser.user.email}`);
      }
    } catch (verifyError: any) {
      console.warn(`[CREDENTIALS][${correlationId}] User verification failed (non-critical):`, verifyError);
      // Continue anyway - the actual update will fail if user doesn't exist
    }

    let result: any = {};

    switch (action) {
      case "update_email":
        if (!newEmail) throw new Error("New email required");

  console.log(`[CREDENTIALS][${correlationId}] Updating email from auth.users for user ${tenantOwnerId}`);
        
        // Update user email in Supabase Auth
        const { error: emailError } =
          await supabaseAdmin.auth.admin.updateUserById(tenantOwnerId, {
            email: newEmail,
          });

        if (emailError) {
          console.error(`[CREDENTIALS][${correlationId}] Auth email update failed:`, emailError);
          throw new Error(`Failed to update email in auth: ${emailError.message}`);
        }

        console.log(`[CREDENTIALS][${correlationId}] Updating email in profiles table`);
        
        // Update profiles table - use user_id since that's what tenantOwnerId is
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ email: newEmail })
          .eq("user_id", tenantOwnerId);

        if (profileError) {
          console.error(`[CREDENTIALS][${correlationId}] Profile email update failed:`, profileError);
          // Don't fail - profile might not exist or update might not be critical
          console.warn(`[CREDENTIALS][${correlationId}] Warning: Could not update profile email: ${profileError.message}`);
        } else {
          console.log(`[CREDENTIALS][${correlationId}] Profile email updated successfully`);
        }

        console.log(`[CREDENTIALS][${correlationId}] Updating email in tenants table`);
        
        // Update tenant email if this is the owner
        const { error: tenantError } = await supabaseAdmin
          .from("tenants")
          .update({ email: newEmail })
          .eq("id", tenantId);

        if (tenantError) {
          console.error(`[CREDENTIALS][${correlationId}] Tenant email update failed:`, tenantError);
          console.warn(`[CREDENTIALS][${correlationId}] Warning: Could not update tenant email: ${tenantError.message}`);
        }

        console.log(`[CREDENTIALS][${correlationId}] Email update completed successfully`);
        result = { message: "Email updated successfully", newEmail };
        break;

      case "update_password":
        if (!newPassword) throw new Error("New password required");

  console.log(`[CREDENTIALS][${correlationId}] Updating password for user ${tenantOwnerId}`);
        
        const { error: passwordError } =
          await supabaseAdmin.auth.admin.updateUserById(tenantOwnerId, {
            password: newPassword,
          });

        if (passwordError) {
          console.error(`[CREDENTIALS][${correlationId}] Password update failed:`, passwordError);
          throw new Error(`Failed to update password: ${passwordError.message}`);
        }

        console.log(`[CREDENTIALS][${correlationId}] Password updated successfully`);
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
        const { data: userProfile, error: resetProfileError } = await supabaseAdmin
          .from("profiles")
          .select("email, user_id")
          .eq("user_id", tenantOwnerId)
          .maybeSingle();

        if (resetProfileError) {
          console.error(`[CREDENTIALS][${correlationId}] Password reset profile lookup failed:`, resetProfileError);
          throw new Error(`Failed to lookup user profile for reset: ${resetProfileError.message}`);
        }

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
      console.warn(`[CREDENTIALS][${correlationId}] Failed to log security event:`, auditError);
      // Don't fail the request if audit logging fails
    }

    console.log(
      `[CREDENTIALS][${correlationId}] Credential action completed: ${action} for tenant ${tenantId} by ${user.email} in ${Date.now() - start}ms`,
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
  console.error(`[CREDENTIALS][${correlationId}] Error in manage-tenant-credentials:`, error);
  console.error(`[CREDENTIALS][${correlationId}] Error stack:`, error.stack);
    
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
    } else if (error.message?.includes('duplicate key value') || error.message?.toLowerCase().includes('unique constraint')) {
      status = 409; // Conflict for duplicate email
    }
    
  console.error(`[CREDENTIALS][${correlationId}] Returning ${status} error: ${errorMessage} (elapsed ${Date.now() - start}ms)`);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.details || null,
      hint: error.hint || null,
      correlation_id: correlationId
    }), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
