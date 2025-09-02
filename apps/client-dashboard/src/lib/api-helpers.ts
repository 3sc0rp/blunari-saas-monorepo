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

    console.log(`${operationName} completed successfully with data:`, result.data);
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
    async () => {
      const result = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();
      return result;
    },
    `getTenantBySlug(${slug})`
  );
}

/**
 * User tenant relationship lookup - uses only real data
 */
export async function getUserTenant(userId: string) {
  return apiCall(
    async () => {
      const result = await supabase
        .rpc('get_user_tenant', { p_user_id: userId });
      
      // The function returns an array, get the first result
      if (result.data && result.data.length > 0) {
        const tenantInfo = result.data[0];
        
        // Get full tenant details
        const tenantResult = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantInfo.tenant_id)
          .single();
        
        if (tenantResult.error) {
          return { data: null, error: tenantResult.error };
        }
        
        // Return in the expected format for the hook
        return {
          data: {
            tenant_id: tenantInfo.tenant_id,
            tenants: tenantResult.data
          },
          error: null
        };
      }
      
      return { data: null, error: null };
    },
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
      test: async () => {
        const result = await supabase.from('tenants').select('count', { count: 'exact', head: true });
        return result;
      }
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
