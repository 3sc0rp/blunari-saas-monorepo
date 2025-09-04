import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TenantInfo, TenantInfoZ } from '@/lib/contracts';
import { parseError, toastError } from '@/lib/errors';
import { z } from 'zod';

const TenantErrorZ = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string()
});

interface TenantState {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
  requestId: string | null;
}

// Global tenant cache
let cachedTenant: TenantInfo | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to resolve and manage tenant context
 * Handles both slug-based routing and session-based tenant resolution
 */
export function useTenant() {
  const [state, setState] = useState<TenantState>({
    tenant: null,
    loading: true,
    error: null,
    requestId: null
  });

  const params = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  
  const resolveTenant = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null, requestId: null }));

      // Check cache first (only for user-based resolution, not slug-based)
      if (!params.slug && cachedTenant && Date.now() < cacheExpiry) {
        setState({
          tenant: cachedTenant,
          loading: false,
          error: null,
          requestId: null
        });
        return;
      }

      // Get user session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        console.log('No active session, redirecting to login');
        navigate('/auth');
        return;
      }

      // Call the tenant Edge Function
      const { data: responseData, error: functionError } = await supabase.functions.invoke('tenant', {
        body: params.slug ? { slug: params.slug } : {}
      });

      if (functionError) {
        console.error('Tenant function error:', functionError);
        
        // Handle specific error cases
        if (functionError.message?.includes('401') || functionError.message?.includes('unauthorized')) {
          navigate('/auth');
          return;
        }
        
        setState({
          tenant: null,
          loading: false,
          error: 'Unable to resolve restaurant. Please try again.',
          requestId: null
        });
        return;
      }

      // Handle error responses from the function
      if (responseData?.error) {
        const tenantError = TenantErrorZ.parse(responseData.error);
        console.error('Tenant resolution error:', tenantError);
        
        setState({
          tenant: null,
          loading: false,
          error: tenantError.message,
          requestId: tenantError.requestId
        });

        // Handle specific error codes
        if (tenantError.code === 'TENANT_NOT_FOUND') {
          toastError(new Error(tenantError.message), 'Restaurant Not Found');
        } else if (tenantError.code === 'ACCESS_DENIED') {
          toastError(new Error(tenantError.message), 'Access Denied');
        } else if (tenantError.code === 'NO_TENANT_ACCESS') {
          toastError(new Error('Your account doesn\'t have access to any restaurants. Please contact support.'), 'No Restaurant Access');
        }
        return;
      }

      // Handle successful response
      if (responseData?.data) {
        const tenant = TenantInfoZ.parse(responseData.data);
        
        // Cache the result (only for user-based resolution)
        if (!params.slug) {
          cachedTenant = tenant;
          cacheExpiry = Date.now() + CACHE_DURATION;
        }
        
        setState({
          tenant,
          loading: false,
          error: null,
          requestId: null
        });
        return;
      }

      // Fallback error
      setState({
        tenant: null,
        loading: false,
        error: 'No restaurant data received',
        requestId: null
      });

    } catch (error) {
      const parsedError = parseError(error);
      console.error('Tenant resolution failed:', parsedError);
      
      setState({
        tenant: null,
        loading: false,
        error: parsedError.message,
        requestId: null
      });

      // Only toast error if it's not an auth issue (handled elsewhere)
      if (!parsedError.message.includes('auth') && !parsedError.message.includes('User not authenticated')) {
        toastError(parsedError, 'Failed to load restaurant information');
      }
    }
  }, [params.slug, navigate]);

  const refreshTenant = useCallback(() => {
    // Clear cache on refresh
    cachedTenant = null;
    cacheExpiry = 0;
    resolveTenant();
  }, [resolveTenant]);

  const clearCache = useCallback(() => {
    cachedTenant = null;
    cacheExpiry = 0;
  }, []);

  // Resolve tenant on mount and slug changes
  useEffect(() => {
    resolveTenant();
  }, [resolveTenant]);

  // Listen for auth changes to clear cache
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        clearCache();
        resolveTenant();
      } else if (event === 'SIGNED_OUT') {
        clearCache();
        setState({
          tenant: null,
          loading: false,
          error: null,
          requestId: null
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [resolveTenant, clearCache]);

  return {
    tenant: state.tenant,
    tenantId: state.tenant?.id || null, // Use id from new schema
    loading: state.loading,
    error: state.error,
    requestId: state.requestId,
    refreshTenant,
    clearCache
  };
}

/**
 * Hook to get current tenant ID (throws if not available)
 */
export function useRequiredTenant() {
  const { tenant, tenantId, loading, error } = useTenant();

  if (loading) {
    throw new Promise(resolve => {
      // This will suspend the component until tenant is loaded
      const checkTenant = () => {
        if (!loading) {
          resolve(undefined);
        } else {
          setTimeout(checkTenant, 100);
        }
      };
      checkTenant();
    });
  }

  if (error || !tenantId) {
    throw new Error(error || 'Tenant not found');
  }

  return { tenant: tenant!, tenantId };
}
