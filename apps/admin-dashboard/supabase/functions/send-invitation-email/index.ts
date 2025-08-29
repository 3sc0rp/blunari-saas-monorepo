import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  inviterName: string;
  role: string;
  invitationToken: string;
  companyName?: string;
  acceptUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      inviterName, 
      role, 
      invitationToken, 
      companyName = "Blunari Admin",
      acceptUrl 
    }: InvitationEmailRequest = await req.json();

    const defaultAcceptUrl = "https://your-app-domain.com/auth";
    const finalAcceptUrl = acceptUrl || `${defaultAcceptUrl}?invitation=${invitationToken}`;

    // Format role for display
    const displayRole = role.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const emailResponse = await resend.emails.send({
      from: "Blunari <onboarding@resend.dev>",
      to: [email],
      subject: `You're invited to join ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation to Join ${companyName}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <!-- Header -->
            <div style="text-align: center; padding: 40px 0; border-bottom: 2px solid #f0f0f0;">
              <h1 style="color: #1a365d; margin: 0; font-size: 28px; font-weight: 700;">You're Invited!</h1>
              <p style="color: #4a5568; margin: 10px 0 0 0; font-size: 16px;">Join ${companyName}</p>
            </div>

            <!-- Main Content -->
            <div style="padding: 40px 0;">
              <h2 style="color: #2d3748; font-size: 24px; margin-bottom: 20px;">Welcome to the team! 🎉</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px; color: #4a5568;">
                <strong style="color: #1a365d;">${inviterName}</strong> has invited you to join <strong style="color: #1a365d;">${companyName}</strong> as a <strong style="color: #4299e1;">${displayRole}</strong>.
              </p>

              <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
                <h3 style="color: #2b6cb0; margin: 0 0 15px 0; font-size: 18px;">Your Role: ${displayRole}</h3>
                <p style="margin: 0; color: #4a5568; font-size: 14px;">
                  This role will give you access to specific features and permissions within the platform. You'll receive more details about your responsibilities once you join.
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${finalAcceptUrl}" 
                   style="display: inline-block; background-color: #48bb78; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s ease;">
                  Accept Invitation
                </a>
              </div>

              <div style="background-color: #fed7d7; border: 1px solid #fc8181; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h4 style="color: #c53030; margin: 0 0 10px 0; font-size: 16px;">⏰ Important Notice</h4>
                <p style="margin: 0; color: #742a2a; font-size: 14px;">
                  This invitation will expire in 7 days. Please accept it as soon as possible to avoid missing out.
                </p>
              </div>

              <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h4 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">What happens next?</h4>
                <ol style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px;">
                  <li style="margin-bottom: 8px;">Click the "Accept Invitation" button above</li>
                  <li style="margin-bottom: 8px;">Complete your account setup</li>
                  <li style="margin-bottom: 8px;">Verify your email address</li>
                  <li>Start collaborating with your team!</li>
                </ol>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 30px 0; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
              <p style="margin: 0 0 10px 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
              <p style="margin: 0;">© 2024 Blunari. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);