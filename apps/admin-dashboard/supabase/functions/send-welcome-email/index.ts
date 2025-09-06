// @ts-ignore - Deno remote import (valid at runtime)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore - Deno remote import (valid at runtime)
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createCorsHeaders } from "../_shared/cors";

interface WelcomeEmailRequest {
  ownerName: string;
  ownerEmail: string;
  restaurantName: string;
  loginUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(req.headers.get("Origin")) });
  }

  try {
    let requestData: WelcomeEmailRequest;

    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Invalid request body:", parseError);
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
        },
      );
    }

    const { ownerName, ownerEmail, restaurantName, loginUrl } = requestData;

    // Validate required fields
    if (!ownerName || !ownerEmail || !restaurantName) {
      console.error("Missing required fields:", {
        ownerName: !!ownerName,
        ownerEmail: !!ownerEmail,
        restaurantName: !!restaurantName,
      });
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: ownerName, ownerEmail, and restaurantName are required",
          success: false,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
        },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      console.error("Invalid email format:", ownerEmail);
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

    console.log("Welcome email request received:", {
      ownerName,
      ownerEmail,
      restaurantName,
      loginUrl,
    });

    const brandLogoUrl =
      Deno.env.get("BRAND_LOGO_URL") || Deno.env.get("ADMIN_LOGO_URL");

    const defaultLoginUrl = "https://app.blunari.ai/auth";
    const finalLoginUrl = loginUrl || defaultLoginUrl;

    // Check if SMTP credentials are configured
    const smtpHost = Deno.env.get("FASTMAIL_SMTP_HOST") || "smtp.fastmail.com";
    const smtpPort = parseInt(Deno.env.get("FASTMAIL_SMTP_PORT") || "587");
    const smtpUsername = Deno.env.get("FASTMAIL_SMTP_USERNAME");
    const smtpPassword = Deno.env.get("FASTMAIL_SMTP_PASSWORD");

    if (!smtpUsername || !smtpPassword) {
      console.warn("SMTP credentials not configured - email sending skipped");
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMTP credentials missing",
          warning: "Email sending skipped - SMTP not configured",
        }),
        {
          status: 200,
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

    const emailResponse = await smtp.send({
      from: "Blunari Team <no-reply@blunari.ai>",
      to: ownerEmail,
      subject: `Welcome to Blunari - ${restaurantName} is ready!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Blunari</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <!-- Header -->
            <div style="text-align: center; padding: 40px 0; border-bottom: 2px solid #f0f0f0;">
              ${brandLogoUrl ? `<img src="${brandLogoUrl}" alt="Brand" style="height: 40px; margin-bottom: 12px;" />` : ``}
              <h1 style="color: #1a365d; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Blunari</h1>
              <p style="color: #4a5568; margin: 10px 0 0 0; font-size: 16px;">Your restaurant management platform</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 40px 0;">
              <h2 style="color: #2d3748; font-size: 24px; margin-bottom: 20px;">Hello ${ownerName}! 👋</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px; color: #4a5568;">
                Congratulations! Your restaurant <strong style="color: #1a365d;">${restaurantName}</strong> has been successfully set up on Blunari.
              </p>

              <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <h3 style="color: #2b6cb0; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4a5568;">
                  <li style="margin-bottom: 8px;">Access your admin dashboard</li>
                  <li style="margin-bottom: 8px;">Configure your restaurant settings</li>
                  <li style="margin-bottom: 8px;">Set up your booking tables</li>
                  <li style="margin-bottom: 8px;">Customize your business hours</li>
                  <li>Invite your team members</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${finalLoginUrl}" 
                   style="display: inline-block; background-color: #4299e1; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease;">
                  Access Your Dashboard
                </a>
              </div>

              <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h4 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">Need Help Getting Started?</h4>
                <p style="margin: 0; color: #4a5568; font-size: 14px;">
                  Our support team is here to help you every step of the way. Feel free to reach out if you have any questions.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 30px 0; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
              <p style="margin: 0 0 10px 0;">Thank you for choosing Blunari!</p>
              <p style="margin: 0;">© 2024 Blunari. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
        data: emailResponse,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...createCorsHeaders(req.headers.get("Origin")),
        },
      },
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);

    // Determine error type for better response
    let status = 500;
    let errorMessage = "Failed to send welcome email";

    if (error.name === "SMTPError" || error.message?.includes("SMTP")) {
      errorMessage = "Email service temporarily unavailable";
      status = 503;
    } else if (error.message?.includes("timeout")) {
      errorMessage = "Email sending timed out";
      status = 408;
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: error.message,
      }),
      {
        status,
        headers: { "Content-Type": "application/json", ...createCorsHeaders(req.headers.get("Origin")) },
      },
    );
  }
};

serve(handler);
