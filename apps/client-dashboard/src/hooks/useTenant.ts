import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TenantInfo } from '@/lib/contracts';
import { parseError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { handleTenantError } from '@/utils/productionErrorManager';

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

    // Setup timeout fallback
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    timeoutRef.current = window.setTimeout(() => {
      if (signal.aborted) return;
      logger.warn('Tenant resolution timeout (5s)', { component: 'useTenant', slug: params.slug, reason });
      setState(prev => ({ ...prev, loading: false, error: 'Tenant resolution timeout', requestId: prev.requestId }));
    }, 5000);

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
        if (import.meta.env.MODE === 'development' && debugEnabled) console.log('[useTenant] Getting session...');
        const sessionResult = await supabase.auth.getSession();
        session = sessionResult.data.session;
        sessionError = sessionResult.error;
        if (import.meta.env.MODE === 'development' && debugEnabled) console.log('[useTenant] Session result:', { 
          hasSession: !!session, 
          userId: session?.user?.id, 
          email: session?.user?.email,
          error: sessionError?.message 
        });
      } catch (error) {
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
        if (!signal.aborted) {
          commitTenant(null, 'no-session');
          if (window.location.pathname !== '/auth') navigate('/auth');
        }
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        return;
      }

      // Always resolve from DB; no demo fallbacks

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

        // 2) User-based resolution (auto_provisioning only; some environments lack user_tenant_access)
        if (session?.user?.id) {
          let resolvedTenantId: string | null = null;

          // Resolve via auto_provisioning mapping
          const { data: autoProv, error: autoErr } = await supabase
            .from('auto_provisioning')
            .select('tenant_id')
            .eq('user_id', session.user.id)
            .eq('status', 'completed')
            .maybeSingle();
          if (!resolvedTenantId && !autoErr && autoProv?.tenant_id) {
            resolvedTenantId = (autoProv as any).tenant_id as string;
          }

          if (resolvedTenantId) {
            const { data: tenantById, error: idError } = await supabase
              .from('tenants')
              .select('id, slug, name, timezone, currency')
              .eq('id', resolvedTenantId)
              .maybeSingle();

            if (!idError && tenantById) {
              if (!signal.aborted) {
                commitTenant(tenantById as any, 'db-user');
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              return;
            }
          }
        }
      } catch (dbResolveError) {
        logger.warn('Direct tenant resolution failed', {
          component: 'useTenant',
          error: dbResolveError instanceof Error ? dbResolveError.message : 'Unknown error'
        });
      }

      // If we reach here, user has a session but no tenant mapping. Ensure one exists by provisioning.
      try {
        // Derive a friendly default name/slug from the user's email
        const userEmail: string | null = session.user.email || null;
        if (!userEmail) {
          logger.warn('Cannot auto-provision tenant: user email missing', { component: 'useTenant' });
          if (!signal.aborted) {
            commitTenant(null, 'missing-email');
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }
        const localPart = userEmail.split('@')[0] || 'tenant';
        const slugBase = localPart
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 40);

        // Attempt up to 3 slug variants to avoid collisions
        let finalTenant: TenantInfo | null = null;
        for (let attempt = 0; attempt < 3 && !finalTenant; attempt += 1) {
          const candidateSlug = attempt === 0 ? slugBase : `${slugBase}-${attempt + 1}`;
          const payload = {
            email: userEmail,
            password: '',
            restaurant_name: localPart.length > 1 ? localPart : 'Tenant',
            restaurant_slug: candidateSlug,
            timezone: 'America/New_York',
            currency: 'USD',
            admin_user_id: session.user.id
          };

          try {
            const { data: provData, error: provErr } = await supabase.functions.invoke('tenant-provision', {
              body: payload,
            });
            let provisionedTenantId: string | undefined = (provData as any)?.tenant_id as string | undefined;

            // If edge function fails (e.g., not yet deployed), fall back to RPC direct call
            if (provErr || !provisionedTenantId) {
              if (provErr) logger.warn('tenant-provision error', provErr);
              const { data: rpcId, error: rpcErr } = await supabase.rpc('provision_tenant', {
                p_user_id: session.user.id,
                p_restaurant_name: payload.restaurant_name,
                p_restaurant_slug: candidateSlug,
                p_timezone: payload.timezone,
                p_currency: payload.currency,
                p_description: null,
                p_phone: null,
                p_email: payload.email,
                p_website: null,
                p_address: null,
                p_cuisine_type_id: null,
              });
              if (rpcErr) {
                logger.warn('provision_tenant RPC error', { error: rpcErr });
                if (rpcErr.message && /slug|unique|duplicate/i.test(rpcErr.message)) {
                  continue;
                }
                break;
              }
              provisionedTenantId = rpcId as unknown as string | undefined;
            }

            if (provisionedTenantId) {
              const { data: tenantById } = await supabase
                .from('tenants')
                .select('id, slug, name, timezone, currency')
                .eq('id', provisionedTenantId)
                .maybeSingle();
              if (tenantById) {
                finalTenant = tenantById as any;
              }
            }
          } catch (provCatchErr) {
            logger.warn('Provisioning attempt failed', provCatchErr instanceof Error ? provCatchErr.message : provCatchErr);
          }
        }

        if (finalTenant) {
          if (!signal.aborted) {
            // Cache the result for user-based resolution
            cachedTenant = finalTenant;
            cacheExpiry = Date.now() + CACHE_DURATION;
            commitTenant(finalTenant, 'auto-provisioned');
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }
      } catch (ensureErr) {
  logger.warn('Auto-provisioning flow failed', { error: ensureErr instanceof Error ? ensureErr.message : 'Unknown error' });
      }
      // If we still have no tenant, commit a null state (fallback)
      if (!signal.aborted) {
        logger.info('Tenant resolution yielded no tenant', { component: 'useTenant', slug: params.slug });
        commitTenant(null, 'no-tenant');
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
        commitTenant(null, 'catch-fallback');
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
