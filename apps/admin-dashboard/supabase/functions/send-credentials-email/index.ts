// @ts-ignore - Deno remote import (valid at runtime)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Deno remote import (valid at runtime)
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createCorsHeaders } from "../_shared/cors";

interface CredentialsEmailRequest {
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  restaurantName: string;
  loginUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(req.headers.get("Origin")) });
  }

  try {
    const requestData: CredentialsEmailRequest = await req.json();
    const { ownerName, ownerEmail, ownerPassword, restaurantName, loginUrl } =
      requestData;

    if (!ownerName || !ownerEmail || !ownerPassword || !restaurantName) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: ownerName, ownerEmail, ownerPassword, and restaurantName are required",
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
        },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      return new Response(
        JSON.stringify({
          error: "Invalid email format",
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
        },
      );
    }

    const defaultLoginUrl = "https://app.blunari.ai/auth";
    const finalLoginUrl = loginUrl || defaultLoginUrl;

    const brandLogoUrl =
      Deno.env.get("BRAND_LOGO_URL") || Deno.env.get("ADMIN_LOGO_URL");

    const smtpHost = Deno.env.get("FASTMAIL_SMTP_HOST") || "smtp.fastmail.com";
    const smtpPort = parseInt(Deno.env.get("FASTMAIL_SMTP_PORT") || "587");
    const smtpUsername = Deno.env.get("FASTMAIL_SMTP_USERNAME");
    const smtpPassword = Deno.env.get("FASTMAIL_SMTP_PASSWORD");

    if (!smtpUsername || !smtpPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMTP credentials not configured",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
        },
      );
    }

    // Lazily initialize SMTP client only after verifying credentials
    const smtp = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUsername,
          password: smtpPassword,
        },
      },
    });

    await smtp.send({
      from: "Blunari Team <no-reply@blunari.ai>",
      to: ownerEmail,
      subject: `Your ${restaurantName} Login Credentials - Blunari`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Login Credentials - ${restaurantName}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <!-- Header -->
            <div style="text-align: center; padding: 40px 0; border-bottom: 2px solid #f0f0f0;">
              ${brandLogoUrl ? `<img src="${brandLogoUrl}" alt="Brand" style="height: 40px; margin-bottom: 12px;" />` : ``}
              <h1 style="color: #1a365d; margin: 0; font-size: 28px; font-weight: 700;">🔐 Account Credentials</h1>
              <p style="color: #4a5568; margin: 10px 0 0 0; font-size: 16px;">Your secure login information</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 40px 0;">
              <h2 style="color: #2d3748; font-size: 24px; margin-bottom: 20px;">Hello ${ownerName}! 🎯</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px; color: #4a5568;">
                Your <strong style="color: #1a365d;">${restaurantName}</strong> account has been successfully created. Here are your login credentials:
              </p>

              <!-- Credentials Box -->
              <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; padding: 25px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; text-align: center;">🔑 Your Login Credentials</h3>
                
                <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 15px;">
                  <p style="margin: 0 0 5px 0; color: #4a5568; font-size: 14px; font-weight: 600;">Email Address:</p>
                  <p style="margin: 0; color: #1a365d; font-size: 16px; font-family: 'Courier New', monospace; background-color: #f7fafc; padding: 8px; border-radius: 4px;">${ownerEmail}</p>
                </div>
                
                <div style="background-color: white; padding: 20px; border-radius: 6px;">
                  <p style="margin: 0 0 5px 0; color: #4a5568; font-size: 14px; font-weight: 600;">Password:</p>
                  <p style="margin: 0; color: #1a365d; font-size: 16px; font-family: 'Courier New', monospace; background-color: #f7fafc; padding: 8px; border-radius: 4px;">${ownerPassword}</p>
                </div>
              </div>

              <div style="background-color: #fef5e7; border-left: 4px solid #f6ad55; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <h4 style="color: #c05621; margin: 0 0 10px 0; font-size: 16px;">🔒 Security Reminder</h4>
                <p style="margin: 0; color: #744210; font-size: 14px;">
                  Please change your password after your first login for enhanced security. You can do this in your account settings.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${finalLoginUrl}" 
                   style="display: inline-block; background-color: #4299e1; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  🚀 Login to Your Dashboard
                </a>
              </div>

              <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h4 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">💡 Next Steps</h4>
                <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px;">
                  <li style="margin-bottom: 5px;">Log in with the credentials above</li>
                  <li style="margin-bottom: 5px;">Update your password in account settings</li>
                  <li style="margin-bottom: 5px;">Complete your restaurant profile</li>
                  <li>Start accepting bookings!</li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 30px 0; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
              <p style="margin: 0 0 10px 0;">Keep your credentials secure! 🛡️</p>
              <p style="margin: 0;">© 2024 Blunari. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Credentials email sent successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...createCorsHeaders(req.headers.get("Origin")),
        },
      },
    );
  } catch (error) {
    console.error("Error in send-credentials-email function:", error);

    const details = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to send credentials email",
        details,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
      },
    );
  }
};

serve(handler);
