import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInvitationRequest {
  token: string;
  password?: string; // For new users who need to set password
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "METHOD_NOT_ALLOWED", requestId }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let body: AcceptInvitationRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "INVALID_JSON", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, password } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ 
          error: "VALIDATION_ERROR", 
          message: "token is required",
          requestId 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from("employee_invitations")
      .select("*")
      .eq("invitation_token", token)
      .maybeSingle();

    if (inviteError) {
      console.error("[accept-invitation] Query error:", inviteError);
      return new Response(
        JSON.stringify({ error: "QUERY_ERROR", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!invitation) {
      return new Response(
        JSON.stringify({ 
          error: "INVALID_TOKEN", 
          message: "Invitation not found or token invalid",
          requestId 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return new Response(
        JSON.stringify({ 
          error: "ALREADY_ACCEPTED", 
          message: "This invitation has already been accepted",
          accepted_at: invitation.accepted_at,
          requestId 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          error: "INVITATION_EXPIRED", 
          message: "This invitation has expired",
          expired_at: invitation.expires_at,
          requestId 
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingAuthUser } = await supabase.auth.admin.getUserByEmail(invitation.email);

    let userId: string;
    let isNewUser = false;

    if (existingAuthUser?.user) {
      // User exists in auth.users
      userId = existingAuthUser.user.id;

      // Check if already an employee
      const { data: existingEmployee } = await supabase
        .from("employees")
        .select("id, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingEmployee) {
        return new Response(
          JSON.stringify({ 
            error: "ALREADY_EMPLOYEE", 
            message: "User is already a staff member",
            status: existingEmployee.status,
            requestId 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new user
      if (!password || password.length < 8) {
        return new Response(
          JSON.stringify({ 
            error: "PASSWORD_REQUIRED", 
            message: "Password is required for new users (minimum 8 characters)",
            requestId 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true, // Auto-confirm since they have invitation token
      });

      if (createError || !newUser.user) {
        console.error("[accept-invitation] Failed to create user:", createError);
        return new Response(
          JSON.stringify({ 
            error: "USER_CREATION_FAILED", 
            message: createError?.message || "Failed to create user account",
            requestId 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;
    }

    // Generate employee ID
    const employeeId = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create employee record
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .insert({
        user_id: userId,
        employee_id: employeeId,
        role: invitation.role,
        status: "ACTIVE",
        department_id: invitation.department_id,
        hire_date: new Date().toISOString().split('T')[0],
        permissions: {},
        metadata: {
          invited_by: invitation.invited_by,
          accepted_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (employeeError) {
      console.error("[accept-invitation] Failed to create employee:", employeeError);
      
      // Clean up user if we just created them
      if (isNewUser) {
        await supabase.auth.admin.deleteUser(userId).catch(err => 
          console.error("[accept-invitation] Failed to cleanup user:", err)
        );
      }

      return new Response(
        JSON.stringify({ 
          error: "EMPLOYEE_CREATION_FAILED", 
          message: employeeError.message,
          requestId 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from("employee_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("[accept-invitation] Failed to update invitation:", updateError);
      // Non-fatal, continue
    }

    // Log security event
    await supabase.rpc("log_security_event", {
      p_event_type: "staff_invitation_accepted",
      p_severity: "info",
      p_user_id: userId,
      p_employee_id: employee.id,
      p_event_data: {
        requestId,
        invitationId: invitation.id,
        role: invitation.role,
        isNewUser,
      },
    }).catch(err => console.error("[accept-invitation] Failed to log security event:", err));

    // Log initial activity
    await supabase.rpc("log_employee_activity", {
      p_action: "account_created",
      p_resource_type: "employee",
      p_resource_id: employee.id,
      p_details: {
        via: "invitation",
        invitationId: invitation.id,
        role: invitation.role,
      },
    }).catch(err => console.error("[accept-invitation] Failed to log activity:", err));

    console.log(`[accept-invitation] Successfully created employee for ${invitation.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        employee: {
          id: employee.id,
          employee_id: employee.employee_id,
          role: employee.role,
          email: invitation.email,
        },
        is_new_user: isNewUser,
        requestId,
        message: "Invitation accepted successfully. You can now sign in.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[accept-invitation] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "INTERNAL_ERROR", 
        message: error instanceof Error ? error.message : "Unknown error",
        requestId 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

