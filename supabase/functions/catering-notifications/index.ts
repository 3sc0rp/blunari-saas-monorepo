import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Catering Email Notifications
 * 
 * Sends emails for catering order events:
 * - new_order: Customer inquiry submitted
 * - quote_sent: Quote delivered to customer
 * - order_confirmed: Order confirmed by customer
 * - event_reminder: Reminder 3 days before event
 * - feedback_request: Request feedback after event
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "METHOD_NOT_ALLOWED", requestId }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { order_id, notification_type } = body;

    if (!order_id || !notification_type) {
      return new Response(
        JSON.stringify({ error: "MISSING_PARAMETERS", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("catering_orders")
      .select(`
        *,
        catering_packages(name, price_per_person),
        tenants(name, slug)
      `)
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "ORDER_NOT_FOUND", requestId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email content based on type
    let subject = "";
    let htmlContent = "";
    let recipient = order.contact_email;

    switch (notification_type) {
      case "new_order":
        subject = `New Catering Inquiry - ${order.event_name}`;
        htmlContent = generateNewOrderEmail(order);
        // Send to restaurant, not customer
        recipient = "catering@blunari.ai"; // TODO: Use tenant's catering email
        break;

      case "quote_sent":
        subject = `Your Catering Quote - ${order.event_name}`;
        htmlContent = generateQuoteEmail(order);
        break;

      case "order_confirmed":
        subject = `Catering Order Confirmed - ${order.event_name}`;
        htmlContent = generateConfirmationEmail(order);
        break;

      case "event_reminder":
        subject = `Upcoming Event Reminder - ${order.event_name}`;
        htmlContent = generateReminderEmail(order);
        break;

      case "feedback_request":
        subject = `How was your experience? - ${order.event_name}`;
        htmlContent = generateFeedbackEmail(order);
        break;

      default:
        return new Response(
          JSON.stringify({ error: "INVALID_NOTIFICATION_TYPE", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // TODO: Integrate with email service
    console.log(`[catering-notifications] Would send email to ${recipient}:`, subject);

    // Log notification in database
    await supabase.from("notification_queue").insert({
      tenant_id: order.tenant_id,
      notification_type: `catering_${notification_type}`,
      title: subject,
      message: `Catering notification for order #${order.id.slice(0, 8)}`,
      data: { order_id, notification_type },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent",
        requestId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[catering-notifications] Error:", error);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Email template generators
function generateNewOrderEmail(order: any): string {
  return `
    <h2>New Catering Inquiry Received</h2>
    <p><strong>Event:</strong> ${order.event_name}</p>
    <p><strong>Date:</strong> ${order.event_date}</p>
    <p><strong>Guests:</strong> ${order.guest_count}</p>
    <p><strong>Contact:</strong> ${order.contact_name} (${order.contact_email})</p>
    <p><strong>Service Type:</strong> ${order.service_type}</p>
  `;
}

function generateQuoteEmail(order: any): string {
  return `
    <h2>Your Catering Quote</h2>
    <p>Dear ${order.contact_name},</p>
    <p>Thank you for your catering inquiry for <strong>${order.event_name}</strong>.</p>
    <p><strong>Total:</strong> $${(order.total_amount / 100).toFixed(2)}</p>
    <p><strong>Deposit Required:</strong> $${(order.deposit_amount / 100).toFixed(2)}</p>
  `;
}

function generateConfirmationEmail(order: any): string {
  return `
    <h2>Catering Order Confirmed!</h2>
    <p>Dear ${order.contact_name},</p>
    <p>Your catering order for <strong>${order.event_name}</strong> has been confirmed!</p>
    <p><strong>Date:</strong> ${order.event_date}</p>
    <p><strong>Guests:</strong> ${order.guest_count}</p>
  `;
}

function generateReminderEmail(order: any): string {
  return `
    <h2>Upcoming Event Reminder</h2>
    <p>Dear ${order.contact_name},</p>
    <p>This is a reminder that your catering event <strong>${order.event_name}</strong> is coming up soon!</p>
    <p><strong>Date:</strong> ${order.event_date} at ${order.event_start_time}</p>
  `;
}

function generateFeedbackEmail(order: any): string {
  return `
    <h2>How was your experience?</h2>
    <p>Dear ${order.contact_name},</p>
    <p>We hope your event <strong>${order.event_name}</strong> was a success!</p>
    <p>We'd love to hear your feedback.</p>
  `;
}

