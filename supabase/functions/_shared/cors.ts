// Enhanced CORS configuration for production deployment
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://app.blunari.ai',
  'https://blunari.ai',
  'https://*.blunari.ai'
];

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Access-Control-Allow-Credentials': 'false'
};

// Function to get origin-specific headers if needed
export const getCorsHeaders = (origin?: string) => {
  // For development, allow any origin
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return corsHeaders;
  }
  
  // For production, check against allowed origins
  const isAllowed = ALLOWED_ORIGINS.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*');
      return new RegExp(pattern).test(origin);
    }
    return allowed === origin;
  });
  
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null'
  };
};