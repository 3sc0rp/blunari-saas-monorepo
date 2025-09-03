import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TenantInfo, TenantInfoZ } from '@/lib/contracts';
import { parseError, toastError } from '@/lib/errors';

interface TenantState {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to resolve and manage tenant context
 * Handles both slug-based routing and session-based tenant resolution
 */
export function useTenant() {
  const [state, setState] = useState<TenantState>({
    tenant: null,
    loading: true,
    error: null
  });

  const params = useParams<{ slug?: string }>();
  
  const resolveTenant = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // First, try to get tenant from URL slug
      if (params.slug) {
        const { data, error } = await supabase.functions.invoke('tenant', {
          body: { slug: params.slug }
        });

        if (error) {
          throw error;
        }

        if (data) {
          const tenant = TenantInfoZ.parse(data);
          setState({
            tenant,
            loading: false,
            error: null
          });
          return;
        }
      }

      // Fallback: Get tenant from session/user context
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw authError;
      }

      if (!user) {
        setState({
          tenant: null,
          loading: false,
          error: 'User not authenticated'
        });
        return;
      }

      // Get tenant ID from user metadata or auto_provisioning table
      const { data: provisioningData, error: provisioningError } = await supabase
        .from('auto_provisioning')
        .select(`
          tenant_id,
          tenants (
            id,
            name,
            slug,
            timezone,
            currency
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .single();

      if (provisioningError) {
        throw provisioningError;
      }

      if (!provisioningData?.tenants) {
        setState({
          tenant: null,
          loading: false,
          error: 'No tenant found for user'
        });
        return;
      }

      const tenantData = provisioningData.tenants as any;
      const tenant: TenantInfo = {
        tenantId: tenantData.id,
        name: tenantData.name,
        slug: tenantData.slug,
        timezone: tenantData.timezone || 'America/New_York',
        currency: tenantData.currency || 'USD'
      };

      setState({
        tenant,
        loading: false,
        error: null
      });

    } catch (error) {
      const parsedError = parseError(error);
      console.error('Tenant resolution failed:', parsedError);
      
      setState({
        tenant: null,
        loading: false,
        error: parsedError.message
      });

      // Only toast error if it's not an auth issue (handled elsewhere)
      if (!parsedError.message.includes('auth') && !parsedError.message.includes('User not authenticated')) {
        toastError(parsedError, 'Failed to load restaurant information');
      }
    }
  }, [params.slug]);

  const refreshTenant = useCallback(() => {
    resolveTenant();
  }, [resolveTenant]);

  // Resolve tenant on mount and slug changes
  useEffect(() => {
    resolveTenant();
  }, [resolveTenant]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        resolveTenant();
      } else if (event === 'SIGNED_OUT') {
        setState({
          tenant: null,
          loading: false,
          error: null
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [resolveTenant]);

  return {
    tenant: state.tenant,
    tenantId: state.tenant?.tenantId || null,
    loading: state.loading,
    error: state.error,
    refreshTenant
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
