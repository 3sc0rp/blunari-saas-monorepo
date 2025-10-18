import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteStaffRequest {
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'OPS' | 'VIEWER';
  department_id?: string;
  metadata?: Record<string, unknown>;
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

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Missing authorization header", requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[invite-staff] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Invalid token", requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invoker has permission (must be SUPER_ADMIN or ADMIN)
    const { data: inviterEmployee, error: roleError } = await supabase
      .from("employees")
      .select("id, role, status")
      .eq("user_id", user.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (roleError) {
      console.error("[invite-staff] Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "PERMISSION_CHECK_FAILED", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!inviterEmployee || !["SUPER_ADMIN", "ADMIN"].includes(inviterEmployee.role)) {
      // Log unauthorized attempt
      await supabase.rpc("log_security_event", {
        p_event_type: "staff_invite_unauthorized",
        p_severity: "warning",
        p_user_id: user.id,
        p_employee_id: inviterEmployee?.id || null,
        p_event_data: { requestId, attemptedAction: "invite_staff" },
      }).catch(err => console.error("[invite-staff] Failed to log security event:", err));

      return new Response(
        JSON.stringify({ 
          error: "FORBIDDEN", 
          message: "Only SUPER_ADMIN or ADMIN can invite staff",
          requestId 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let body: InviteStaffRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "INVALID_JSON", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    const { email, role, department_id, metadata } = body;
    
    if (!email || !role) {
      return new Response(
        JSON.stringify({ 
          error: "VALIDATION_ERROR", 
          message: "email and role are required",
          requestId 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          error: "INVALID_EMAIL", 
          message: "Invalid email format",
          requestId 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'OPS', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ 
          error: "INVALID_ROLE", 
          message: `Role must be one of: ${validRoles.join(', ')}`,
          requestId 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only SUPER_ADMIN can invite other SUPER_ADMINs
    if (role === 'SUPER_ADMIN' && inviterEmployee.role !== 'SUPER_ADMIN') {
      return new Response(
        JSON.stringify({ 
          error: "FORBIDDEN", 
          message: "Only SUPER_ADMIN can invite other SUPER_ADMINs",
          requestId 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invitation already exists for this email
    // (We'll check for existing employee during invitation acceptance)

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("employee_invitations")
      .select("id, expires_at, accepted_at")
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ 
          error: "INVITATION_EXISTS", 
          message: "An active invitation already exists for this email",
          invitation_id: existingInvite.id,
          expires_at: existingInvite.expires_at,
          requestId 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure invitation token
    const invitationToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from("employee_invitations")
      .insert({
        email: email.toLowerCase(),
        role,
        department_id: department_id || null,
        invited_by: inviterEmployee.id,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error("[invite-staff] Failed to create invitation:", inviteError);
      return new Response(
        JSON.stringify({ 
          error: "INVITATION_FAILED", 
          message: inviteError.message,
          requestId 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log security event
    await supabase.rpc("log_security_event", {
      p_event_type: "staff_invited",
      p_severity: "info",
      p_user_id: user.id,
      p_employee_id: inviterEmployee.id,
      p_event_data: {
        requestId,
        invitedEmail: email,
        role,
        invitationId: invitation.id,
        expiresAt: expiresAt.toISOString(),
      },
    }).catch(err => console.error("[invite-staff] Failed to log security event:", err));

    // Generate invitation link
    const frontendUrl = Deno.env.get("ADMIN_DASHBOARD_URL") || "http://localhost:5173";
    const invitationLink = `${frontendUrl}/accept-invitation?token=${invitationToken}`;

    console.log(`[invite-staff] Invitation created for ${email}, link: ${invitationLink}`);

    // Get inviter name for email personalization
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', user.id)  // profiles table uses 'id' as the user reference
      .maybeSingle();

    const inviterName = inviterProfile?.first_name && inviterProfile?.last_name 
      ? `${inviterProfile.first_name} ${inviterProfile.last_name}` 
      : inviterProfile?.email || undefined;

    // TODO: Email functionality - will be added in next iteration
    // For now, invitation link is returned in response for manual distribution
    const emailSent = false;
    const emailError = "Email service not yet configured";
    console.log(`[invite-staff] Invitation created. Link: ${invitationLink}`);

    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expires_at: invitation.expires_at,
          invitation_link: invitationLink,
        },
        email_sent: emailSent,
        email_error: emailError,
        requestId,
        message: emailSent 
          ? "Invitation sent successfully via email" 
          : emailError 
          ? `Invitation created but email failed: ${emailError}` 
          : "Invitation created (email disabled)",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[invite-staff] Unexpected error:", error);
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

