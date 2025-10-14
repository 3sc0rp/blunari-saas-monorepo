/**
 * PRODUCTION FIX: Enhanced authentication manager for Supabase Edge Functions
 * Handles 403 errors and authentication failures gracefully
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface AuthHeaders {
  [key: string]: string;
  'Authorization': string;
  'Content-Type': string;
  'apikey': string;
}

interface EdgeFunctionOptions {
  functionName: string;
  body?: any;
  retries?: number;
  timeout?: number;
}

class SupabaseAuthManager {
  private maxRetries = 3;
  private baseTimeout = 5000; // 5 seconds

  async getValidSession() {
    try {
      // First try to get the current session
      let { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.warn('Session retrieval error, attempting refresh', {
          component: 'SupabaseAuthManager',
          error: error.message
        });
      }

      // If no session or expired, try to refresh
      if (!session || this.isSessionExpired(session)) {
        logger.info('Session expired or missing, attempting refresh', {
          component: 'SupabaseAuthManager'
        });
        
        const refreshResult = await supabase.auth.refreshSession();
        session = refreshResult.data.session;
        error = refreshResult.error;
        
        if (error) {
          logger.warn('Session refresh failed', {
            component: 'SupabaseAuthManager',
            error: error.message
          });
        }
      }

      // Additional validation: ensure the session has required fields
      if (session && (!session.access_token || !session.user)) {
        logger.warn('Session missing required fields', {
          component: 'SupabaseAuthManager',
          hasAccessToken: !!session.access_token,
          hasUser: !!session.user
        });
        
        // Try one more refresh to get valid session
        const refreshResult = await supabase.auth.refreshSession();
        session = refreshResult.data.session;
        error = refreshResult.error;
      }

      return { session, error };
    } catch (error) {
      logger.error('Authentication manager error', error instanceof Error ? error : new Error('Unknown auth error'), {
        component: 'SupabaseAuthManager'
      });
      return { session: null, error };
    }
  }

  private isSessionExpired(session: any): boolean {
    if (!session?.expires_at) return true;
    
    // Check if session expires in the next 5 minutes
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    return expiresAt < fiveMinutesFromNow;
  }

  private async getAuthHeaders(): Promise<AuthHeaders | null> {
    const { session, error } = await this.getValidSession();
    
    if (error || !session?.access_token) {
      logger.warn('Unable to get valid auth headers', {
        component: 'SupabaseAuthManager',
        hasSession: !!session,
        hasAccessToken: !!session?.access_token
      });
      return null;
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
    };
  }

  async callEdgeFunction<T = any>(options: EdgeFunctionOptions): Promise<{ data: T | null; error: any }> {
    const { functionName, body, retries = this.maxRetries, timeout = this.baseTimeout } = options;
    
    // Skip noisy edge function calls that aren't critical for data display
    if (import.meta.env.MODE === 'development' && 
        ['tenant', 'get-kpis', 'list-tables', 'list-reservations'].includes(functionName)) {
      console.log(`[SupabaseAuthManager] Skipping ${functionName} in dev mode`);
      return {
        data: null,
        error: { message: `${functionName} disabled in dev`, code: 'DEV_SKIP', status: 401 }
      };
    }
    
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.debug(`Edge function attempt ${attempt}/${retries}`, {
          component: 'SupabaseAuthManager',
          functionName
        });

        const headers = await this.getAuthHeaders();
        
        if (!headers) {
          // If we can't get auth headers, check if we need to redirect to auth
          const { session } = await this.getValidSession();
          
          if (!session) {
            logger.info('No valid session available, authentication required', {
              component: 'SupabaseAuthManager',
              functionName
            });
            
            return {
              data: null,
              error: { 
                message: 'Authentication required', 
                code: 'NO_AUTH',
                status: 401,
                requiresAuth: true
              }
            };
          }
          
          logger.info('Auth headers unavailable despite valid session', {
            component: 'SupabaseAuthManager',
            functionName
          });
          
          return {
            data: null,
            error: { message: 'Authentication not available', code: 'NO_AUTH_HEADERS' }
          };
        }

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        );

        // Call the edge function with timeout
        const functionPromise = supabase.functions.invoke(functionName, {
          body,
          headers
        });

        const result = await Promise.race([functionPromise, timeoutPromise]) as any;
        
        // If successful, return immediately
        if (!result.error) {
          logger.debug('Edge function call successful', {
            component: 'SupabaseAuthManager',
            functionName,
            attempt
          });
          return result;
        }

        lastError = result.error;
        
        // Enhanced error handling for specific status codes
        if (result.error?.status === 401 || result.error?.status === 403) {
          logger.warn('Authentication/authorization error in Edge Function', {
            component: 'SupabaseAuthManager',
            functionName,
            status: result.error.status,
            message: result.error.message
          });
          
          // For auth errors, try to refresh session once
          if (attempt === 1) {
            logger.info('Attempting session refresh for auth error', {
              component: 'SupabaseAuthManager',
              functionName
            });
            
            const refreshResult = await supabase.auth.refreshSession();
            if (refreshResult.data.session) {
              logger.info('Session refreshed successfully, retrying', {
                component: 'SupabaseAuthManager',
                functionName
              });
              continue;
            }
          }
          
          // If refresh failed or this is a repeated auth error, don't retry
          return {
            data: null,
            error: {
              ...result.error,
              requiresAuth: result.error.status === 401
            }
          };
        }
        
        // Check if this is a retryable error
        if (this.isRetryableError(result.error) && attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          logger.info(`Retrying edge function call in ${delay}ms`, {
            component: 'SupabaseAuthManager',
            functionName,
            attempt,
            error: result.error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If not retryable or max retries reached, return the error
        logger.warn('Edge function call failed', {
          component: 'SupabaseAuthManager',
          functionName,
          attempt,
          error: result.error.message,
          status: result.error.status
        });
        
        return result;

      } catch (error) {
        lastError = error;
        
        logger.warn(`Edge function call attempt ${attempt} failed`, {
          component: 'SupabaseAuthManager',
          functionName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (attempt === retries) {
          return {
            data: null,
            error: error instanceof Error ? error : new Error('Edge function call failed')
          };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return {
      data: null,
      error: lastError || new Error('Max retries exceeded')
    };
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const code = error.code || '';
    const status = error.status || 0;
    
    // Retry on network errors, timeouts, and some server errors
    const isRetryable = (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      code === 'NETWORK_ERROR' ||
      code === 'TIMEOUT' ||
      (status >= 500 && status < 600) // Server errors
    );

    // Do NOT retry on authentication errors to avoid infinite loops
    const isAuthError = (
      status === 401 || 
      status === 403 ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('auth') ||
      code === 'AUTH_REQUIRED' ||
      code === 'AUTH_INVALID' ||
      code === 'ACCESS_DENIED'
    );

    // Special handling for specific Edge Function errors
    if (status === 400 && message.includes('bad request')) {
      logger.debug('400 Bad Request - not retrying', {
        component: 'SupabaseAuthManager',
        error: message
      });
      return false;
    }

    return isRetryable && !isAuthError;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { session } = await this.getValidSession();
      return !!session;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const authManager = new SupabaseAuthManager();

// Convenience function for calling tenant edge function
export async function callTenantFunction(body?: any) {
  // Ensure we always send valid JSON, even for empty requests
  const requestBody = body && Object.keys(body).length > 0 ? body : undefined;
  
  return authManager.callEdgeFunction({
    functionName: 'tenant',
    body: requestBody,
    retries: 2, // Fewer retries for tenant function
    timeout: 8000 // Longer timeout for tenant resolution
  });
}

// Convenience function for calling other edge functions
export async function callEdgeFunction(functionName: string, body?: any, options?: Partial<EdgeFunctionOptions>) {
  return authManager.callEdgeFunction({
    functionName,
    body,
    ...options
  });
}

export default authManager;
