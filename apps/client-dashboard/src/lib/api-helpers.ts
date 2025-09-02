import { supabase } from '@/integrations/supabase/client';

export interface ApiErrorDetails {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
  status?: number;
}

export class ApiError extends Error {
  public code?: string;
  public details?: string;
  public hint?: string;
  public status?: number;

  constructor(error: ApiErrorDetails) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
    this.status = error.status;
  }
}

/**
 * Enhanced API call wrapper with better error handling for Supabase
 */
export async function apiCall<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  fallbackData?: T | null,
  operationName = 'API call'
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    console.log(`Starting ${operationName}...`);
    
    const result = await operation();
    
    if (result.error) {
      const errorDetails: ApiErrorDetails = {
        code: result.error.code,
        message: result.error.message || 'Unknown API error',
        details: result.error.details,
        hint: result.error.hint,
        status: result.error.status,
      };

      console.warn(`${operationName} failed:`, errorDetails);

      // Handle specific error cases
      if (result.error.code === '406' || result.error.status === 406) {
        console.warn('API returned 406 (Not Acceptable) - possible RLS policy issue');
        if (fallbackData !== undefined) {
          console.log(`Using fallback data for ${operationName}`);
          return { data: fallbackData, error: null };
        }
      }

      if (result.error.code === '42501' || result.error.message?.includes('permission denied')) {
        console.warn('Permission denied - likely RLS policy restricting access');
        if (fallbackData !== undefined) {
          console.log(`Using fallback data for ${operationName}`);
          return { data: fallbackData, error: null };
        }
      }

      return { data: null, error: new ApiError(errorDetails) };
    }

    console.log(`${operationName} completed successfully`);
    return { data: result.data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error occurred';
    console.error(`${operationName} threw exception:`, err);
    
    if (fallbackData !== undefined) {
      console.log(`Using fallback data for ${operationName} due to exception`);
      return { data: fallbackData, error: null };
    }

    return { 
      data: null, 
      error: new ApiError({ 
        message: errorMessage, 
        details: 'Exception thrown during API call' 
      }) 
    };
  }
}

/**
 * Tenant-specific API wrapper with development fallbacks
 */
export async function getTenantBySlug(slug: string) {
  const fallbackTenant = {
    id: `fallback-${slug}`,
    name: slug.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    slug,
    status: 'active',
    timezone: 'UTC',
    currency: 'USD',
    description: `Fallback tenant for ${slug}`,
    phone: '+1-555-0123',
    email: `contact@${slug}.com`,
    website: `https://${slug}.com`,
    address: {
      street: '123 Main Street',
      city: 'Demo City',
      state: 'Demo State',
      country: 'United States',
      postal_code: '12345'
    },
    cuisine_type_id: 'fallback-cuisine',
    logo_url: null,
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // For localhost development, always return fallback
  if (window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.0.0.1')) {
    console.log(`Using localhost fallback tenant for slug: ${slug}`);
    return { data: fallbackTenant, error: null };
  }

  return apiCall(
    () => supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single(),
    fallbackTenant,
    `getTenantBySlug(${slug})`
  );
}

/**
 * User tenant relationship lookup with fallbacks
 */
export async function getUserTenant(userId: string) {
  return apiCall(
    () => supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        tenants (
          id,
          name,
          slug,
          status,
          timezone,
          currency,
          description,
          phone,
          email,
          website,
          address,
          cuisine_type_id,
          logo_url,
          primary_color,
          secondary_color,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single(),
    null,
    `getUserTenant(${userId})`
  );
}

/**
 * Check API connectivity and database health
 */
export async function checkApiHealth() {
  console.log('Checking API health...');
  
  const tests = [
    {
      name: 'Basic connectivity',
      test: () => supabase.from('tenants').select('count', { count: 'exact', head: true })
    },
    {
      name: 'Authentication status',
      test: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        return { data: user ? 'authenticated' : 'anonymous', error: null };
      }
    }
  ];

  const results = [];
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      results.push({
        test: name,
        success: !result.error,
        error: result.error?.message,
        data: result.data
      });
    } catch (err) {
      results.push({
        test: name,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        data: null
      });
    }
  }
  
  console.log('API Health Check Results:', results);
  return results;
}
