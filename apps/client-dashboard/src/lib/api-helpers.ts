import { supabase } from "@/integrations/supabase/client";
import { getTenantWithFallback } from "./mock-tenants";

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
  operation: () => Promise<{ data: T | null; error: unknown }>,
  operationName = 'API call'
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    console.log(`Starting ${operationName}...`);
    
    const result = await operation();
    
    if (result.error) {
      const error = result.error as any; // Type assertion for Supabase error structure
      const errorDetails: ApiErrorDetails = {
        code: error?.code,
        message: error?.message || 'Unknown API error',
        details: error?.details,
        hint: error?.hint,
        status: error?.status,
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
 * Tenant lookup by slug - uses real API with fallback to mock data
 * Improved error handling and development experience
 */
export async function getTenantBySlug(slug: string) {
  return getTenantWithFallback(slug, async () => {
    return apiCall(
      async () => {
        // First try the main tenants table
        const result = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'active')
          .maybeSingle(); // Use maybeSingle() to handle no results gracefully
        
        // If no result, try the public view as fallback
        if (!result.data && !result.error) {
          console.log(`No tenant found with slug '${slug}', trying public view...`);
          const publicResult = await supabase
            .from('tenant_public_info')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();
          
          if (publicResult.data) {
            // Transform public view data to match tenant structure
            const transformedData = {
              id: publicResult.data.id,
              name: publicResult.data.name,
              slug: publicResult.data.slug,
              status: 'active', // Assume active since it's in public view
              timezone: publicResult.data.timezone,
              currency: publicResult.data.currency,
              description: publicResult.data.description,
              cuisine_type_id: publicResult.data.cuisine_type_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              email: null,
              primary_color: '#3b82f6',
              secondary_color: '#1e40af',
              logo_url: null,
              cover_image_url: null,
              website: null,
              address: null
            };
            return { data: transformedData, error: null };
          }
        }
        
        return result;
      },
      `getTenantBySlug(${slug})`
    );
  });
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
