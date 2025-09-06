import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment-aware CORS configuration for admin functions
const getAllowedOrigins = () => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  if (environment === 'production') {
    return [
      'https://admin.blunari.ai',
      'https://services.blunari.ai',
      'https://blunari.ai',
      'https://www.blunari.ai',
    ];
  }

  // Development origins
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
  ];
};

const createOriginHeader = (requestOrigin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';

  if (environment === 'development') return '*';
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return allowedOrigins[0] || '*';
};

const createCorsHeaders = (requestOrigin: string | null = null) => ({
  'Access-Control-Allow-Origin': createOriginHeader(requestOrigin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, accept, accept-language, content-length, sentry-trace, baggage',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
});

function createCorsResponse(data?: any, status: number = 200, requestOrigin: string | null = null) {
  return new Response(
    data ? JSON.stringify(data) : null,
    {
      status,
      headers: {
        ...createCorsHeaders(requestOrigin),
        'Content-Type': 'application/json',
      },
    },
  );
}

function createErrorResponse(code: string, message: string, status: number = 500, requestId?: string, requestOrigin: string | null = null) {
  return createCorsResponse({
    error: {
      code,
      message,
      requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    },
  }, status, requestOrigin);
}

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

    // Parse JSON body safely
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return createErrorResponse('INVALID_JSON', 'Invalid JSON in request body', 400, undefined, origin);
    }

    const { tenantId } = requestBody;
    if (!tenantId) return createErrorResponse('MISSING_TENANT_ID', 'tenantId required', 400, undefined, origin);

    // Fetch tenant billing info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, stripe_subscription_id, billing_status, created_at')
      .eq('id', tenantId)
      .single();

    if (tenantError) return createErrorResponse('TENANT_FETCH_ERROR', tenantError.message, 500, undefined, origin);

    // Fetch Stripe subscription details (placeholder)
    const stripeSubscription = await fetchStripeSubscription(tenant.stripe_subscription_id);

    // Fetch recent billing events/invoices (mock data for now)
    const recentBilling = [
      {
        id: 'inv_001',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 2999,
        status: 'paid',
        description: 'Monthly subscription'
      }
    ];

    const billingMetrics = {
      currentPlan: stripeSubscription?.plan?.nickname || 'Free',
      billingStatus: tenant.billing_status || 'active',
      monthlyAmount: 2999,
      nextBillingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      totalInvoices: recentBilling.length,
      unpaidAmount: 0
    };

    return createCorsResponse({
      success: true,
      tenantId,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        created_at: tenant.created_at
      },
      billing: billingMetrics,
      stripeSubscription,
      recentInvoices: recentBilling,
      requestId: crypto.randomUUID(),
      generatedAt: new Date().toISOString()
    }, 200, origin);

  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
