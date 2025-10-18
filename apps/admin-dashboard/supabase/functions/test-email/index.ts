import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, template, variables } = await req.json();

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Email address and subject are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Sending test email:", { to, subject, template });

    // In a real implementation, this would integrate with an email service like:
    // - SendGrid
    // - Mailgun
    // - Amazon SES
    // - Postmark

    // For now, we'll simulate email sending
    const emailId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate processing time
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 1000 + 500),
    );

    // Generate realistic email content based on template
    let emailContent = "";
    switch (template) {
      case "welcome":
        emailContent = `Welcome to Blunari! Thank you for joining our restaurant management platform.`;
        break;
      case "invitation":
        emailContent = `You've been invited to join ${variables?.restaurant_name || "a restaurant"} on Blunari.`;
        break;
      case "notification":
        emailContent =
          variables?.message || "This is a test notification from Blunari.";
        break;
      default:
        emailContent = "This is a test email from the Blunari platform.";
    }

    // Simulate success/failure (95% success rate)
    const success = Math.random() > 0.05;

    if (success) {
      return new Response(
        JSON.stringify({
          success: true,
          email_id: emailId,
          message: "Test email sent successfully",
          details: {
            to,
            subject,
            template: template || "default",
            content_preview: emailContent.substring(0, 100) + "...",
            sent_at: new Date().toISOString(),
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      throw new Error("Simulated email delivery failure");
    }
  } catch (error) {
    console.error("Error sending test email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
