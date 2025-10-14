/**
 * CRITICAL FIX: Professional logging utility to replace console.log/error
 * Provides structured logging with proper error handling and production safety
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const context = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : '';
    const error = entry.error ? ` | Error: ${entry.error.stack}` : '';
    return `[${timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${context}${error}`;
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    
    // In production, only log warnings and errors
    return level === 'error' || level === 'warn';
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date(),
      context,
      error
    };

    this.addToBuffer(entry);

    if (this.shouldLog('error')) {
      console.error(this.formatMessage(entry));
    }

    // In production, you could send to error reporting service here
    if (!this.isDevelopment && error) {
      // Example: Sentry.captureException(error);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'warn',
      message,
      timestamp: new Date(),
      context
    };

    this.addToBuffer(entry);

    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(entry));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date(),
      context
    };

    this.addToBuffer(entry);

    if (this.shouldLog('info')) {    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level: 'debug',
      message,
      timestamp: new Date(),
      context
    };

    this.addToBuffer(entry);

    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(entry));
    }
  }

  /**
   * Get recent log entries for debugging
   */
  getRecentLogs(count = 10): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Clear the log buffer
   */
  clearLogs(): void {
    this.logBuffer = [];
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports for common patterns
export const logError = (message: string, error?: Error, context?: Record<string, unknown>) => 
  logger.error(message, error, context);

export const logWarn = (message: string, context?: Record<string, unknown>) => 
  logger.warn(message, context);

export const logInfo = (message: string, context?: Record<string, unknown>) => 
  logger.info(message, context);

export const logDebug = (message: string, context?: Record<string, unknown>) => 
  logger.debug(message, context);

// Development-only logging
export const devLog = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) {  }
};

export default logger;

