import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const smtp = new SMTPClient({
  connection: {
    hostname: Deno.env.get("FASTMAIL_SMTP_HOST") || "smtp.fastmail.com",
    port: parseInt(Deno.env.get("FASTMAIL_SMTP_PORT") || "587"),
    tls: true,
    auth: {
      username: Deno.env.get("FASTMAIL_SMTP_USERNAME")!,
      password: Deno.env.get("FASTMAIL_SMTP_PASSWORD")!,
    },
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomePackRequest {
  ownerName: string;
  ownerEmail: string;
  restaurantName: string;
  loginUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: WelcomePackRequest = await req.json();
    const { ownerName, ownerEmail, restaurantName, loginUrl } = requestData;

    if (!ownerName || !ownerEmail || !restaurantName) {
      return new Response(JSON.stringify({ 
        error: "Missing required fields: ownerName, ownerEmail, and restaurantName are required",
        success: false 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      return new Response(JSON.stringify({ 
        error: "Invalid email format",
        success: false 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const defaultLoginUrl = "https://app.blunari.ai/auth";
    const finalLoginUrl = loginUrl || defaultLoginUrl;

    const brandLogoUrl = Deno.env.get("BRAND_LOGO_URL") || Deno.env.get("ADMIN_LOGO_URL");

    const smtpUsername = Deno.env.get("FASTMAIL_SMTP_USERNAME");
    const smtpPassword = Deno.env.get("FASTMAIL_SMTP_PASSWORD");
    
    if (!smtpUsername || !smtpPassword) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "SMTP credentials not configured"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await smtp.send({
      from: "Blunari Team <no-reply@blunari.ai>",
      to: ownerEmail,
      subject: `Welcome to Blunari - Your ${restaurantName} Welcome Pack!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome Pack - ${restaurantName}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <!-- Header -->
            <div style="text-align: center; padding: 40px 0; border-bottom: 2px solid #f0f0f0;">
              ${brandLogoUrl ? `<img src="${brandLogoUrl}" alt="Brand" style="height: 40px; margin-bottom: 12px;" />` : ``}
              <h1 style="color: #1a365d; margin: 0; font-size: 28px; font-weight: 700;">🎉 Welcome Pack</h1>
              <p style="color: #4a5568; margin: 10px 0 0 0; font-size: 16px;">Everything you need to get started with Blunari</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 40px 0;">
              <h2 style="color: #2d3748; font-size: 24px; margin-bottom: 20px;">Hello ${ownerName}! 🚀</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px; color: #4a5568;">
                Welcome to the Blunari family! We're thrilled to have <strong style="color: #1a365d;">${restaurantName}</strong> on board.
              </p>

              <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <h3 style="color: #2b6cb0; margin: 0 0 15px 0; font-size: 18px;">🎯 Quick Start Guide</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4a5568;">
                  <li style="margin-bottom: 8px;">📊 Set up your dashboard preferences</li>
                  <li style="margin-bottom: 8px;">🍽️ Configure your restaurant tables and layout</li>
                  <li style="margin-bottom: 8px;">⏰ Customize your business hours</li>
                  <li style="margin-bottom: 8px;">👥 Invite your team members</li>
                  <li style="margin-bottom: 8px;">🔗 Integrate with your POS system</li>
                  <li>📱 Set up your booking widget</li>
                </ul>
              </div>

              <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h4 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">📚 Resources for Success</h4>
                <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px;">
                  <li style="margin-bottom: 5px;">📖 <a href="#" style="color: #4299e1;">Complete Setup Guide</a></li>
                  <li style="margin-bottom: 5px;">🎥 <a href="#" style="color: #4299e1;">Video Tutorials</a></li>
                  <li style="margin-bottom: 5px;">💡 <a href="#" style="color: #4299e1;">Best Practices Handbook</a></li>
                  <li>🆘 <a href="#" style="color: #4299e1;">24/7 Support Center</a></li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${finalLoginUrl}" 
                   style="display: inline-block; background-color: #4299e1; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  🎯 Access Your Dashboard
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 30px 0; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
              <p style="margin: 0 0 10px 0;">Ready to transform your restaurant operations? 🌟</p>
              <p style="margin: 0;">© 2024 Blunari. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Welcome pack email sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-pack function:", error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: "Failed to send welcome pack email",
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);