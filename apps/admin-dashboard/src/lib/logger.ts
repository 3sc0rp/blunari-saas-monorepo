/**
 * Centralized logging utility
 * - Development: Logs to console
 * - Production: Sends to Sentry (if configured)
 */

interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';
  private isProduction = import.meta.env.MODE === 'production';

  /**
   * Log error messages
   */
  error(message: string, context?: LogContext | Error): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, context);
    }

    // Send to Sentry in production
    if (this.isProduction && typeof window !== 'undefined' && window.Sentry) {
      if (context instanceof Error) {
        window.Sentry.captureException(context, {
          tags: { customMessage: message },
        });
      } else {
        window.Sentry.captureException(new Error(message), {
          extra: context,
        });
      }
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context);
    }

    if (this.isProduction && typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureMessage(message, {
        level: 'warning',
        extra: context,
      });
    }
  }

  /**
   * Log info messages (development only)
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context);
    }
  }

  /**
   * Log debug messages (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    if (this.isDevelopment) {
      const color = duration < 100 ? 'green' : duration < 500 ? 'orange' : 'red';
      console.log(
        `%c[PERF] ${operation}: ${duration.toFixed(2)}ms`,
        `color: ${color}`,
        context
      );
    }

    // Log slow operations to Sentry
    if (this.isProduction && duration > 1000 && window.Sentry) {
      window.Sentry.captureMessage(`Slow operation: ${operation}`, {
        level: 'warning',
        extra: { duration, ...context },
      });
    }
  }

  /**
   * Log security events
   */
  security(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    const severityEmoji = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };

    if (this.isDevelopment) {
      console.log(
        `${severityEmoji[severity]} [SECURITY] ${eventType}`,
        context
      );
    }

    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureMessage(`Security Event: ${eventType}`, {
        level: severity === 'critical' || severity === 'high' ? 'error' : 'warning',
        tags: { eventType, severity },
        extra: context,
      });
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Extend Window type for Sentry
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: Record<string, unknown>) => void;
      captureMessage: (
        message: string,
        context?: {
          level?: 'error' | 'warning' | 'info';
          extra?: Record<string, unknown>;
          tags?: Record<string, string>;
        }
      ) => void;
    };
  }
}
