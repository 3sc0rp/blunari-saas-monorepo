// Issue a password setup (invite or recovery) link for a tenant owner and optionally email it.
// @ts-ignore Deno runtime remote import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore Deno runtime remote import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore Deno runtime remote import
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createCorsHeaders } from "../_shared/cors";

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

async function getRateLimitInfo(supabase: any, tenantId: string, adminUserId: string) {
  const now = new Date();
  const tenantWindowSec = 30 * 60; // 30m
  const adminWindowSec = 60 * 60; // 1h
  const tenantLimit = 3;
  const adminLimit = 5;
  const tenantSince = new Date(now.getTime() - tenantWindowSec * 1000).toISOString();
  const adminSince = new Date(now.getTime() - adminWindowSec * 1000).toISOString();

  const tQuery = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("resource_id", tenantId)
    .eq("action", "owner_password_setup_link_issued")
    .gte("created_at", tenantSince);
  const aQuery = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", adminUserId)
    .eq("action", "owner_password_setup_link_issued")
    .gte("created_at", adminSince);

  const tenantCount = tQuery.count ?? 0;
  const adminCount = aQuery.count ?? 0;
  const limitedTenant = tenantCount >= tenantLimit;
  const limitedAdmin = adminCount >= adminLimit;
  return {
    tenantCount,
    tenantLimit,
    tenantWindowSec,
    adminCount,
    adminLimit,
    adminWindowSec,
    limited: limitedTenant || limitedAdmin,
    limitedReason: limitedTenant
      ? "Tenant limit reached (3 / 30m)"
      : limitedAdmin
        ? "Admin limit reached (5 / 1h)"
        : null,
  };
}

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

    const rate = await getRateLimitInfo(supabase, tenant.id, user.id);
    if (rate.limited) return err("RATE_LIMITED", rate.limitedReason || "Rate limited", 429, origin, requestId, { rate });

    // Determine invite vs recovery
    const { data: ownerLookup } = await supabase.auth.admin.getUserByEmail(tenant.email);
    const ownerUser = ownerLookup?.user || null;
    const mode: "invite" | "recovery" = ownerUser ? "recovery" : "invite";

    let actionLink: string | null = null;
    try {
      // @ts-ignore dynamic call
      const { data: linkData } = await (supabase.auth as any).admin.generateLink({
        type: mode,
        email: tenant.email,
        options: body.loginRedirectUrl ? { redirectTo: body.loginRedirectUrl } : undefined,
      });
      actionLink = linkData?.properties?.action_link || null;
    } catch (linkErr) {
      console.warn("generateLink failed", linkErr);
    }
    if (!actionLink) return err("LINK_GENERATION_FAILED", "Failed to generate setup link", 500, origin, requestId);

    // Audit
    await supabase.from("activity_logs").insert({
      action: "owner_password_setup_link_issued",
      employee_id: user.id,
      resource_id: tenant.id,
      resource_type: "tenant",
      details: { tenantId: tenant.id, tenantEmail: tenant.email, mode, requestId },
    });

    let emailSent: boolean | null = null;
    let emailError: string | null = null;
    if (sendEmail) {
      try {
        const smtpUser = Deno.env.get("FASTMAIL_SMTP_USERNAME");
        const smtpPass = Deno.env.get("FASTMAIL_SMTP_PASSWORD");
        if (!smtpUser || !smtpPass) throw new Error("SMTP credentials not configured");

        const smtpHost = Deno.env.get("FASTMAIL_SMTP_HOST") || "smtp.fastmail.com";
        const smtpPort = parseInt(Deno.env.get("FASTMAIL_SMTP_PORT") || "587");
        const brandLogoUrl = Deno.env.get("BRAND_LOGO_URL") || Deno.env.get("ADMIN_LOGO_URL") || "";
        const ownerName = body.ownerNameOverride || tenant.name || "Owner";
        const finalRedirect = body.loginRedirectUrl || "https://app.blunari.ai/auth";

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
      } catch (e) {
        console.warn("Email send failed", e);
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
      rateLimit: rate,
      message: mode === "invite" ? "Invitation link generated" : "Recovery link generated",
    }, 200, origin);
  } catch (e) {
    console.error("tenant-password-setup-email error", e);
    return err("INTERNAL_ERROR", e instanceof Error ? e.message : "Unknown error", 500, origin, requestId);
  }
});
