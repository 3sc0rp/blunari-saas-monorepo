import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { safeStorage, inSandboxedIframe } from '@/utils/safeStorage';

interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'owner';
  tenantId?: string;
  permissions: string[];
  lastLoginAt?: string;
  mfaEnabled: boolean;
  sessionTimeoutAt?: number;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
}

interface AuthConfig {
  sessionTimeout: number; // minutes
  requireMFA: boolean;
  maxFailedAttempts: number;
  lockoutDuration: number; // minutes
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

class EnterpriseAuthManager {
  /**
   * Supabase client with dynamic storage:
   * - Uses safeStorage which falls back to in-memory map when sandboxed (no persistence).
   * - Disables session persistence & auto refresh in sandboxed iframe to avoid SecurityErrors.
   */
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem: (k: string) => safeStorage.get(k),
            // supabase expects string | null
          setItem: (k: string, v: string) => safeStorage.set(k, v),
          removeItem: (k: string) => safeStorage.remove(k)
        } as Storage,
        persistSession: safeStorage.persistent && !inSandboxedIframe,
        autoRefreshToken: safeStorage.persistent && !inSandboxedIframe,
        detectSessionInUrl: true
      }
    }
  );

  private currentSession: AuthSession | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private sessionCheckTimer: NodeJS.Timeout | null = null;
  private failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

  private config: AuthConfig = {
    sessionTimeout: 60, // 1 hour
    requireMFA: false,
    maxFailedAttempts: 5,
    lockoutDuration: 15, // 15 minutes
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    }
  };

  constructor(config?: Partial<AuthConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize session check
    this.initializeSessionCheck();
    
    // Load existing session only when storage is persistent; sandboxed iframe sessions are ephemeral.
    if (safeStorage.persistent) {
      this.loadSessionFromStorage();
    } else if (inSandboxedIframe) {
      logger.info('Auth running in sandboxed iframe (ephemeral session only)', {
        component: 'EnterpriseAuthManager'
      });
    }

    logger.info('Enterprise Auth Manager initialized', {
      component: 'EnterpriseAuthManager',
      config: this.config
    });
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const startTime = performance.now();
    
    try {
      // Check for account lockout
      if (this.isAccountLocked(credentials.email)) {
        const lockoutEnd = this.getLockoutEndTime(credentials.email);
        throw new Error(`Account locked due to too many failed attempts. Try again after ${new Date(lockoutEnd).toLocaleString()}`);
      }

      logger.info('Login attempt started', {
        component: 'EnterpriseAuthManager',
        email: credentials.email,
        mfaProvided: !!credentials.mfaCode
      });

      // Validate password policy
      if (!this.validatePasswordPolicy(credentials.password)) {
        this.recordFailedAttempt(credentials.email);
        throw new Error('Password does not meet security requirements');
      }

      // Attempt authentication
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (authError) {
        this.recordFailedAttempt(credentials.email);
        logger.warn('Authentication failed', {
          component: 'EnterpriseAuthManager',
          email: credentials.email,
          error: authError.message
        });
        throw new Error(authError.message);
      }

      if (!authData.user) {
        this.recordFailedAttempt(credentials.email);
        throw new Error('Authentication failed');
      }

      // Fetch user profile and permissions
      const userProfile = await this.fetchUserProfile(authData.user.id);
      
      // Check MFA if required
      if (this.config.requireMFA && userProfile.mfaEnabled && !credentials.mfaCode) {
        // In a real implementation, you would trigger MFA challenge here
        throw new Error('MFA code required');
      }

      if (credentials.mfaCode && userProfile.mfaEnabled) {
        const mfaValid = await this.validateMFA(authData.user.id, credentials.mfaCode);
        if (!mfaValid) {
          this.recordFailedAttempt(credentials.email);
          throw new Error('Invalid MFA code');
        }
      }

      // Calculate session timeout
      const sessionTimeout = credentials.rememberMe 
        ? this.config.sessionTimeout * 24 // 24x for "remember me"
        : this.config.sessionTimeout;

      const expiresAt = Date.now() + (sessionTimeout * 60 * 1000);

      // Create session
      const session: AuthSession = {
        accessToken: authData.session?.access_token || '',
        refreshToken: authData.session?.refresh_token || '',
        expiresAt,
        user: {
          ...userProfile,
          lastLoginAt: new Date().toISOString(),
          sessionTimeoutAt: expiresAt
        }
      };

      // Update last login time
      await this.updateLastLogin(authData.user.id);

      // Store session
      this.currentSession = session;
      if (safeStorage.persistent) {
        this.saveSessionToStorage(session);
      }
      
      // Clear failed attempts
      this.failedAttempts.delete(credentials.email);

      // Start session management
      this.startSessionManagement();

      const duration = performance.now() - startTime;
      logger.info('Login successful', {
        component: 'EnterpriseAuthManager',
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        tenantId: session.user.tenantId,
        duration: `${duration.toFixed(2)}ms`
      });

      performanceMonitor.recordAPICall({
        endpoint: '/auth/login',
        method: 'POST',
        duration,
        status: 200,
        timestamp: Date.now(),
        tenantId: session.user.tenantId
      });

      return session;

    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown login error';
      
      logger.error('Login failed', error instanceof Error ? error : new Error(errorMessage), {
        component: 'EnterpriseAuthManager',
        email: credentials.email,
        duration: `${duration.toFixed(2)}ms`
      });

      performanceMonitor.recordAPICall({
        endpoint: '/auth/login',
        method: 'POST',
        duration,
        status: 401,
        timestamp: Date.now()
      });

      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      logger.info('Logout initiated', {
        component: 'EnterpriseAuthManager',
        userId: this.currentSession?.user.id
      });

      // Clear timers
      this.stopSessionManagement();

      // Sign out from Supabase
      await this.supabase.auth.signOut();

      // Clear session data
      this.currentSession = null;
      this.clearSessionFromStorage();

      logger.info('Logout completed', {
        component: 'EnterpriseAuthManager'
      });

    } catch (error) {
      logger.error('Logout error', error instanceof Error ? error : new Error('Unknown logout error'), {
        component: 'EnterpriseAuthManager'
      });
      throw error;
    }
  }

  async refreshSession(): Promise<AuthSession | null> {
    if (!this.currentSession) {
      return null;
    }

    try {
      logger.debug('Refreshing session', {
        component: 'EnterpriseAuthManager',
        userId: this.currentSession.user.id
      });

      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: this.currentSession.refreshToken
      });

      if (error || !data.session) {
        logger.warn('Session refresh failed', {
          component: 'EnterpriseAuthManager',
          error: error?.message
        });
        await this.logout();
        return null;
      }

      // Update session with new tokens
      this.currentSession.accessToken = data.session.access_token;
      this.currentSession.refreshToken = data.session.refresh_token;
      this.currentSession.expiresAt = Date.now() + (this.config.sessionTimeout * 60 * 1000);

      if (safeStorage.persistent) {
        this.saveSessionToStorage(this.currentSession);
      }

      logger.debug('Session refreshed successfully', {
        component: 'EnterpriseAuthManager',
        userId: this.currentSession.user.id
      });

      return this.currentSession;

    } catch (error) {
      logger.error('Session refresh error', error instanceof Error ? error : new Error('Unknown refresh error'), {
        component: 'EnterpriseAuthManager'
      });
      await this.logout();
      return null;
    }
  }

  getCurrentUser(): AuthUser | null {
    return this.currentSession?.user || null;
  }

  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    return user.permissions.includes(permission) || user.role === 'admin';
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  isSessionValid(): boolean {
    if (!this.currentSession) return false;
    
    return Date.now() < this.currentSession.expiresAt;
  }

  private async fetchUserProfile(userId: string): Promise<AuthUser> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        role,
        tenant_id,
        permissions,
        mfa_enabled
      `)
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new Error('Failed to fetch user profile');
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role,
      tenantId: data.tenant_id,
      permissions: data.permissions || [],
      mfaEnabled: data.mfa_enabled || false
    };
  }

  private async updateLastLogin(userId: string): Promise<void> {
    // Update last login time
    await this.supabase
      .from('user_profiles')
      .update({ 
        last_login_at: new Date().toISOString()
      })
      .eq('id', userId);

    // Increment login count using RPC call
    await this.supabase.rpc('increment_login_count', { user_id: userId });
  }

  private async validateMFA(userId: string, code: string): Promise<boolean> {
    // In a real implementation, you would validate the MFA code
    // This is a placeholder for MFA validation logic
    logger.debug('MFA validation requested', {
      component: 'EnterpriseAuthManager',
      userId
    });
    
    // Simulate MFA validation
    return code.length === 6 && /^\d+$/.test(code);
  }

  private validatePasswordPolicy(password: string): boolean {
    const policy = this.config.passwordPolicy;
    
    if (password.length < policy.minLength) return false;
    if (policy.requireUppercase && !/[A-Z]/.test(password)) return false;
    if (policy.requireLowercase && !/[a-z]/.test(password)) return false;
    if (policy.requireNumbers && !/\d/.test(password)) return false;
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
    
    return true;
  }

  private recordFailedAttempt(email: string): void {
    const now = Date.now();
    const attempts = this.failedAttempts.get(email) || { count: 0, lastAttempt: 0 };
    
    // Reset count if last attempt was more than lockout duration ago
    if (now - attempts.lastAttempt > this.config.lockoutDuration * 60 * 1000) {
      attempts.count = 0;
    }
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    this.failedAttempts.set(email, attempts);
    
    logger.warn('Failed login attempt recorded', {
      component: 'EnterpriseAuthManager',
      email,
      attemptCount: attempts.count
    });
  }

  private isAccountLocked(email: string): boolean {
    const attempts = this.failedAttempts.get(email);
    if (!attempts) return false;
    
    const lockoutEnd = attempts.lastAttempt + (this.config.lockoutDuration * 60 * 1000);
    return attempts.count >= this.config.maxFailedAttempts && Date.now() < lockoutEnd;
  }

  private getLockoutEndTime(email: string): number {
    const attempts = this.failedAttempts.get(email);
    if (!attempts) return 0;
    
    return attempts.lastAttempt + (this.config.lockoutDuration * 60 * 1000);
  }

  private initializeSessionCheck(): void {
    this.sessionCheckTimer = setInterval(() => {
      if (this.currentSession && !this.isSessionValid()) {
        logger.info('Session expired, logging out', {
          component: 'EnterpriseAuthManager',
          userId: this.currentSession.user.id
        });
        this.logout();
      }
    }, 60000); // Check every minute
  }

  private startSessionManagement(): void {
    // Set up automatic refresh 5 minutes before expiration
    const refreshTime = this.currentSession!.expiresAt - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshSession();
      }, refreshTime);
    }
  }

  private stopSessionManagement(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private saveSessionToStorage(session: AuthSession): void {
    try {
      const sessionData = {
        ...session,
        user: {
          ...session.user,
          // Don't store sensitive data in localStorage
          permissions: session.user.permissions.slice(0, 10) // Limit stored permissions
        }
      };
      
  safeStorage.set('auth_session', JSON.stringify(sessionData));
    } catch (error) {
      logger.warn('Failed to save session to storage', {
        component: 'EnterpriseAuthManager'
      });
    }
  }

  private loadSessionFromStorage(): void {
    try {
  const stored = safeStorage.get('auth_session');
      if (stored) {
        const session = JSON.parse(stored) as AuthSession;
        
        // Validate stored session
        if (this.isStoredSessionValid(session)) {
          this.currentSession = session;
          this.startSessionManagement();
          
          logger.info('Session loaded from storage', {
            component: 'EnterpriseAuthManager',
            userId: session.user.id
          });
        } else {
          this.clearSessionFromStorage();
        }
      }
    } catch (error) {
      logger.warn('Failed to load session from storage', {
        component: 'EnterpriseAuthManager'
      });
      this.clearSessionFromStorage();
    }
  }

  private isStoredSessionValid(session: AuthSession): boolean {
    return session && 
           session.user && 
           session.accessToken && 
           session.expiresAt > Date.now();
  }

  private clearSessionFromStorage(): void {
  safeStorage.remove('auth_session');
  }

  destroy(): void {
    this.stopSessionManagement();
    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
    }
  }
}

// Singleton instance
export const authManager = new EnterpriseAuthManager({
  sessionTimeout: 120, // 2 hours
  requireMFA: false, // Enable in production
  maxFailedAttempts: 5,
  lockoutDuration: 15
});

export type { AuthUser, AuthSession, LoginCredentials, AuthConfig };
export default authManager;
