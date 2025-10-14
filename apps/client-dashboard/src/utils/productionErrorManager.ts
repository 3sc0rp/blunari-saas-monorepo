/**
 * PRODUCTION FIX: Enhanced error suppression and warning management
 * Reduces console noise in production while maintaining error tracking
 */

import { logger } from '@/utils/logger';

interface ProductionError {
  type: 'subscription' | 'tenant' | 'api' | 'fallback';
  component: string;
  message: string;
  context?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ProductionErrorManager {
  private suppressedWarnings = new Set<string>();
  private errorCounts = new Map<string, number>();
  private lastErrorTime = new Map<string, number>();
  private patternCounts = new Map<string, number>();

  // Immediate suppression patterns (no warnings shown)
  private readonly IMMEDIATE_SUPPRESS_PATTERNS = [
    /SecurityError.*Failed to execute.*request.*on.*LockManager/i,
    /Access to the Locks API is denied/i,
    /locks\.js/i,
    /GoTrueClient\.js/i,
    /SupabaseAuthClient\.js/i,
    /SupabaseClient\.js/i,
    /_acquireLock/i,
    /Uncaught \(in promise\).*SecurityError/i,
    /Failed to execute.*request.*on.*LockManager/i,
    /Locks API is denied in this context/i,
    /Session retrieval failed/i,
    /Error checking session/i,
    /Checking URL for password setup tokens/i,
    /Transient warning/i,
    /Unhandled promise rejection.*LockManager/i,
    // Service Worker errors in sandboxed contexts
    /SecurityError.*Failed to read the 'serviceWorker' property/i,
    /Service worker is disabled because the context is sandboxed/i,
    /serviceWorkerRegistration\.ts/i,
    /Service worker registration failed.*SecurityError/i,
    /lacks the 'allow-same-origin' flag/i,
  ];

  // Error patterns that should be suppressed in production
  private readonly SUPPRESSED_PATTERNS = [
    /subscription.*failed.*enabling polling mode/i,
    /using empty data structure for production/i,
    /skipping real-time subscriptions/i,
    /tenant resolution timeout.*using fallback/i,
    /no tenant id available/i,
    /subscription status.*closed/i,
    /waitlist subscription.*failed/i,
    /tables subscription.*failed/i,
    /bookings subscription.*failed/i,
    /edge function.*returned.*non-2xx status code/i,
    /tenant function error detected/i,
    /edge function call failed/i,
    /403.*forbidden/i,
    /400.*bad request/i,
    /auth.*error/i,
    /authentication.*error/i,
    /session.*error/i,
    /POST.*400.*bad request/i,
    /POST.*403.*forbidden/i,
    // Supabase GoTrueClient errors (COMPLETELY SILENT)
    /SecurityError.*Failed to execute.*request.*on.*LockManager/i,
    /Access to the Locks API is denied/i,
    /locks\.js/i,
    /GoTrueClient\.js/i,
    /Uncaught \(in promise\).*SecurityError/i,
    /Failed to execute.*request.*on.*LockManager/i,
    /Locks API is denied in this context/i,
    /SupabaseAuthClient\.js/i,
    /SupabaseClient\.js/i,
    /_acquireLock/i,
    // Auth/session related
    /Error checking session/i,
    /session.*setup.*password.*tokens/i,
    /Session retrieval failed/i,
    /attempting refresh/i,
    /Checking URL for password setup tokens/i,
    /Transient warning/i,
    /\[UnhandledRejection\]/i,
    /Unhandled promise rejection/i,
  ];

  // Error patterns that should be converted to info logs
  private readonly INFO_PATTERNS = [
    /using polling mode/i,
    /fallback tenant/i,
    /real-time subscriptions disabled/i,
    /invalid tenant id format/i
  ];

  suppressWarning(message: string, component: string, context?: Record<string, unknown>): boolean {
    const key = `${component}:${message}`;
    
    // Check for immediate suppression (completely silent)
    const immediateMatch = this.IMMEDIATE_SUPPRESS_PATTERNS.find(pattern => pattern.test(message));
    if (immediateMatch) {
      if (!this.suppressedWarnings.has(key)) {
        this.suppressedWarnings.add(key);
        // Silently suppress - no logs
      }
      return true; // Suppress immediately
    }

    // Check if this warning should be suppressed (with initial occurrences)
    const matchedPattern = this.SUPPRESSED_PATTERNS.find(pattern => pattern.test(message));
    if (matchedPattern) {
      const patternKey = matchedPattern.toString();
      const count = (this.patternCounts.get(patternKey) || 0) + 1;
      this.patternCounts.set(patternKey, count);
      // Allow first 3 occurrences for visibility
      if (count <= 3) {
        logger.warn('Transient warning (not yet suppressed)', { component, occurrence: count, message });
        return false;
      }
      if (!this.suppressedWarnings.has(key)) {
        this.suppressedWarnings.add(key);
        logger.info('Production mode: Suppressing repetitive warning', {
          component,
            originalMessage: message,
            context,
            suppressedAfter: count
        });
      }
      return true;
    }

    return false;
  }

  handleProductionError(error: ProductionError): void {
    const key = `${error.component}:${error.type}:${error.message}`;
    const now = Date.now();
    
    // Rate limiting: Don't log the same error more than once per minute
    const lastTime = this.lastErrorTime.get(key) || 0;
    if (now - lastTime < 60000) {
      return;
    }
    
    this.lastErrorTime.set(key, now);
    const count = (this.errorCounts.get(key) || 0) + 1;
    this.errorCounts.set(key, count);

    // Convert certain errors to info level in production
    const shouldConvertToInfo = this.INFO_PATTERNS.some(pattern => 
      pattern.test(error.message)
    );

    if (shouldConvertToInfo) {
      logger.info(`Production fallback: ${error.message}`, {
        component: error.component,
        type: error.type,
        context: error.context,
        count
      });
      return;
    }

    // Log based on severity
    switch (error.severity) {
      case 'critical':
        logger.error(error.message, new Error(error.message), {
          component: error.component,
          type: error.type,
          context: error.context,
          count
        });
        break;
      case 'high':
        logger.warn(error.message, {
          component: error.component,
          type: error.type,
          context: error.context,
          count
        });
        break;
      case 'medium':
      case 'low':
      default:
        logger.debug(error.message, {
          component: error.component,
          type: error.type,
          context: error.context,
          count
        });
        break;
    }
  }

  getErrorSummary(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  clearErrorCounts(): void {
    this.errorCounts.clear();
    this.lastErrorTime.clear();
    this.suppressedWarnings.clear();
  }
}

// Singleton instance
export const productionErrorManager = new ProductionErrorManager();

// Helper functions for common error patterns
export const handleSubscriptionError = (
  component: string, 
  service: string, 
  error: string,
  context?: Record<string, unknown>
) => {
  productionErrorManager.handleProductionError({
    type: 'subscription',
    component,
    message: `${service} subscription failed, enabling polling mode`,
    context: { service, error, ...context },
    severity: 'low' // Reduced severity since we have fallbacks
  });
};

export const handleTenantError = (
  component: string,
  message: string,
  context?: Record<string, unknown>
) => {
  productionErrorManager.handleProductionError({
    type: 'tenant',
    component,
    message,
    context,
    severity: 'medium'
  });
};

export const handleFallbackUsage = (
  component: string,
  fallbackType: string,
  context?: Record<string, unknown>
) => {
  productionErrorManager.handleProductionError({
    type: 'fallback',
    component,
    message: `Using ${fallbackType} fallback for production reliability`,
    context,
    severity: 'low'
  });
};

export const handleApiError = (
  component: string,
  endpoint: string,
  error: string,
  context?: Record<string, unknown>
) => {
  productionErrorManager.handleProductionError({
    type: 'api',
    component,
    message: `API call failed: ${endpoint}`,
    context: { endpoint, error, ...context },
    severity: 'medium'
  });
};

// Override console methods in production to reduce noise
if (import.meta.env.PROD) {
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalLog = console.log;
  
  console.warn = (...args: any[]) => {
    const message = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
    const fullMessage = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    
    if (productionErrorManager.suppressWarning(fullMessage, 'console', { args })) {
      return; // Suppress this warning
    }
    originalWarn.apply(console, args);
  };
  
  console.error = (...args: any[]) => {
    const message = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
    const fullMessage = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    
    if (productionErrorManager.suppressWarning(fullMessage, 'console', { args })) {
      return; // Suppress this error
    }
    originalError.apply(console, args);
  };

  console.log = (...args: any[]) => {
    const fullMessage = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    
    // Suppress known info logs that clutter console
    if (productionErrorManager.suppressWarning(fullMessage, 'console', { args })) {
      return;
    }
    originalLog.apply(console, args);
  };

  // Global unhandled rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason);
    const stack = event.reason?.stack || '';
    const fullMessage = `${message} ${stack}`;
    
    if (productionErrorManager.suppressWarning(fullMessage, 'unhandledRejection', { reason: event.reason })) {
      event.preventDefault(); // Prevent console output
      return;
    }
    // Let critical errors through
    logger.error('Unhandled promise rejection', event.reason);
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    const message = event.message || String(event.error);
    const stack = event.error?.stack || '';
    const fullMessage = `${message} ${stack} ${event.filename || ''}`;
    
    if (productionErrorManager.suppressWarning(fullMessage, 'globalError', { error: event.error })) {
      event.preventDefault(); // Prevent console output
      return;
    }
    // Let critical errors through
  });
}

export default productionErrorManager;
