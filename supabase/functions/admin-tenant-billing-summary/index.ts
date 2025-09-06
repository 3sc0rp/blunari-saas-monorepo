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
});

const createCorsResponse = (data?: any, status: number = 200, requestOrigin: string | null = null) => {
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
};

const createErrorResponse = (code: string, message: string, status: number = 500, requestId?: string, requestOrigin: string | null = null) => {
  return createCorsResponse({
    error: {
      code,
      message,
      requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    },
  }, status, requestOrigin);
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: createCorsHeaders(origin) });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return createErrorResponse('UNAUTHORIZED', 'Authorization header required', 401, undefined, origin);

    // Parse JSON body safely
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return createErrorResponse('INVALID_JSON', 'Invalid JSON in request body', 400, undefined, origin);
    }

    const { timeRange = '30d', tenantIds } = requestBody;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Build tenant filter
    let tenantsQuery = supabase
      .from('tenants')
      .select('id, name, stripe_subscription_id, billing_status, created_at');
    
    if (tenantIds && tenantIds.length > 0) {
      tenantsQuery = tenantsQuery.in('id', tenantIds);
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery;
    
    if (tenantsError) {
      return createErrorResponse('TENANTS_FETCH_ERROR', tenantsError.message, 500, undefined, origin);
    }

    // Calculate billing summary metrics
    const summary = {
      totalTenants: tenants?.length || 0,
      activeBilling: tenants?.filter((t: any) => t.billing_status === 'active').length || 0,
      pastDue: tenants?.filter((t: any) => t.billing_status === 'past_due').length || 0,
      canceled: tenants?.filter((t: any) => t.billing_status === 'canceled').length || 0,
      freeTrial: tenants?.filter((t: any) => !t.stripe_subscription_id).length || 0,
      monthlyRecurringRevenue: 0, // Will be calculated from actual billing data
      averageRevenuePerUser: 0,
      churnRate: 0,
      growthRate: 0,
    };

    // Mock billing calculations (replace with real Stripe/billing data)
    const mockMRR = (tenants?.filter((t: any) => t.billing_status === 'active').length || 0) * 29.99;
    summary.monthlyRecurringRevenue = Math.round(mockMRR * 100) / 100;
    summary.averageRevenuePerUser = summary.totalTenants > 0 
      ? Math.round((summary.monthlyRecurringRevenue / summary.totalTenants) * 100) / 100 
      : 0;

    // Generate billing trends (mock data)
    const trends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trends.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round((mockMRR + (Math.random() - 0.5) * 100) * 100) / 100,
        newSubscriptions: Math.floor(Math.random() * 5),
        cancellations: Math.floor(Math.random() * 2),
        upgrades: Math.floor(Math.random() * 3),
        downgrades: Math.floor(Math.random() * 1),
      });
    }

    return createCorsResponse({
      success: true,
      data: {
        summary,
        trends,
        timeRange,
        generatedAt: new Date().toISOString(),
        tenantCount: summary.totalTenants,
      },
      requestId: crypto.randomUUID(),
    }, 200, origin);

  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
