// Issue a password setup (invite or recovery) link for a tenant owner and optionally email it.
// @ts-ignore Deno runtime remote import
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
// @ts-ignore Deno runtime remote import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore Deno runtime remote import
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createCorsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  tenantId: string;
  sendEmail?: boolean; // default true
  ownerNameOverride?: string; // optional custom name for email template
  loginRedirectUrl?: string; // optional override after completion
}

interface ErrorPayload { error: { code: string; message: string; requestId: string; meta?: any } }

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...createCorsHeaders(origin), "Content-Type": "application/json" },
  });
}
function err(code: string, message: string, status: number, origin: string | null, requestId: string, meta?: any) {
  return json(<ErrorPayload>{ error: { code, message, requestId, meta } }, status, origin);
}

// Placeholder retained for backward compatibility if needed; no longer used.
async function getRateLimitInfo() { return null; }

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(origin) });
  }
  const requestId = crypto.randomUUID();
  if (req.method !== "POST") return err("METHOD_NOT_ALLOWED", "Only POST allowed", 405, origin, requestId);

  try {
    const body: RequestBody = await req.json().catch(() => ({} as any));
    if (!body.tenantId) return err("VALIDATION_ERROR", "tenantId required", 400, origin, requestId);
    const sendEmail = body.sendEmail !== false; // default true

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("UNAUTHORIZED", "Missing Authorization", 401, origin, requestId);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return err("UNAUTHORIZED", "Invalid admin session", 401, origin, requestId);

    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();
    if (!adminRecord) return err("FORBIDDEN", "Admin access required", 403, origin, requestId);

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, name, email")
      .eq("id", body.tenantId)
      .single();
    if (tenantErr || !tenant) return err("TENANT_NOT_FOUND", "Tenant not found", 404, origin, requestId);
    if (!tenant.email) return err("NO_OWNER_EMAIL", "Tenant has no owner email", 400, origin, requestId);

  // Rate limiting now handled atomically via RPC post-generation (we optimistically get link then record; alternatively record first then generate)

    // Determine invite vs recovery - avoid creating users here to minimize automatic emails
    let ownerUser = null;
    let mode: "invite" | "recovery" = "invite";
    
    try {
      const { data: ownerLookup, error: lookupErr } = await supabase.auth.admin.getUserByEmail(tenant.email);
      if (lookupErr) {
        console.warn("getUserByEmail failed:", lookupErr, "- defaulting to invite mode");
      } else {
        ownerUser = ownerLookup?.user || null;
      }
      mode = ownerUser ? "recovery" : "invite";
    } catch (lookupError) {
      console.warn("Error checking existing user, defaulting to invite mode:", lookupError);
      mode = "invite";
    }

    // For invite mode (new users), we'll use a different approach to minimize emails

    let actionLink: string | null = null;
    try {
      console.log("Generating link:", { mode, email: tenant.email, requestId });
      // @ts-ignore dynamic call
      const { data: linkData, error: linkError } = await (supabase.auth as any).admin.generateLink({
        type: mode,
        email: tenant.email,
        options: body.loginRedirectUrl ? { redirectTo: body.loginRedirectUrl } : undefined,
      });
      
      if (linkError) {
        console.error("generateLink error:", linkError);
        throw linkError;
      }
      
      actionLink = linkData?.properties?.action_link || null;
      console.log("Link generated successfully:", { hasLink: !!actionLink, requestId });
    } catch (linkErr) {
      console.error("generateLink failed:", {
        error: linkErr instanceof Error ? linkErr.message : String(linkErr),
        mode,
        email: tenant.email,
        requestId
      });
      return err("LINK_GENERATION_FAILED", `Failed to generate setup link: ${linkErr instanceof Error ? linkErr.message : String(linkErr)}`, 500, origin, requestId);
    }
    if (!actionLink) return err("LINK_GENERATION_FAILED", "Generated link was empty", 500, origin, requestId);

    // Record event + enforce limits atomically
  const { data: rateRows, error: rateErr } = await supabase.rpc('record_password_setup_link_event', { p_tenant: tenant.id, p_admin: user.id, p_mode: mode });
    if (rateErr) {
      console.warn('Rate limit RPC error', rateErr);
    }
    const rate = Array.isArray(rateRows) && rateRows[0] ? rateRows[0] : null;
    if (rate?.limited) {
      return err('RATE_LIMITED', rate.limited_reason || 'Rate limited', 429, origin, requestId, { rate });
    }

    let emailSent: boolean | null = null;
    let emailError: string | null = null;
    if (sendEmail) {
      try {
        const smtpUser = Deno.env.get("FASTMAIL_SMTP_USERNAME");
        const smtpPass = Deno.env.get("FASTMAIL_SMTP_PASSWORD");
        
        console.log("SMTP Config Check:", {
          hasUsername: !!smtpUser,
          hasPassword: !!smtpPass,
          tenantEmail: tenant.email,
          mode,
          requestId
        });
        
        if (!smtpUser || !smtpPass) {
          const errorMsg = "SMTP credentials not configured";
          console.error(errorMsg, { smtpUser: !!smtpUser, smtpPass: !!smtpPass });
          throw new Error(errorMsg);
        }

        const smtpHost = Deno.env.get("FASTMAIL_SMTP_HOST") || "smtp.fastmail.com";
        const smtpPort = parseInt(Deno.env.get("FASTMAIL_SMTP_PORT") || "587");
        const brandLogoUrl = Deno.env.get("BRAND_LOGO_URL") || Deno.env.get("ADMIN_LOGO_URL") || "";
        const ownerName = body.ownerNameOverride || tenant.name || "Owner";
        const finalRedirect = body.loginRedirectUrl || "https://app.blunari.ai/auth";

        console.log("Attempting SMTP connection:", {
          host: smtpHost,
          port: smtpPort,
          recipient: tenant.email,
          requestId
        });

        const smtp = new SMTPClient({
          connection: {
            hostname: smtpHost,
            port: smtpPort,
            tls: true,
            auth: { username: smtpUser, password: smtpPass },
          },
        });

        const subj = mode === "invite" ? `Welcome to Blunari – Activate ${tenant.name}` : `Reset / Set Your ${tenant.name} Password`;
        const preface = mode === "invite"
          ? `Your account for <strong>${tenant.name}</strong> is almost ready. Click below to set your password and finish activation.`
          : `You requested a secure link to set a new password for <strong>${tenant.name}</strong>.`;
        const securityNote = mode === "invite"
          ? `If you did not expect this invitation, you can ignore this email.`
          : `If you did not request this password setup link, you can ignore this email. Your current password remains unchanged until you complete the flow.`;

        await smtp.send({
          from: "Blunari Team <no-reply@blunari.ai>",
            to: tenant.email,
            subject: subj,
            html: `<!DOCTYPE html><html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/><title>${subj}</title></head>
            <body style='font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:0;background:#f8fafc;'>
              <div style='max-width:620px;margin:0 auto;padding:32px;background:#ffffff;'>
                <div style='text-align:center;padding-bottom:24px;border-bottom:1px solid #e2e8f0;'>
                  ${brandLogoUrl ? `<img src='${brandLogoUrl}' style='height:40px;margin-bottom:12px;' alt='Logo'/>` : ''}
                  <h1 style='margin:0;font-size:24px;color:#1a365d;'>${mode === 'invite' ? 'Activate Your Account' : 'Password Reset / Setup'}</h1>
                </div>
                <div style='padding:32px 0;'>
                  <p style='font-size:15px;color:#2d3748;'>Hi ${ownerName},</p>
                  <p style='font-size:14px;color:#4a5568;'>${preface}</p>
                  <div style='margin:28px 0;text-align:center;'>
                    <a href='${actionLink}' style='display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:15px;'>${mode === 'invite' ? 'Set Password & Activate' : 'Set New Password'}</a>
                  </div>
                  <p style='font-size:12px;color:#718096;'>If the button does not work, copy & paste this URL:<br/><span style='word-break:break-all;color:#1a365d;'>${actionLink}</span></p>
                  <div style='background:#fefce8;border-left:4px solid #eab308;padding:16px 20px;border-radius:4px;margin:28px 0;'>
                    <p style='margin:0;font-size:13px;color:#854d0e;'>${securityNote}</p>
                  </div>
                  <p style='font-size:12px;color:#4b5563;'>This link may expire or become invalid after use. Once complete you can log in at <a href='${finalRedirect}' style='color:#2563eb;'>${finalRedirect}</a>.</p>
                </div>
                <div style='text-align:center;padding-top:24px;border-top:1px solid #e2e8f0;'>
                  <p style='margin:0;font-size:12px;color:#64748b;'>© ${new Date().getFullYear()} Blunari. All rights reserved.</p>
                </div>
              </div>
            </body></html>`
        });
        emailSent = true;
        console.log("Email sent successfully:", { 
          recipient: tenant.email, 
          mode, 
          requestId 
        });
      } catch (e) {
        const errorDetails = {
          message: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
          recipient: tenant.email,
          mode,
          requestId
        };
        console.error("Email send failed:", errorDetails);
        emailSent = false;
        emailError = e instanceof Error ? e.message : String(e);
      }
    }

    return json({
      success: true,
      requestId,
      tenantId: tenant.id,
      ownerEmail: tenant.email,
      mode,
      link: actionLink,
      email: sendEmail ? { sent: emailSent, error: emailError } : { sent: false, skipped: true },
      rateLimit: rate ? {
        tenantCount: rate.tenant_count,
        tenantLimit: rate.tenant_limit,
        tenantRemaining: rate.tenant_remaining,
        tenantWindowSeconds: rate.tenant_window_seconds,
        adminCount: rate.admin_count,
        adminLimit: rate.admin_limit,
        adminRemaining: rate.admin_remaining,
        adminWindowSeconds: rate.admin_window_seconds,
        limited: rate.limited,
        limitedReason: rate.limited_reason,
      } : null,
      message: mode === "invite" ? "Invitation link generated" : "Recovery link generated",
    }, 200, origin);
  } catch (e) {
    console.error("tenant-password-setup-email error", {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      requestId,
      env: {
        hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
        hasServiceRoleKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        hasSmtpUsername: !!Deno.env.get("FASTMAIL_SMTP_USERNAME"),
        hasSmtpPassword: !!Deno.env.get("FASTMAIL_SMTP_PASSWORD"),
      }
    });
    return err("INTERNAL_ERROR", e instanceof Error ? e.message : "Unknown error", 500, origin, requestId);
  }
});
