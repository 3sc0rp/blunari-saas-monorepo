import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, getCorsHeaders } from "../_shared/cors";

serve(async (req) => {
  // Get origin for CORS handling
  const origin = req.headers.get('origin');
  const responseHeaders = getCorsHeaders(origin || undefined);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request from origin:', origin);
    return new Response(null, { 
      status: 204,
      headers: responseHeaders 
    });
  }

  try {
    console.log('Test function called');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...responseHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Simple successful response
    return new Response(
      JSON.stringify({ 
        message: 'Test function working',
        receivedData: requestBody,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Test function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error?.message || 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});