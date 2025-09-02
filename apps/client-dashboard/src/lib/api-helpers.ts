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

      console.error(`${operationName} failed:`, errorDetails);
      return { data: null, error: new ApiError(errorDetails) };
    }

    console.log(`${operationName} completed successfully`);
    return { data: result.data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error occurred';
    console.error(`${operationName} threw exception:`, err);
    
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
 * Tenant lookup by slug - uses only real data from API
 */
export async function getTenantBySlug(slug: string) {
  return apiCall(
    () => supabase
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .single(),
    `getTenantBySlug(${slug})`
  );
}

/**
 * User tenant relationship lookup - uses only real data
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
