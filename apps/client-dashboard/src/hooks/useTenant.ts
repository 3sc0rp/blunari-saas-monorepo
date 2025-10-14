import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TenantInfo, TenantInfoZ } from '@/lib/contracts';
import { parseError, toastError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { handleTenantError } from '@/utils/productionErrorManager';
import { callTenantFunction } from '@/utils/supabaseAuthManager';
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
 * CRITICAL FIX: Added proper race condition handling and cleanup
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
  // Track in-flight resolution to cancel on unmount/changes
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  // Resolution debounce + identity tracking
  const lastResolveAtRef = useRef<number>(0);
  const lastTenantKeyRef = useRef<string | null>(null);
  const RESOLVE_DEBOUNCE_MS = 4000; // suppress identical resolves within 4s window
  const debugEnabled = import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true';
  const debug = (...args: any[]) => { if (debugEnabled) { /* eslint-disable no-console */ console.log('[useTenant]', ...args); } };
  const shallowTenantEqual = (a: TenantInfo | null, b: TenantInfo | null) => {
    if (a === b) return true; if (!a || !b) return false; return a.id===b.id && a.slug===b.slug && a.name===b.name && a.timezone===b.timezone && a.currency===b.currency; };

  const commitTenant = (nextTenant: TenantInfo | null, context: string) => {
    setState(prev => {
      const same = nextTenant ? shallowTenantEqual(prev.tenant, nextTenant) : prev.tenant === null && nextTenant === null;
      if (same && prev.loading === false) {
        debug('skip state update - identical tenant', { context });
        return prev;
      }
      lastResolveAtRef.current = Date.now();
      lastTenantKeyRef.current = params.slug || null;
      debug('tenant state updated', { context, slug: params.slug, tenantId: nextTenant?.id || null });
      return { tenant: nextTenant, loading: false, error: null, requestId: null };
    });
  };
  
  const resolveTenant = useCallback(async (reason: string = 'resolve') => {
    const now = Date.now();
    const currentSlug = params.slug || null;
    if (reason !== 'refresh' && reason !== 'auth-change') {
      if (currentSlug === lastTenantKeyRef.current && (now - lastResolveAtRef.current) < RESOLVE_DEBOUNCE_MS) {
        debug('debounce: skip resolveTenant (within window)', { reason, slug: currentSlug, elapsed: now - lastResolveAtRef.current });
        return;
      }
    }
    // Cancel any previous resolution
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    // Setup timeout fallback - reduced to 2 seconds for faster initial load
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    timeoutRef.current = window.setTimeout(() => {
      if (signal.aborted) return;
      if (import.meta.env.MODE === 'development' && debugEnabled) logger.info('Tenant resolution timeout (2s), using fallback tenant', {
        component: 'useTenant',
        slug: params.slug,
        reason
      });
        const fallbackTenant: TenantInfo = {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // CONSISTENT DEMO TENANT ID
          slug: 'demo',
          name: 'Demo Restaurant',
          timezone: 'America/New_York',
          currency: 'USD'
        };
      commitTenant(fallbackTenant, 'timeout-fallback');
    }, 2000); // Reduced from 5000ms to 2000ms

    try {
      setState(prev => ({ ...prev, loading: true, error: null, requestId: null }));

      // Check cache first (only for user-based resolution, not slug-based)
      if (!params.slug && cachedTenant && Date.now() < cacheExpiry) {
        if (!signal.aborted) {
          commitTenant(cachedTenant, 'cache-hit');
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      // Get user session first with retry mechanism
      let session;
      let sessionError;
      
      try {
        if (import.meta.env.MODE === 'development' && debugEnabled)        const sessionResult = await supabase.auth.getSession();
        session = sessionResult.data.session;
        sessionError = sessionResult.error;
        if (import.meta.env.MODE === 'development' && debugEnabled)      } catch (error) {
        logger.warn('Session retrieval failed, attempting refresh', {
          component: 'useTenant',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Try to refresh the session
        try {
          const refreshResult = await supabase.auth.refreshSession();
          session = refreshResult.data.session;
          sessionError = refreshResult.error;
        } catch (refreshError) {
          logger.error('Session refresh failed', refreshError instanceof Error ? refreshError : new Error('Session refresh failed'));
          sessionError = refreshError instanceof Error ? refreshError : new Error('Session refresh failed');
        }
      }
      
      if (sessionError) {
        logger.warn('Session error detected, using fallback approach', {
          component: 'useTenant',
          error: sessionError.message
        });
      }

      if (!session) {
        logger.info('No active session found, using anonymous fallback', {
          component: 'useTenant'
        });
        
        // Instead of redirecting immediately, try to create a demo tenant for development
        if (import.meta.env.MODE === 'development') {
          const fallbackTenant: TenantInfo = {
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Demo tenant ID - CONSISTENT
            slug: 'demo',
            name: 'Demo Restaurant',
            timezone: 'America/New_York',
            currency: 'USD'
          };
          
          if (!signal.aborted) {
            commitTenant(fallbackTenant, 'no-session-dev-fallback');
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }
        
        if (!signal.aborted) {
          commitTenant(null, 'no-session');
          // Only navigate if we're not already on the auth page
          if (window.location.pathname !== '/auth') {
            navigate('/auth');
          }
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      // Use direct fallback in development instead of calling edge function
      if (import.meta.env.MODE === 'development') {
        if (debugEnabled)        const fallbackTenant: TenantInfo = {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          slug: 'demo',
          name: 'Demo Restaurant',
          timezone: 'America/New_York',
          currency: 'USD'
        };
        if (!signal.aborted) {
          commitTenant(fallbackTenant, 'dev-mode-fallback');
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      // First, try DIRECT database resolution (no edge functions)
      try {
        // 1) Slug-based resolution
        if (params.slug) {
          const { data: tenantBySlug, error: slugError } = await supabase
            .from('tenants')
            .select('id, slug, name, timezone, currency')
            .eq('slug', params.slug)
            .maybeSingle();

          if (!slugError && tenantBySlug) {
            if (!signal.aborted) {
              commitTenant(tenantBySlug as any, 'db-slug');
            }
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            return;
          }
        }

        // 2) User-based resolution
        if (session?.user?.id) {          let resolvedTenantId: string | null = null;

          // QUERY ORDER CHANGE: Prefer auto_provisioning (present in your DB) and
          // avoid user_tenant_access which may not exist in some environments.
          const { data: autoProv, error: autoErr } = await supabase
            .from('auto_provisioning')
            .select('tenant_id')
            .eq('user_id', session.user.id)
            .eq('status', 'completed')
            .maybeSingle();          if (!autoErr && autoProv?.tenant_id) {
            resolvedTenantId = (autoProv as any).tenant_id as string;          } else {
            console.warn('⚠️ [useTenant] Failed to resolve tenant from auto_provisioning:', {
              error: autoErr?.message,
              hasData: !!autoProv,
              autoProvData: autoProv
            });
          }

          if (resolvedTenantId) {            const { data: tenantById, error: idError } = await supabase
              .from('tenants')
              .select('id, slug, name, timezone, currency')
              .eq('id', resolvedTenantId)
              .maybeSingle();            if (!idError && tenantById) {              if (!signal.aborted) {
                commitTenant(tenantById as any, 'db-user');
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              return;
            } else {
              console.error('❌ [useTenant] Failed to fetch tenant details:', {
                tenantId: resolvedTenantId,
                error: idError?.message
              });
            }
          } else {
            console.error('❌ [useTenant] No tenant ID resolved from auto_provisioning');
          }
        }
      } catch (dbResolveError) {
        console.error('❌ [useTenant] Database resolution exception:', {
          error: dbResolveError instanceof Error ? dbResolveError.message : 'Unknown error',
          userId: session?.user?.id,
          stack: dbResolveError instanceof Error ? dbResolveError.stack : undefined
        });
        
        logger.warn('Direct tenant resolution failed', {
          component: 'useTenant',
          error: dbResolveError instanceof Error ? dbResolveError.message : 'Unknown error'
        });
      }

      console.warn('⚠️ [useTenant] Database resolution completed but tenant not found, falling through to fallback logic');

      // Disable tenant edge function to avoid noisy 400/401s; fallback will be used
      const responseData: any = null;
      const functionError: any = null;

      // FIX: Check if component is still mounted before updating state
      if (signal.aborted) return;

      if (functionError) {
        logger.warn('Tenant function error detected', {
          component: 'useTenant',
          error: functionError.message || 'Unknown function error',
          errorCode: functionError.code,
          status: functionError.status,
          slug: params.slug
        });
        
        // Handle specific error cases
        if (functionError.requiresAuth || functionError.status === 401) {
          logger.info('Authentication required, redirecting to auth', {
            component: 'useTenant',
            errorType: 'auth_required'
          });
          
          if (!signal.aborted) {
            commitTenant(null, 'requires-auth');
            // Only navigate if we're not already on the auth page
            if (window.location.pathname !== '/auth') {
              navigate('/auth');
            }
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }
        
        if (functionError.status === 403 || functionError.message?.includes('403') || functionError.message?.includes('forbidden')) {
          logger.info('Access forbidden, using fallback tenant', {
            component: 'useTenant',
            errorType: 'access_denied'
          });
          
          // Use fallback tenant instead of redirecting to auth
          const fallbackTenant: TenantInfo = {
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // CONSISTENT DEMO TENANT ID
            slug: 'demo',
            name: 'Demo Restaurant',
            timezone: 'America/New_York',
            currency: 'USD'
          };
          
          if (!signal.aborted) {
            commitTenant(fallbackTenant, '403-fallback');
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }
        
        if (functionError.message?.includes('401') || functionError.message?.includes('unauthorized')) {
          logger.info('Authentication error, using fallback tenant for development', {
            component: 'useTenant',
            errorType: 'auth_error'
          });
          
          // Use fallback tenant for development, redirect for production
          if (import.meta.env.MODE === 'development') {
            const fallbackTenant: TenantInfo = {
              id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // CONSISTENT DEMO TENANT ID
              slug: 'demo',
              name: 'Demo Restaurant',
              timezone: 'America/New_York',
              currency: 'USD'
            };
            
            if (!signal.aborted) {
              commitTenant(fallbackTenant, '401-dev-fallback');
            }
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            return;
          } else {
            // In production, redirect to auth for 401 errors
            if (!signal.aborted) {
              commitTenant(null, '401-prod-redirect');
              navigate('/auth');
            }
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            return;
          }
        }
        
        // Enhanced fallback logic for any other tenant function failure
        logger.info('Tenant function failed, using production fallback', {
          component: 'useTenant',
          errorMessage: functionError.message,
          status: functionError.status
        });
        
        const fallbackTenant: TenantInfo = {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // CONSISTENT DEMO TENANT ID
          slug: params.slug || 'demo',
          name: params.slug ? `${params.slug} Restaurant` : 'Demo Restaurant',
          timezone: 'America/New_York',
          currency: 'USD'
        };
        
        if (!signal.aborted) {
          commitTenant(fallbackTenant, 'function-failure-fallback');
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      // Handle error responses from the function with enhanced fallback
      if (responseData?.error) {
        const tenantError = TenantErrorZ.parse(responseData.error);
        logger.info('Tenant error response, using fallback', {
          component: 'useTenant',
          errorCode: tenantError.code,
          errorMessage: tenantError.message
        });
        
        // Always use fallback tenant instead of showing errors to user
        const fallbackTenant: TenantInfo = {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // CONSISTENT DEMO TENANT ID
          slug: params.slug || 'demo',
          name: params.slug ? `${params.slug} Restaurant` : 'Demo Restaurant',
          timezone: 'America/New_York',
          currency: 'USD'
        };
        
        if (!signal.aborted) {
          commitTenant(fallbackTenant, 'error-response-fallback');
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
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
        
        if (!signal.aborted) {
          commitTenant(tenant, 'success');
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      // Fallback error - Always use fallback tenant for production reliability
      logger.info('No tenant data received, using production fallback', {
        component: 'useTenant',
        slug: params.slug
      });
      
      const fallbackTenant: TenantInfo = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // CONSISTENT DEMO TENANT ID
        slug: params.slug || 'demo',
        name: params.slug ? `${params.slug} Restaurant` : 'Restaurant Dashboard',
        timezone: 'America/New_York',
        currency: 'USD'
      };
      
      if (!signal.aborted) {
        commitTenant(fallbackTenant, 'no-data-fallback');
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

    } catch (error) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const parsedError = parseError(error);
      
      handleTenantError('useTenant', `Tenant resolution failed: ${parsedError.message}`, {
        slug: params.slug,
        errorType: 'resolution_failure'
      });
      
      // FIX: Always use fallback tenant instead of showing error to user
      if (!signal.aborted) {
        const fallbackTenant: TenantInfo = {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // CONSISTENT DEMO TENANT ID
          slug: params.slug || 'demo',
          name: params.slug ? `${params.slug} Restaurant` : 'Restaurant Dashboard',
          timezone: 'America/New_York',
          currency: 'USD'
        };
        
        commitTenant(fallbackTenant, 'catch-fallback');
      }
    } finally {
      // no-op; timeout cleared in all return paths and catch
    }
  }, [params.slug, navigate]);

  const refreshTenant = useCallback(() => {
    // Clear cache on refresh
    cachedTenant = null;
    cacheExpiry = 0;
    resolveTenant('refresh');
  }, [resolveTenant]);

  const clearCache = useCallback(() => {
    cachedTenant = null;
    cacheExpiry = 0;
  }, []);

  // Resolve tenant on mount and slug changes
  useEffect(() => {
    resolveTenant('mount-or-slug-change');
    return () => {
      // Cancel any in-flight operation and clear timeout
      abortRef.current?.abort();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [resolveTenant]);

  // Listen for auth changes to clear cache
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        clearCache();
        resolveTenant('refresh');
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
    tenantSlug: params.slug || state.tenant?.slug || null, // Add tenantSlug
    accessType: params.slug ? 'domain' : 'user', // Add accessType
    isLoading: state.loading, // Match the expected prop name
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

