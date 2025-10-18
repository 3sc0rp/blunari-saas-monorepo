import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || "",
      );
    } catch (err) {
      logStep("Webhook signature verification failed", err);
      return new Response(`Webhook signature verification failed`, {
        status: 400,
      });
    }

    logStep("Processing event", { type: event.type, id: event.id });

    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // Find subscriber by customer ID
        const { data: subscriber } = await supabaseClient
          .from("subscribers")
          .select("*")
          .eq("stripe_customer_id", invoice.customer)
          .single();

        if (subscriber) {
          // Record successful payment
          await supabaseClient.from("billing_history").insert({
            tenant_id: subscriber.tenant_id,
            subscriber_id: subscriber.id,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: "paid",
            billing_reason: invoice.billing_reason,
            invoice_pdf_url: invoice.invoice_pdf,
            paid_at: new Date(
              invoice.status_transitions.paid_at! * 1000,
            ).toISOString(),
            due_date: new Date(invoice.due_date! * 1000).toISOString(),
          });

          logStep("Payment recorded", {
            tenant_id: subscriber.tenant_id,
            amount: invoice.amount_paid,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        const { data: subscriber } = await supabaseClient
          .from("subscribers")
          .select("*")
          .eq("stripe_customer_id", invoice.customer)
          .single();

        if (subscriber) {
          // Record failed payment
          await supabaseClient.from("billing_history").insert({
            tenant_id: subscriber.tenant_id,
            subscriber_id: subscriber.id,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: "failed",
            billing_reason: invoice.billing_reason,
            due_date: new Date(invoice.due_date! * 1000).toISOString(),
          });

          // Create payment reminder
          await supabaseClient.from("payment_reminders").insert({
            tenant_id: subscriber.tenant_id,
            subscriber_id: subscriber.id,
            reminder_type: "failed",
            email_content: `Payment failed for invoice ${invoice.number}`,
          });

          logStep("Failed payment recorded", {
            tenant_id: subscriber.tenant_id,
            amount: invoice.amount_due,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: subscriber } = await supabaseClient
          .from("subscribers")
          .select("*")
          .eq("stripe_customer_id", subscription.customer)
          .single();

        if (subscriber) {
          // Update subscription details
          await supabaseClient
            .from("subscribers")
            .update({
              subscription_id: subscription.id,
              subscription_status: subscription.status,
              current_period_start: new Date(
                subscription.current_period_start * 1000,
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000,
              ).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq("id", subscriber.id);

          logStep("Subscription updated", {
            tenant_id: subscriber.tenant_id,
            status: subscription.status,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: subscriber } = await supabaseClient
          .from("subscribers")
          .select("*")
          .eq("stripe_customer_id", subscription.customer)
          .single();

        if (subscriber) {
          // Mark subscription as cancelled
          await supabaseClient
            .from("subscribers")
            .update({
              subscribed: false,
              subscription_status: "cancelled",
            })
            .eq("id", subscriber.id);

          logStep("Subscription cancelled", {
            tenant_id: subscriber.tenant_id,
          });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
