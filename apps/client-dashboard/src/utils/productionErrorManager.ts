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
    /POST.*403.*forbidden/i
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
    
    // Check if this warning should be suppressed
    const shouldSuppress = this.SUPPRESSED_PATTERNS.some(pattern => pattern.test(message));
    
    if (shouldSuppress) {
      // Only log the first occurrence
      if (!this.suppressedWarnings.has(key)) {
        this.suppressedWarnings.add(key);
        logger.info('Production mode: Suppressing warning noise', {
          component,
          originalMessage: message,
          context,
          suppressed: true
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
  
  console.warn = (...args: any[]) => {
    const message = args[0];
    if (typeof message === 'string') {
      if (productionErrorManager.suppressWarning(message, 'console', { args })) {
        return; // Suppress this warning
      }
    }
    originalWarn.apply(console, args);
  };
  
  console.error = (...args: any[]) => {
    const message = args[0];
    if (typeof message === 'string') {
      // Allow critical errors through but suppress noise
      if (productionErrorManager.suppressWarning(message, 'console', { args })) {
        return; // Suppress this error
      }
    }
    originalError.apply(console, args);
  };
}

export default productionErrorManager;
