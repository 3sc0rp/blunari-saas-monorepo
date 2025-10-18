import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsHeaders } from "../_shared/cors";

const corsHeaders = createCorsHeaders();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: createCorsHeaders(req.headers.get("Origin")) });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const url = new URL(req.url);
    const source = url.searchParams.get("source") || "unknown";
    const integration_id = url.searchParams.get("integration_id");

    const headers = Object.fromEntries(req.headers.entries());
    const payload = await req.json();

    console.log("Webhook received:", {
      source,
      integration_id,
      headers: Object.keys(headers),
    });

    // Log the webhook request
    const { data: logData, error: logError } = await supabaseClient
      .from("pos_webhook_logs")
      .insert({
        integration_id: integration_id || null,
        tenant_id: payload.tenant_id || null,
        method: req.method,
        webhook_url: req.url,
        headers,
        payload,
        verified: true, // In production, implement proper signature verification
        processing_time_ms: 0, // Will be updated after processing
      })
      .select()
      .single();

    if (logError) {
      console.error("Error logging webhook:", logError);
    }

    const startTime = Date.now();

    // Process webhook based on source
    let response = { success: true, message: "Webhook processed" };

    switch (source) {
      case "stripe":
        response = await handleStripeWebhook(payload, supabaseClient);
        break;

      case "pos":
        response = await handlePOSWebhook(
          payload,
          integration_id,
          supabaseClient,
        );
        break;

      case "cloudflare":
        response = await handleCloudflareWebhook(payload, supabaseClient);
        break;

      default:
        console.log("Unknown webhook source:", source);
        response = {
          success: true,
          message: "Webhook received but not processed",
        };
    }

    const processingTime = Date.now() - startTime;

    // Update webhook log with processing results
    if (logData) {
      await supabaseClient
        .from("pos_webhook_logs")
        .update({
          processing_time_ms: processingTime,
          response_status: response.success ? 200 : 400,
          response_body: JSON.stringify(response),
        })
        .eq("id", logData.id);
    }

    return new Response(JSON.stringify(response), {
      status: response.success ? 200 : 400,
      headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
  return new Response(
      JSON.stringify({
        success: false,
    error: error instanceof Error ? error.message : "Internal error",
      }),
      {
        status: 500,
    headers: { ...createCorsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" },
      },
    );
  }
});

async function handleStripeWebhook(payload: any, supabase: any) {
  console.log("Processing Stripe webhook:", payload.type);

  switch (payload.type) {
    case "payment_intent.succeeded":
      // Handle successful payment
      break;
    case "customer.subscription.updated":
      // Handle subscription updates
      break;
    case "invoice.payment_failed":
      // Handle failed payments
      break;
  }

  return { success: true, message: "Stripe webhook processed" };
}

async function handlePOSWebhook(
  payload: any,
  integration_id: string | null,
  supabase: any,
) {
  console.log("Processing POS webhook:", payload.event_type);

  if (!integration_id) {
    throw new Error("Integration ID required for POS webhooks");
  }

  // Create POS event
  await supabase.from("pos_events").insert({
    integration_id,
    tenant_id: payload.tenant_id,
    event_type: payload.event_type,
    event_source: "webhook",
    event_data: payload.data || {},
    external_id: payload.external_id,
  });

  return { success: true, message: "POS webhook processed" };
}

async function handleCloudflareWebhook(payload: any, supabase: any) {
  console.log("Processing Cloudflare webhook:", payload.type);

  // Handle Cloudflare domain events
  if (payload.type === "domain.ssl_updated") {
    // Update SSL status in domains table
  }

  return { success: true, message: "Cloudflare webhook processed" };
}
