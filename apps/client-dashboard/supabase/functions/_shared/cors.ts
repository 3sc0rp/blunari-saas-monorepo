// Environment-aware CORS configuration
const getAllowedOrigins = () => {
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';
  
  if (environment === 'production') {
    return [
      'https://demo.blunari.ai',
      'https://admin.blunari.ai', 
      'https://services.blunari.ai',
      'https://blunari.ai',
      'https://www.blunari.ai'
    ];
  }
  
  // Development origins
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:8082',
    'http://127.0.0.1:8083'
  ];
};

const createOriginHeader = (requestOrigin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Allow all origins in development, specific origins in production
  const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';
  
  if (environment === 'development') {
    return '*';
  }
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  // Default to first allowed origin if request origin is not in list
  return allowedOrigins[0] || '*';
};

export const createCorsHeaders = (requestOrigin: string | null = null) => ({
  'Access-Control-Allow-Origin': createOriginHeader(requestOrigin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-idempotency-key, accept, accept-language, content-length',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours
});

// Legacy export for backward compatibility
export const corsHeaders = createCorsHeaders();

export function createCorsResponse(data?: any, status: number = 200, requestOrigin: string | null = null) {
  return new Response(
    data ? JSON.stringify(data) : null,
    {
      status,
      headers: {
        ...createCorsHeaders(requestOrigin),
        'Content-Type': 'application/json'
      }
    }
  )
}

export function createErrorResponse(code: string, message: string, status: number = 500, requestId?: string, requestOrigin: string | null = null) {
  return createCorsResponse({
    error: {
      code,
      message,
      requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }, status, requestOrigin)
}
