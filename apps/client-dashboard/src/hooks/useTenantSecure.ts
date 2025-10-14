/**
 * Tenant Resolution Hook - Production Safe Version
 * CRITICAL FIX: Removed all hardcoded demo tenant fallbacks
 * 
 * This hook properly fails when tenant cannot be resolved,
 * preventing cross-tenant data exposure and security issues.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TenantInfo, TenantInfoZ } from '@/lib/contracts';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

interface TenantState {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
}

// Production environment check
      const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
const isDevelopment = import.meta.env.MODE === 'development';
const enableDevLogs = isDevelopment && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true';

/**
 * Securely resolve tenant without fallbacks
 * PRODUCTION SAFE: No hardcoded demo tenant
 */
export function useTenantSecure() {
  const [state, setState] = useState<TenantState>({
    tenant: null,
    loading: true,
    error: null
  });

  const params = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);
  const resolvedRef = useRef<boolean>(false);

  const debug = (...args: any[]) => {
    if (enableDevLogs) {    }
  };

  const setError = useCallback((error: string) => {
    setState({ tenant: null, loading: false, error });
    logger.error('Tenant resolution failed', new Error(error));
  }, []);

  const resolveTenant = useCallback(async () => {
    // Prevent multiple simultaneous resolutions
      if (resolvedRef.current) {
      debug('Resolution already in progress, skipping');
      return;
    }

    resolvedRef.current = true;

    // Cancel any previous resolution
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get user session
      debug('Getting user session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }

      const session = sessionData.session;

      // If no session, redirect to auth (don't fallback!)
      if (!session) {
        debug('No session found, redirecting to auth');
        if (signal.aborted) return;
        
        setState({ tenant: null, loading: false, error: 'Authentication required' });
        
        // Only navigate
      if (window.location.pathname !== '/auth' && window.location.pathname !== '/login') {
          navigate('/auth');
        }
        return;
      }

      debug('Session found:', { userId: session.user.id, email: session.user.email });

      // 1) Try slug-based resolution first (for public pages)
      if (params.slug) {
        debug('Resolving by slug:', params.slug);
        
        const { data: tenantBySlug, error: slugError } = await supabase
          .from('tenants')
          .select('id, slug, name, timezone, currency')
          .eq('slug', params.slug)
          .maybeSingle();

        if (!slugError && tenantBySlug) {
          debug('✅ Tenant resolved by slug');
          if (!signal.aborted) {
            setState({
              tenant: tenantBySlug as TenantInfo,
              loading: false,
              error: null
            });
          }
          return;
        }

        if (slugError) {
          debug('❌ Slug resolution error:', slugError.message);
        }
      }

      // 2) Try user-based resolution
      debug('Resolving by user ID:', session.user.id);

      // Check auto_provisioning table
      const { data: autoProv, error: autoErr } = await supabase
        .from('auto_provisioning')
        .select('tenant_id')
        .eq('user_id', session.user.id)
        .eq('status', 'completed')
        .maybeSingle();

      if (autoErr) {
        throw new Error(`Auto-provisioning query failed: ${autoErr.message}`);
      }

      if (!autoProv || !autoProv.tenant_id) {
        throw new Error('No tenant assignment found for this user. Please contact support.');
      }

      debug('✅ Tenant ID from auto_provisioning:', autoProv.tenant_id);

      // Fetch tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, slug, name, timezone, currency')
        .eq('id', autoProv.tenant_id)
        .maybeSingle();

      if (tenantError) {
        throw new Error(`Tenant fetch failed: ${tenantError.message}`);
      }

      if (!tenantData) {
        throw new Error('Tenant not found. Please contact support.');
      }

      debug('✅ Tenant resolved:', { id: tenantData.id, slug: tenantData.slug, name: tenantData.name });

      if (!signal.aborted) {
        setState({
          tenant: tenantData as TenantInfo,
          loading: false,
          error: null
        });
      }

    } catch (error: any) {
      if (signal.aborted) return;

      const errorMessage = error.message || 'Failed to resolve tenant';
      logger.error('Tenant resolution error', error);
      
      // In production, show user-friendly error
      if (isProduction) {
        toast.error('Unable to load your account. Please try logging in again.');
      }

      setState({
        tenant: null,
        loading: false,
        error: errorMessage
      });

      // Redirect to auth on critical failures
      if (window.location.pathname !== '/auth' && window.location.pathname !== '/login') {
        setTimeout(() => navigate('/auth'), 2000);
      }
    } finally {
      resolvedRef.current = false;
    }
  }, [params.slug, navigate]);

  // Initial resolution and auth state changes
  useEffect(() => {
    resolveTenant();

    // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      debug('Auth state changed:', event);
      
      if (event === 'SIGNED_IN') {
        resolveTenant();
      } else if (event === 'SIGNED_OUT') {
        setState({ tenant: null, loading: false, error: null });
        navigate('/auth');
      }
    });

    return () => {
      abortRef.current?.abort();
      subscription.unsubscribe();
    };
  }, [resolveTenant, navigate]);

  return {
    tenant: state.tenant,
    isLoading: state.loading,
    error: state.error,
    refetch: resolveTenant
  };
}

/**
 * Backward compatibility export
 * Use useTenantSecure for new code
 */
export const useTenant = useTenantSecure;




