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

    // === CRITICAL: ADMIN/TENANT SEPARATION ===
    // Admin users should NEVER have their credentials modified via tenant management!
    // Each tenant needs its own dedicated auth user (tenant owner)
    
    let tenantOwnerId: string | null = null;
    let ownerEmail: string | null = null;
    let tenantOwnerCreated = false;

    // Step 1: Get tenant information
    console.log(`[CREDENTIALS][${correlationId}] Looking up tenant ${tenantId}`);
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("email, name, owner_id")
      .eq("id", tenantId)
      .single();

    if (tenantError) {
      console.error(`[CREDENTIALS][${correlationId}] Failed to fetch tenant:`, tenantError);
      throw new Error(`Failed to fetch tenant: ${tenantError.message}`);
    }

    if (!tenant?.email) {
      throw new Error("Tenant has no email configured");
    }

    console.log(`[CREDENTIALS][${correlationId}] Tenant: ${tenant.name}, Email: ${tenant.email}, Owner ID: ${tenant.owner_id || 'NOT SET'}`);

    // Step 2: Check if tenant already has an owner_id
    if (tenant.owner_id) {
      console.log(`[CREDENTIALS][${correlationId}] Tenant has owner_id: ${tenant.owner_id}, verifying...`);
      
      try {
        const { data: ownerUser, error: ownerError } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_id);
        
        if (ownerError || !ownerUser?.user) {
          console.warn(`[CREDENTIALS][${correlationId}] owner_id points to non-existent user, will need new owner`);
          tenantOwnerId = null;
        } else {
          // Verify this owner is NOT an admin
          const { data: isOwnerAdmin } = await supabaseAdmin
            .from("employees")
            .select("id, role")
            .eq("user_id", tenant.owner_id)
            .eq("status", "ACTIVE")
            .maybeSingle();

          if (isOwnerAdmin) {
            console.error(`[CREDENTIALS][${correlationId}] ⚠️  CRITICAL: Tenant owner is an ADMIN user!`);
            throw new Error(
              `Tenant is incorrectly linked to admin user ${ownerUser.user.email}. ` +
              `Admin credentials cannot be modified via tenant management. ` +
              `Please create a separate auth user for this tenant owner.`
            );
          }

          tenantOwnerId = tenant.owner_id;
          ownerEmail = ownerUser.user.email;
          console.log(`[CREDENTIALS][${correlationId}] ✅ Valid tenant owner found: ${ownerEmail}`);
        }
      } catch (error: any) {
        console.warn(`[CREDENTIALS][${correlationId}] Error verifying owner:`, error.message);
        tenantOwnerId = null;
      }
    }

    // Step 3: If no valid owner, try auto_provisioning (but check it's not admin)
    if (!tenantOwnerId) {
      console.log(`[CREDENTIALS][${correlationId}] No owner_id, checking auto_provisioning...`);
      
      const { data: provisioning } = await supabaseAdmin
        .from("auto_provisioning")
        .select("user_id, status")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (provisioning?.user_id && provisioning.status?.toLowerCase() === 'completed') {
        // Verify this user is NOT an admin
        const { data: isProvisionedUserAdmin } = await supabaseAdmin
          .from("employees")
          .select("id, role")
          .eq("user_id", provisioning.user_id)
          .eq("status", "ACTIVE")
          .maybeSingle();

        if (isProvisionedUserAdmin) {
          console.warn(`[CREDENTIALS][${correlationId}] ⚠️  Auto-provisioning points to admin user - will create separate owner`);
        } else {
          // Valid non-admin user
          const { data: provisionedUser } = await supabaseAdmin.auth.admin.getUserById(provisioning.user_id);
          if (provisionedUser?.user) {
            tenantOwnerId = provisioning.user_id;
            ownerEmail = provisionedUser.user.email;
            console.log(`[CREDENTIALS][${correlationId}] ✅ Found owner via auto_provisioning: ${ownerEmail}`);
            
            // Update tenant.owner_id for future lookups
            await supabaseAdmin
              .from("tenants")
              .update({ owner_id: tenantOwnerId })
              .eq("id", tenantId);
          }
        }
      }
    }

    // Step 4: If still no owner, create a new dedicated auth user for this tenant
    if (!tenantOwnerId) {
      console.log(`[CREDENTIALS][${correlationId}] 🔧 No valid owner found - creating new tenant owner user`);
      
      // Generate a unique email if tenant email doesn't exist or matches an admin
      let newOwnerEmail = tenant.email;
      
      // Check if tenant email is already used by an admin
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .eq("email", tenant.email)
        .maybeSingle();

      if (existingProfile?.user_id) {
        const { data: isExistingAdmin } = await supabaseAdmin
          .from("employees")
          .select("id")
          .eq("user_id", existingProfile.user_id)
          .eq("status", "ACTIVE")
          .maybeSingle();

        if (isExistingAdmin) {
          // Tenant email matches admin - generate unique email
          newOwnerEmail = `tenant-${tenantId}@blunari-system.local`;
          console.log(`[CREDENTIALS][${correlationId}] Tenant email matches admin, using system email: ${newOwnerEmail}`);
        }
      }

      // Create new auth user for tenant owner
      const newPassword = generateSecurePassword();
      const { data: newOwner, error: createError } = await supabaseAdmin.auth.admin.createUser({
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

      if (createError || !newOwner?.user) {
        console.error(`[CREDENTIALS][${correlationId}] Failed to create tenant owner:`, createError);
        throw new Error(`Failed to create tenant owner: ${createError?.message || 'Unknown error'}`);
      }

      tenantOwnerId = newOwner.user.id;
      ownerEmail = newOwner.user.email;
      tenantOwnerCreated = true;

      console.log(`[CREDENTIALS][${correlationId}] ✅ Created new tenant owner: ${ownerEmail} (ID: ${tenantOwnerId})`);

      // Create profile for new owner
      const { error: profileInsertError } = await supabaseAdmin.from("profiles").insert({
        user_id: tenantOwnerId,
        email: ownerEmail,
        role: "tenant_owner",
      });

      if (profileInsertError) {
        console.error(`[CREDENTIALS][${correlationId}] Failed to create profile:`, profileInsertError);
        // Don't throw - profile creation might fail but owner was created
        console.warn(`[CREDENTIALS][${correlationId}] Warning: Profile creation failed but continuing with owner ID`);
      } else {
        console.log(`[CREDENTIALS][${correlationId}] ✅ Profile created for tenant owner`);
      }

      // Update tenant with owner_id
      await supabaseAdmin
        .from("tenants")
        .update({ owner_id: tenantOwnerId })
        .eq("id", tenantId);

      // Update auto_provisioning
      await supabaseAdmin
        .from("auto_provisioning")
        .upsert({
          user_id: tenantOwnerId,
          tenant_id: tenantId,
          restaurant_name: tenant.name,
          restaurant_slug: tenant.name.toLowerCase().replace(/\s+/g, '-'),
          status: "completed",
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "tenant_id",
        });

      console.log(`[CREDENTIALS][${correlationId}] ✅ Tenant owner setup complete`);
    }

    // Step 5: Final safety check - ensure we're NOT modifying an admin
    if (tenantOwnerId === user.id) {
      throw new Error(
        "CRITICAL: Cannot modify your own admin account via tenant management! " +
        "This indicates a configuration error."
      );
    }

    const { data: finalAdminCheck } = await supabaseAdmin
      .from("employees")
      .select("id, role")
      .eq("user_id", tenantOwnerId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (finalAdminCheck) {
      throw new Error(
        `CRITICAL: Cannot modify admin user (${ownerEmail}) via tenant management! ` +
        `This tenant needs a separate owner account.`
      );
    }

    console.log(`[CREDENTIALS][${correlationId}] ✅ Safety checks passed - tenant owner ID: ${tenantOwnerId}`);

    // If owner was just created, skip verification
    if (!tenantOwnerCreated) {
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
