import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret) return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });

    const body = await req.json();
    const amount = Math.max(1, Math.floor(Number(body?.amount || 0))); // cents
    const currency = (body?.currency || "usd").toLowerCase();
    const email = body?.email || undefined;
    const description = body?.description || "Booking deposit";

    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      receipt_email: email,
      capture_method: "automatic",
      automatic_payment_methods: { enabled: true },
      metadata: {
        tenant_id: String(body?.tenant_id || ""),
        purpose: "booking_deposit",
      },
    });

    return new Response(JSON.stringify({ client_secret: intent.client_secret }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});


