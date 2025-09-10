// Issue a password setup (invite or recovery) link for a tenant owner and optionally email it.
// @ts-ignore Deno runtime remote import
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
// @ts-ignore Deno runtime remote import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore Deno runtime remote import
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// CORS headers function - comprehensive version to match the original
const getAllowedOrigins = () => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  if (environment === 'production') {
    return [
      'https://admin.blunari.ai',
      'https://services.blunari.ai',
      'https://blunari.ai',
      'https://www.blunari.ai',
    ];
  }

  // Development origins
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
  ];
};

const createOriginHeader = (requestOrigin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  if (environment === 'development') return '*';
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return allowedOrigins[0] || '*';
};

const createCorsHeaders = (requestOrigin: string | null = null) => ({
  'Access-Control-Allow-Origin': createOriginHeader(requestOrigin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, accept, accept-language, content-length, sentry-trace, baggage',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
});

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

serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(origin) });
  }
  const requestId = crypto.randomUUID();
  if (req.method !== "POST") return err("METHOD_NOT_ALLOWED", "Only POST allowed", 405, origin, requestId);

  try {
    console.log("Function started with request ID:", requestId);
    
    const body: RequestBody = await req.json().catch(() => ({} as any));
    console.log("Request body received:", { 
      hasTenantId: !!body.tenantId, 
      sendEmail: body.sendEmail,
      requestId 
    });
    
    if (!body.tenantId) return err("VALIDATION_ERROR", "tenantId required", 400, origin, requestId);
    const sendEmail = body.sendEmail !== false; // default true

    // Check environment variables first
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Environment variables check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      requestId
    });
    
    if (!supabaseUrl || !serviceRoleKey) {
      return err("CONFIG_ERROR", "Missing required environment variables", 500, origin, requestId);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("Checking admin authorization...", { requestId });
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("UNAUTHORIZED", "Missing Authorization", 401, origin, requestId);
    const token = authHeader.replace(/^Bearer\s+/i, "");
    
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      console.error("Auth error:", authErr);
      return err("UNAUTHORIZED", "Invalid admin session", 401, origin, requestId);
    }
    console.log("User authenticated:", { userId: user.id, requestId });

    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();
    if (!adminRecord) return err("FORBIDDEN", "Admin access required", 403, origin, requestId);
    console.log("Admin verified:", { adminId: adminRecord.id, role: adminRecord.role, requestId });

    console.log("Looking up tenant:", { tenantId: body.tenantId, requestId });
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id, name, email, slug")
      .eq("id", body.tenantId)
      .single();
    if (tenantErr || !tenant) {
      console.error("Tenant lookup error:", tenantErr);
      return err("TENANT_NOT_FOUND", "Tenant not found", 404, origin, requestId);
    }
    console.log("Tenant found:", { 
      tenantId: tenant.id, 
      tenantName: tenant.name, 
      hasEmail: !!tenant.email, 
      hasSlug: !!tenant.slug, 
      requestId 
    });
    if (!tenant.email) return err("NO_OWNER_EMAIL", "Tenant has no owner email", 400, origin, requestId);
    if (!tenant.slug) return err("NO_TENANT_SLUG", "Tenant has no slug configured", 400, origin, requestId);

  // Rate limiting now handled atomically via RPC post-generation (we optimistically get link then record; alternatively record first then generate)

    // Check if user exists in auth to determine the correct mode
    let mode: "invite" | "recovery" = "invite"; // default to invite for new users
    
    console.log("Checking if user exists in auth:", { email: tenant.email, requestId });
    
    try {
      const supabaseAdmin = supabase as any;
      const { data: existingUser, error: userCheckError } = await supabaseAdmin.auth.admin.getUserByEmail(tenant.email);
      
      console.log("User existence check result:", {
        hasData: !!existingUser,
        hasUser: !!existingUser?.user,
        hasError: !!userCheckError,
        error: userCheckError ? JSON.stringify(userCheckError) : null,
        userId: existingUser?.user?.id,
        requestId
      });
      
      if (existingUser?.user && !userCheckError) {
        mode = "recovery"; // user exists, use recovery
        console.log("User exists - using recovery mode:", { 
          email: tenant.email, 
          userId: existingUser.user.id, 
          mode,
          requestId 
        });
      } else if (userCheckError && userCheckError.message?.includes('not found')) {
        mode = "invite"; // user doesn't exist, use invite
        console.log("User not found - using invite mode:", { 
          email: tenant.email, 
          mode,
          requestId 
        });
      } else {
        // If there's an error but it's not "not found", still try invite as fallback
        mode = "invite";
        console.log("User check inconclusive - defaulting to invite mode:", { 
          email: tenant.email, 
          error: userCheckError,
          mode,
          requestId 
        });
      }
    } catch (userErr) {
      console.log("User check failed with exception - defaulting to invite mode:", { 
        email: tenant.email, 
        error: userErr instanceof Error ? userErr.message : String(userErr),
        mode: "invite",
        requestId 
      });
      mode = "invite";
    }

    console.log("Using mode for password setup:", { mode, email: tenant.email, requestId });

    // For invite mode (new users), we'll use a different approach to minimize emails

    let actionLink: string | null = null;
    try {
      console.log("Generating link:", { mode, email: tenant.email, requestId });
      
      // Debug: Check all environment variables related to URLs
      const clientBaseUrl = Deno.env.get("CLIENT_BASE_URL");
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      
      console.log("Environment check:", {
        CLIENT_BASE_URL: clientBaseUrl,
        SUPABASE_URL: supabaseUrl,
        fallback: "https://app.blunari.ai",
        requestId
      });
      
      // The client dashboard is deployed to app.blunari.ai with tenant routing
      // Use the environment variable or fallback to the production URL
      const finalClientBaseUrl = clientBaseUrl || "https://app.blunari.ai";
      // Add passwordSetup=true parameter to help client detect this is a password setup flow
      const clientDashboardUrl = `${finalClientBaseUrl}/auth?tenant=${tenant.slug}&passwordSetup=true`;
      const redirectUrl = body.loginRedirectUrl || clientDashboardUrl;
      
      console.log("URL generation:", { 
        finalClientBaseUrl, 
        clientDashboardUrl, 
        redirectUrl, 
        tenantSlug: tenant.slug, 
        requestId 
      });
      
      // Generate the authentication link using Supabase admin API
      console.log("Attempting to generate link with params:", {
        mode,
        email: tenant.email,
        redirectUrl,
        requestId
      });
      
      const supabaseAdmin = supabase as any; // Type assertion for admin methods
      let linkResponse;
      
      try {
        if (mode === 'invite') {
          // For new users, use inviteUserByEmail
          console.log("Attempting invite for new user...", { email: tenant.email, requestId });
          linkResponse = await supabaseAdmin.auth.admin.inviteUserByEmail(tenant.email, {
            redirectTo: redirectUrl,
          });
        } else {
          // For existing users, use generateLink with recovery type
          console.log("Attempting recovery for existing user...", { email: tenant.email, requestId });
          linkResponse = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: tenant.email,
            options: { redirectTo: redirectUrl },
          });
        }
        
        console.log("Link generation response:", {
          hasData: !!linkResponse.data,
          hasError: !!linkResponse.error,
          mode,
          requestId
        });
        
        if (linkResponse.error) {
          // Check if it's an "email_exists" error and retry with recovery mode
          if (mode === 'invite' && linkResponse.error.code === 'email_exists') {
            console.log("Email exists error during invite - switching to recovery mode...", { 
              email: tenant.email, 
              requestId 
            });
            
            // Retry with recovery mode
            linkResponse = await supabaseAdmin.auth.admin.generateLink({
              type: 'recovery',
              email: tenant.email,
              options: { redirectTo: redirectUrl },
            });
            
            console.log("Recovery retry response:", {
              hasData: !!linkResponse.data,
              hasError: !!linkResponse.error,
              requestId
            });
          }
          
          if (linkResponse.error) {
            console.error("Supabase link generation error:", linkResponse.error);
            throw new Error(`Supabase error: ${JSON.stringify(linkResponse.error)}`);
          }
        }
        
        actionLink = linkResponse.data?.properties?.action_link || linkResponse.data?.action_link || null;
        
        // Generate a unique token for single-use tracking
        const linkToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours from now
        
        console.log("Generated link with tracking:", {
          hasLink: !!actionLink,
          linkToken,
          expiresAt,
          requestId
        });
        
        // Store link tracking information in database for single-use validation
        if (actionLink) {
          try {
            const { error: trackingError } = await supabase
              .from('password_setup_links')
              .insert({
                token: linkToken,
                tenant_id: tenant.id,
                email: tenant.email,
                expires_at: expiresAt,
                created_by: user.id,
                used: false,
                created_at: new Date().toISOString()
              });
              
            if (trackingError) {
              console.warn("Failed to store link tracking (proceeding anyway):", trackingError);
            } else {
              console.log("Link tracking stored successfully:", { linkToken, requestId });
              
              // Append the tracking token to the redirect URL
              const separator = redirectUrl.includes('?') ? '&' : '?';
              const trackedRedirectUrl = `${redirectUrl}${separator}linkToken=${linkToken}`;
              
              // Update the action link to include our tracking token
              const linkUrl = new URL(actionLink);
              const linkParams = new URLSearchParams(linkUrl.hash.substring(1));
              linkParams.set('redirectTo', trackedRedirectUrl);
              linkUrl.hash = linkParams.toString();
              actionLink = linkUrl.toString();
              
              console.log("Updated action link with tracking token:", {
                originalRedirect: redirectUrl,
                trackedRedirect: trackedRedirectUrl,
                requestId
              });
            }
          } catch (trackingErr) {
            console.warn("Link tracking setup failed (proceeding anyway):", trackingErr);
          }
        }
        
      } catch (apiError) {
        console.error("API call failed:", {
          error: apiError,
          mode,
          email: tenant.email,
          requestId
        });
        throw apiError;
      }
      console.log("Link generation result:", { 
        hasLink: !!actionLink, 
        linkPreview: actionLink ? actionLink.substring(0, 100) + '...' : null,
        fullLink: actionLink,
        requestId 
      });
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
        
        // Use the same client base URL for consistency
        const clientBaseUrl = Deno.env.get("CLIENT_BASE_URL") || "https://app.blunari.ai";
        const tenantDashboardUrl = `${clientBaseUrl}?tenant=${tenant.slug}`;
        const finalRedirect = body.loginRedirectUrl || tenantDashboardUrl;

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

        const subj = `Access Your ${tenant.name} Dashboard - Set Password`;
        const preface = `Your <strong>${tenant.name}</strong> dashboard is ready! Click below to set your password and access your restaurant management system.`;
        const securityNote = `This password setup link was generated for your ${tenant.name} account. If you did not expect this, you can safely ignore this email.`;

        await smtp.send({
          from: `${tenant.name} via Blunari <no-reply@blunari.ai>`,
            to: tenant.email,
            subject: subj,
            html: `<!DOCTYPE html><html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/><title>${subj}</title></head>
            <body style='font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:0;background:#f8fafc;'>
              <div style='max-width:620px;margin:0 auto;padding:32px;background:#ffffff;border-radius:8px;box-shadow:0 4px 6px rgba(0, 0, 0, 0.1);'>
                <div style='text-align:center;padding-bottom:24px;border-bottom:1px solid #e2e8f0;'>
                  ${brandLogoUrl ? `<img src='${brandLogoUrl}' style='height:40px;margin-bottom:12px;' alt='${tenant.name} Logo'/>` : ''}
                  <h1 style='margin:0;font-size:24px;color:#1a365d;'>${tenant.name} Dashboard Access</h1>
                  <p style='margin:8px 0 0 0;font-size:14px;color:#64748b;'>Restaurant Management System</p>
                </div>
                <div style='padding:32px 0;'>
                  <p style='font-size:16px;color:#2d3748;font-weight:600;'>Hi ${ownerName},</p>
                  <p style='font-size:14px;color:#4a5568;line-height:1.6;'>${preface}</p>
                  
                  <div style='background:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px 20px;border-radius:4px;margin:24px 0;'>
                    <p style='margin:0;font-size:13px;color:#0c4a6e;'><strong>What you'll get access to:</strong></p>
                    <ul style='margin:8px 0 0 0;font-size:13px;color:#0c4a6e;'>
                      <li>Table management & reservations</li>
                      <li>Real-time booking dashboard</li>
                      <li>Customer communication tools</li>
                      <li>Analytics & reporting</li>
                    </ul>
                  </div>
                  
                  <div style='margin:32px 0;text-align:center;'>
                    <a href='${actionLink}' style='display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:16px 32px;border-radius:8px;font-weight:600;font-size:16px;box-shadow:0 2px 4px rgba(37, 99, 235, 0.2);'>Set Password & Access Dashboard</a>
                  </div>
                  
                  <p style='font-size:12px;color:#718096;text-align:center;'>If the button doesn't work, copy & paste this URL into your browser:<br/><span style='word-break:break-all;color:#1a365d;background:#f8fafc;padding:4px 8px;border-radius:4px;'>${actionLink}</span></p>
                  
                  <div style='background:#fefce8;border-left:4px solid #eab308;padding:16px 20px;border-radius:4px;margin:28px 0;'>
                    <p style='margin:0;font-size:13px;color:#854d0e;'><strong>Security Note:</strong> ${securityNote}</p>
                  </div>
                  
                  <p style='font-size:12px;color:#4b5563;text-align:center;'>After setting your password, you can access your dashboard at:<br/><a href='${finalRedirect}' style='color:#2563eb;font-weight:600;'>${finalRedirect}</a></p>
                </div>
                <div style='text-align:center;padding-top:24px;border-top:1px solid #e2e8f0;'>
                  <p style='margin:0 0 8px 0;font-size:12px;color:#64748b;'>Need help? Contact our support team</p>
                  <p style='margin:0;font-size:12px;color:#64748b;'>© ${new Date().getFullYear()} Blunari Restaurant Management System. All rights reserved.</p>
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
      message: "Password setup link generated",
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
