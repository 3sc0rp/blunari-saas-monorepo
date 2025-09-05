import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsHeaders, createErrorResponse, createCorsResponse } from "../_shared/cors";

// Placeholder Stripe fetch (replace with real Stripe call if key present)
async function fetchStripeSubscription(stripeSubscriptionId: string | null) {
  if (!stripeSubscriptionId) return null;
  // For now just echo back id; future enhancement: call Stripe API via fetch
  return { id: stripeSubscriptionId, plan: { id: 'plan_basic', nickname: 'Basic' }, status: 'active' };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: createCorsHeaders(origin) });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

  const { tenantId, refreshInvoices } = await req.json();
    if (!tenantId) return createErrorResponse('MISSING_TENANT_ID', 'tenantId required', 400, undefined, origin);

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, stripe_customer_id, stripe_subscription_id, plan_code, plan_renews_at')
      .eq('id', tenantId)
      .single();
    if (error || !tenant) return createErrorResponse('TENANT_NOT_FOUND', 'Tenant not found', 404, undefined, origin);

    const subscription = await fetchStripeSubscription(tenant.stripe_subscription_id);

    // Optional invoice refresh placeholder (would call Stripe list and upsert)
    if (refreshInvoices) {
      // Mock example invoice if none present
      const { data: existing } = await supabase.from('tenant_invoices_cache').select('stripe_invoice_id').eq('tenant_id', tenantId).limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from('tenant_invoices_cache').upsert({
          tenant_id: tenantId,
          stripe_invoice_id: 'in_mock_' + crypto.randomUUID().slice(0,8),
          status: 'paid',
          amount_due: 15000,
          amount_paid: 15000,
          currency: 'usd',
          hosted_invoice_url: 'https://example.com/invoice',
          pdf_url: 'https://example.com/invoice.pdf',
          issued_at: new Date().toISOString(),
        });
      }
    }

    const { data: invoices } = await supabase
      .from('tenant_invoices_cache')
      .select('stripe_invoice_id, status, amount_due, amount_paid, currency, hosted_invoice_url, pdf_url, issued_at')
      .eq('tenant_id', tenantId)
      .order('issued_at', { ascending: false })
      .limit(12);

    // Basic usage samples (bookings this month, staff count)
    const periodStart = new Date();
    periodStart.setDate(1);
    const periodStartIso = periodStart.toISOString();

    const { data: bookingAgg } = await supabase
      .from('bookings')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('booking_time', periodStartIso);

    const { data: staffAgg } = await supabase
      .from('staff')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId);

  const payload = {
      tenantId,
      plan: tenant.plan_code,
      renewal: tenant.plan_renews_at,
      stripe: {
        customerId: tenant.stripe_customer_id,
        subscription,
  },
  invoices: invoices || [],
      usage: {
        bookingsThisMonth: bookingAgg?.length ?? 0,
        staffCount: staffAgg?.length ?? 0,
      },
      requestId: crypto.randomUUID(),
      generatedAt: new Date().toISOString(),
  };
  return createCorsResponse(payload, 200, origin);
  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
