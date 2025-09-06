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

    // Parse JSON body safely
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return createErrorResponse('INVALID_JSON', 'Invalid JSON in request body', 400, undefined, origin);
    }

    const { timeRange = '30d', tenantIds } = requestBody;
    
    console.log('Billing summary called with:', { timeRange, tenantIds });
    
    // TEMPORARY: Return simple mock data to test if basic function works
    const mockSummary = {
      totalTenants: 3,
      activeBilling: 2,
      pastDue: 0,
      canceled: 0,
      freeTrial: 1,
      monthlyRecurringRevenue: 158.00,
      averageRevenuePerUser: 52.67,
      churnRate: 0.05,
      growthRate: 0.12,
    };

    const mockTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      mockTrends.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.round((158 + (Math.random() - 0.5) * 30) * 100) / 100,
        newSubscriptions: Math.floor(Math.random() * 2),
        cancellations: Math.floor(Math.random() * 1),
        upgrades: Math.floor(Math.random() * 1),
        downgrades: Math.floor(Math.random() * 1),
      });
    }

    return createCorsResponse({
      success: true,
      plan: 'Professional',
      renewal: '2025-10-05T00:00:00.000Z',
      stripe: {
        customerId: 'cus_mock123456789',
        subscription: {
          id: 'sub_mock123456789',
          status: 'active'
        }
      },
      usage: {
        bookingsThisMonth: 127,
        staffCount: 8
      },
      data: {
        summary: mockSummary,
        trends: mockTrends,
        timeRange,
        generatedAt: new Date().toISOString(),
        tenantCount: mockSummary.totalTenants,
      },
      generatedAt: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    }, 200, origin);

  } catch (e) {
    return createErrorResponse('INTERNAL', e instanceof Error ? e.message : 'Unknown error', 500, undefined, origin);
  }
});
