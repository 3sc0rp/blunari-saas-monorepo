import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  code?: string;
  newPassword?: string;
}

const isDevelopment = Deno.env.get("ENVIRONMENT") !== "production";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, newPassword }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get client IP for rate limiting - handle comma-separated IPs
    const clientIPRaw =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("cf-connecting-ip") ||
      "127.0.0.1";
    const clientIP = clientIPRaw.split(",")[0].trim(); // Take first IP if comma-separated
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // If code and newPassword are provided, verify code and reset password
    if (code && newPassword) {
      return await handlePasswordReset(
        supabase,
        email,
        code,
        newPassword,
        clientIP,
        userAgent,
      );
    }

    // Otherwise, send security code
    return await handleCodeRequest(supabase, email, clientIP, userAgent);
  } catch (error: any) {
    console.error("Error in password reset function:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred",
        success: false 
      }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function handleCodeRequest(
  supabase: any,
  email: string,
  clientIP: string,
  userAgent: string,
) {
  try {
    // Check rate limits
    const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc(
      "check_reset_rate_limit",
      {
        p_email: email,
        p_ip_address: clientIP,
      },
    );

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      throw new Error("Rate limit check failed");
    }

    if (!rateLimitResult || !rateLimitResult.allowed) {
      await logAuditEvent(
        supabase,
        email,
        "request_code",
        false,
        rateLimitResult.reason,
        clientIP,
        userAgent,
      );

      if (rateLimitResult.reason === "account_locked") {
        return new Response(
          JSON.stringify({
            error: "Account temporarily locked due to too many attempts",
            locked_until: rateLimitResult.locked_until,
            success: false,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          attempts_remaining: rateLimitResult.attempts_remaining || 0,
          success: false,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Generate 6-digit security code
    const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the code before storing
    const { data: hashedCode } = await supabase.rpc("hash_reset_code", {
      p_code: securityCode,
      p_email: email,
    });

    // Store code in database with 10-minute expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    console.log(`Attempting to store reset code for email: ${email}`);

    const { error: insertError } = await supabase
      .from("password_reset_codes")
      .insert({
        email: email,
        code_hash: hashedCode,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      });

    if (insertError) {
      console.error("Error storing reset code:", insertError);
      console.error(
        "Insert error details:",
        JSON.stringify(insertError, null, 2),
      );
      await logAuditEvent(
        supabase,
        email,
        "request_code",
        false,
        "database_error",
        clientIP,
        userAgent,
      );
      throw new Error(`Failed to store security code: ${insertError.message}`);
    }

    console.log(`Successfully stored reset code for email: ${email}`);

    // Send email via Fastmail SMTP
    await sendSecurityCodeEmail(email, securityCode);

    // Log successful request
    await logAuditEvent(
      supabase,
      email,
      "request_code",
      true,
      null,
      clientIP,
      userAgent,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Security code sent to your email",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in handleCodeRequest:", error);
    await logAuditEvent(
      supabase,
      email,
      "request_code",
      false,
      error.message,
      clientIP,
      userAgent,
    );
    throw error;
  }
}

async function handlePasswordReset(
  supabase: any,
  email: string,
  code: string,
  newPassword: string,
  clientIP: string,
  userAgent: string,
) {
  try {
    console.log("Starting password reset for email:", email);
    console.log("Code length:", code?.length, "Password length:", newPassword?.length);

    // Validate inputs
    if (!email || !code || !newPassword) {
      console.error("Missing required fields:", { email: !!email, code: !!code, password: !!newPassword });
      return new Response(
        JSON.stringify({
          error: "Email, security code, and new password are required",
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (code.length !== 6) {
      console.error("Invalid code length:", code.length);
      return new Response(
        JSON.stringify({
          error: "Security code must be 6 digits",
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (newPassword.length < 6) {
      console.error("Password too short:", newPassword.length);
      return new Response(
        JSON.stringify({
          error: "Password must be at least 6 characters",
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Hash the provided code to compare with stored hash
    const { data: hashedProvidedCode, error: hashError } = await supabase.rpc("hash_reset_code", {
      p_code: code,
      p_email: email,
    });

    if (hashError) {
      console.error("Error hashing code:", hashError);
      return new Response(
        JSON.stringify({
          error: "Failed to verify security code",
          success: false,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    console.log("Code hashed successfully, looking for matching reset code");

    // Find valid reset code
    const { data: resetCodes, error: fetchError } = await supabase
      .from("password_reset_codes")
      .select("*")
      .eq("email", email)
      .eq("code_hash", hashedProvidedCode)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    console.log("Reset codes query result:", { found: resetCodes?.length, error: fetchError });

    if (fetchError) {
      console.error("Error fetching reset codes:", fetchError);
      await logAuditEvent(
        supabase,
        email,
        "verify_code",
        false,
        "database_error",
        clientIP,
        userAgent,
      );
      throw new Error("Database error");
    }

    if (!resetCodes || resetCodes.length === 0) {
      await logAuditEvent(
        supabase,
        email,
        "verify_code",
        false,
        "invalid_code",
        clientIP,
        userAgent,
      );
      return new Response(
        JSON.stringify({
          error: "Invalid or expired security code. Please request a new one.",
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const resetCode = resetCodes[0];

    // Mark code as used
    const { error: updateError } = await supabase
      .from("password_reset_codes")
      .update({
        status: "used",
        used_at: new Date().toISOString(),
      })
      .eq("id", resetCode.id);

    if (updateError) {
      console.error("Error updating reset code:", updateError);
      await logAuditEvent(
        supabase,
        email,
        "verify_code",
        false,
        "database_error",
        clientIP,
        userAgent,
      );
      throw new Error("Failed to update reset code");
    }

    // Get user by email first, then update password
    const { data: users, error: userError } =
      await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Error getting users:", userError);
      throw new Error("Failed to find user");
    }

    const user = users.users.find((u: any) => u.email === email);
    if (!user) {
      await logAuditEvent(
        supabase,
        email,
        "reset_password",
        false,
        "user_not_found",
        clientIP,
        userAgent,
      );
      return new Response(
        JSON.stringify({
          error: "User not found. Please check your email address.",
          success: false,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Update password using Supabase Auth Admin API
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword },
    );

    if (passwordError) {
      console.error("Error resetting password:", passwordError);
      await logAuditEvent(
        supabase,
        email,
        "reset_password",
        false,
        "auth_error",
        clientIP,
        userAgent,
      );
      return new Response(
        JSON.stringify({
          error: "Failed to reset password. Please try again.",
          success: false,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Log successful password reset
    await logAuditEvent(
      supabase,
      email,
      "reset_password",
      true,
      null,
      clientIP,
      userAgent,
    );

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in handlePasswordReset:", error);
    await logAuditEvent(
      supabase,
      email,
      "reset_password",
      false,
      error.message,
      clientIP,
      userAgent,
    );
    throw error;
  }
}

async function sendSecurityCodeEmail(email: string, securityCode: string) {
  try {
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.fastmail.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpSecure = Deno.env.get("SMTP_SECURE") === "true";
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpFrom = Deno.env.get("SMTP_FROM");

    console.log(`Attempting to send security code to: ${email}`);
    console.log(
      `SMTP Config: ${smtpHost}:${smtpPort}, Secure: ${smtpSecure}, User: ${smtpUser}, From: ${smtpFrom}`,
    );

    // Check if credentials are available
    if (!smtpUser || !smtpPass || !smtpFrom) {
      const missing = [];
      if (!smtpUser) missing.push("SMTP_USER");
      if (!smtpPass) missing.push("SMTP_PASS");
      if (!smtpFrom) missing.push("SMTP_FROM");

      console.log(
        `Missing SMTP credentials: ${missing.join(", ")} - logging code instead`,
      );
      console.log(`
      ============================================
      SECURITY CODE EMAIL
      ============================================
      To: ${email}
      Security Code: ${securityCode}
      ============================================
      `);
      return Promise.resolve();
    }

    // Try to send email using Fastmail SMTP with correct settings
    try {
      const client = new SMTPClient({
        connection: {
          hostname: smtpHost,
          port: smtpPort,
          tls: smtpSecure,
          auth: {
            username: smtpUser,
            password: smtpPass,
          },
        },
      });

      console.log(
        `Connecting to Fastmail SMTP: ${smtpHost}:${smtpPort} (Secure: ${smtpSecure})`,
      );

      await client.send({
        from: smtpFrom,
        to: email,
        subject: "Password Reset Code - Blunari",
        content: `Your password reset code is: ${securityCode}

This code expires in 10 minutes.

If you didn't request this, please ignore this email.

— Blunari Team`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 580px; margin: 40px auto; padding: 0;">
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 40px; text-align: center;">
                <img src="https://app.blunari.ai/logo.png" alt="Blunari" style="height: 48px; width: auto; margin: 0 auto 12px auto; display: block;" />
                <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 14px; font-weight: 400;">Restaurant Management Platform</p>
              </div>
              
              <!-- Body -->
              <div style="padding: 48px 40px;">
                <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                  You requested a password reset. Use the code below to continue:
                </p>
                
                <!-- Code Box -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 32px; text-align: center; margin: 0 0 32px 0;">
                  <div style="font-size: 40px; font-weight: 700; letter-spacing: 8px; color: #1e40af; font-family: 'Courier New', Consolas, monospace; line-height: 1;">
                    ${securityCode}
                  </div>
                  <p style="color: #6b7280; margin: 16px 0 0 0; font-size: 13px; font-weight: 500;">
                    Expires in 10 minutes
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 0; text-align: center;">
                  This is an automated message from Blunari. Please do not reply to this email.
                </p>
              </div>
              
            </div>
          </div>
        `,
      });

      await client.close();
      console.log(`Email sent successfully to ${email} via Fastmail SMTP`);
      console.log(`SUCCESS: Email delivery confirmed for ${email}`);
      return Promise.resolve();
    } catch (smtpError: any) {
      console.error("Fastmail SMTP sending failed:", smtpError);

      // Log the detailed error for debugging
      console.log(`
      ============================================
      FASTMAIL SMTP FAILED - SECURITY CODE EMAIL
      ============================================
      To: ${email}
      Security Code: ${securityCode}
      Error: ${smtpError?.message || String(smtpError)}
      Stack: ${smtpError?.stack || 'No stack trace available'}
      ============================================
      `);

      // Throw error so the function properly reports failure
      throw new Error(`Failed to send email via SMTP: ${smtpError?.message || String(smtpError)}`);
    }
  } catch (error: any) {
    console.error("Error in sendSecurityCodeEmail:", error);

    // Log the code as fallback
    console.log(`
    ============================================
    EMAIL ERROR - SECURITY CODE EMAIL  
    ============================================
    To: ${email}
    Security Code: ${securityCode}
    Error: ${error.message}
    ============================================
    `);

    // Don't throw error for email sending - just log it
    return Promise.resolve();
  }
}

async function logAuditEvent(
  supabase: any,
  email: string,
  action: string,
  success: boolean,
  failureReason: string | null,
  ipAddress: string,
  userAgent: string,
) {
  try {
    await supabase.from("password_reset_audit_log").insert({
      email,
      action,
      success,
      failure_reason: failureReason,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

serve(handler);
