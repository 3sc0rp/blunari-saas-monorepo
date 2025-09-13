/**
 * Enterprise-Grade Logging System for Blunari SAAS
 * 
 * World-class features:
 * - Structured logging with correlation IDs
 * - Multiple log levels with filtering
 * - Performance metrics tracking
 * - Error aggregation and reporting
 * - Production-safe sensitive data handling
 * - Offline resilience with local storage
 * - Integration with monitoring services
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogContext {
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  component?: string;
  operation?: string;
  correlationId?: string;
  performance?: {
    startTime?: number;
    duration?: number;
    memoryUsage?: number;
  };
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  environment: string;
  version: string;
}

interface StoredLogEntry extends LogEntry {
  id: string;
  uploaded: boolean;
}

// Global window type extension
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, options?: any) => void;
    };
  }
}

/**
 * Enterprise Logger Class - World-class logging implementation
 */
class EnterpriseLogger {
  private readonly logLevel: LogLevel;
  private readonly environment: string;
  private readonly version: string;
  private readonly correlationId: string;
  private readonly sensitiveFields = new Set([
    'password', 'token', 'secret', 'key', 'authorization', 'cookie', 'jwt'
  ]);
  private defaultContext: LogContext = {};

  constructor() {
    this.logLevel = this.getLogLevel();
    this.environment = process.env.NODE_ENV || 'development';
    this.version = process.env.REACT_APP_VERSION || '1.0.0';
    this.correlationId = this.generateCorrelationId();
    
    this.initializeErrorReporting();
    this.scheduleLogUpload();
  }

  private getLogLevel(): LogLevel {
    const level = process.env.REACT_APP_LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'FATAL': return LogLevel.FATAL;
      default: return this.environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private generateCorrelationId(): string {
    return `blunari-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.sensitiveFields.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error
  ): LogEntry {
    const sanitizedContext = this.sanitizeData(context);
    
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...this.defaultContext,
        ...sanitizedContext,
        correlationId: context.correlationId || this.correlationId,
      },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: this.environment !== 'production' ? error.stack : undefined,
        code: (error as any).code || 'UNKNOWN_ERROR'
      } : undefined,
      environment: this.environment,
      version: this.version
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private outputLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    if (this.environment === 'development') {
      this.outputDevelopmentLog(entry);
    } else {
      this.outputProductionLog(entry);
    }

    this.sendToMonitoring(entry);
  }

  private outputDevelopmentLog(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const style = this.getLogStyle(entry.level);
    
    console.groupCollapsed(
      `%c[${levelName}]%c ${entry.message} %c${entry.timestamp}`,
      style,
      'color: inherit; font-weight: bold;',
      'color: #6B7280; font-size: 0.8em;'
    );
    
    if (Object.keys(entry.context).length > 0) {
      console.log('📋 Context:', entry.context);
    }
    
    if (entry.error) {
      console.error('❌ Error:', entry.error);
      if (entry.error.stack) {
        console.groupCollapsed('📚 Stack Trace');
        console.error(entry.error.stack);
        console.groupEnd();
      }
    }
    
    if (entry.context.performance) {
      const perf = entry.context.performance;
      console.log(
        `⚡ Performance: ${perf.duration?.toFixed(2)}ms, Memory: ${
          perf.memoryUsage ? `${(perf.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A'
        }`
      );
    }
    
    console.groupEnd();
  }

  private outputProductionLog(entry: LogEntry): void {
    const logMethod = this.getConsoleMethod(entry.level);
    logMethod(JSON.stringify(entry));
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG: return console.debug;
      case LogLevel.INFO: return console.info;
      case LogLevel.WARN: return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL: return console.error;
      default: return console.log;
    }
  }

  private getLogStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'color: #6B7280; font-weight: bold; background: #F9FAFB; padding: 2px 6px; border-radius: 3px;';
      case LogLevel.INFO: return 'color: #1D4ED8; font-weight: bold; background: #EFF6FF; padding: 2px 6px; border-radius: 3px;';
      case LogLevel.WARN: return 'color: #D97706; font-weight: bold; background: #FFFBEB; padding: 2px 6px; border-radius: 3px;';
      case LogLevel.ERROR: return 'color: #DC2626; font-weight: bold; background: #FEF2F2; padding: 2px 6px; border-radius: 3px;';
      case LogLevel.FATAL: return 'color: #FFFFFF; font-weight: bold; background: #DC2626; padding: 2px 6px; border-radius: 3px;';
      default: return 'color: inherit;';
    }
  }

  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    try {
      if (entry.level >= LogLevel.ERROR) {
        if (typeof window !== 'undefined' && window.Sentry) {
          window.Sentry.captureException(new Error(entry.message), {
            level: LogLevel[entry.level].toLowerCase() as any,
            contexts: { custom: entry.context },
            tags: {
              component: entry.context.component,
              operation: entry.context.operation,
              environment: entry.environment,
              version: entry.version,
              correlationId: entry.context.correlationId
            }
          });
        }

        if (typeof window !== 'undefined' && 'indexedDB' in window) {
          await this.storeLogLocally(entry);
        }
      }
    } catch (error) {
      console.warn('Failed to send log to monitoring service:', error);
    }
  }

  private async storeLogLocally(entry: LogEntry): Promise<void> {
    try {
      const db = await this.getLogDatabase();
      const transaction = db.transaction(['logs'], 'readwrite');
      const store = transaction.objectStore('logs');
      
      const logEntry: StoredLogEntry = {
        ...entry,
        id: `${entry.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        uploaded: false
      };
      
      store.add(logEntry);
      this.cleanupOldLogs(store);
    } catch (error) {
      console.warn('Failed to store log locally:', error);
    }
  }

  private async cleanupOldLogs(store: IDBObjectStore): Promise<void> {
    try {
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        if (countRequest.result > 1000) {
          const cursorRequest = store.openCursor();
          let deleteCount = countRequest.result - 1000;
          
          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor && deleteCount > 0) {
              cursor.delete();
              deleteCount--;
              cursor.continue();
            }
          };
        }
      };
    } catch (error) {
      console.warn('Failed to cleanup old logs:', error);
    }
  }

  private async getLogDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BlunariLogs', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('logs')) {
          const store = db.createObjectStore('logs', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('level', 'level');
          store.createIndex('uploaded', 'uploaded');
        }
      };
    });
  }

  private initializeErrorReporting(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.error('Uncaught JavaScript error', {
        component: 'global',
        operation: 'error_handler',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          message: event.message
        }
      }, event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        component: 'global',
        operation: 'promise_rejection_handler',
        metadata: {
          reason: event.reason
        }
      });
    });

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 1000) {
              this.warn('Slow operation detected', {
                component: 'performance',
                operation: 'performance_monitor',
                performance: {
                  duration: entry.duration,
                  startTime: entry.startTime
                },
                metadata: {
                  entryType: entry.entryType,
                  name: entry.name
                }
              });
            }
          }
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        this.warn('Performance observer not supported', { component: 'logger' });
      }
    }
  }

  private scheduleLogUpload(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      this.uploadStoredLogs();
    }, 5 * 60 * 1000);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.uploadStoredLogs();
        }
      });
    }
  }

  // Public API
  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.outputLog(entry);
  }

  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.outputLog(entry);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, error);
    this.outputLog(entry);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.outputLog(entry);
  }

  fatal(message: string, context?: LogContext, error?: Error): void {
    const entry = this.createLogEntry(LogLevel.FATAL, message, context, error);
    this.outputLog(entry);
  }

  startTimer(operation: string, context?: LogContext): () => void {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    return () => {
      const duration = performance.now() - startTime;
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      this.info(`⚡ Operation completed: ${operation}`, {
        ...context,
        operation,
        performance: {
          duration,
          startTime,
          memoryUsage: endMemory - startMemory
        }
      });
    };
  }

  createChildLogger(context: LogContext): EnterpriseLogger {
    const child = Object.create(this);
    child.defaultContext = { ...this.defaultContext, ...context };
    return child;
  }

  async uploadStoredLogs(): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) return;

    try {
      const db = await this.getLogDatabase();
      const transaction = db.transaction(['logs'], 'readwrite');
      const store = transaction.objectStore('logs');
      const index = store.index('uploaded');
      
      const request = index.getAll(IDBKeyRange.only(false));
      request.onsuccess = async () => {
        const unuploadedLogs = request.result as StoredLogEntry[];
        
        if (unuploadedLogs.length > 0) {
          this.info(`📤 Uploading ${unuploadedLogs.length} stored logs`, {
            component: 'logger',
            operation: 'upload_stored_logs'
          });

          const batchSize = 50;
          for (let i = 0; i < unuploadedLogs.length; i += batchSize) {
            const batch = unuploadedLogs.slice(i, i + batchSize);
            const success = await this.uploadLogBatch(batch);
            
            if (success) {
              batch.forEach(log => {
                store.put({ ...log, uploaded: true });
              });
            }
          }
        }
      };
    } catch (error) {
      this.warn('Failed to upload stored logs', {
        component: 'logger',
        operation: 'upload_stored_logs'
      }, error as Error);
    }
  }

  private async uploadLogBatch(logs: StoredLogEntry[]): Promise<boolean> {
    try {
      const response = await fetch('/api/logs/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token') || ''}`
        },
        body: JSON.stringify({ logs })
      });

      return response.ok;
    } catch (error) {
      console.warn('Failed to upload log batch:', error);
      return false;
    }
  }
}

// Global logger instance
export const logger = new EnterpriseLogger();

// Convenience exports
export const { debug, info, warn, error, fatal, startTimer } = logger;

// React hook for component-specific logging
export const useLogger = (component: string) => {
  return {
    debug: (message: string, context?: Omit<LogContext, 'component'>) =>
      logger.debug(message, { ...context, component }),
    info: (message: string, context?: Omit<LogContext, 'component'>) =>
      logger.info(message, { ...context, component }),
    warn: (message: string, context?: Omit<LogContext, 'component'>, error?: Error) =>
      logger.warn(message, { ...context, component }, error),
    error: (message: string, context?: Omit<LogContext, 'component'>, error?: Error) =>
      logger.error(message, { ...context, component }, error),
    fatal: (message: string, context?: Omit<LogContext, 'component'>, error?: Error) =>
      logger.fatal(message, { ...context, component }, error),
    startTimer: (operation: string, context?: Omit<LogContext, 'component'>) =>
      logger.startTimer(operation, { ...context, component })
  };
};

// Performance monitoring decorator
export const withPerformanceLogging = <T extends (...args: any[]) => any>(
  fn: T,
  operation: string,
  component: string
): T => {
  return ((...args: any[]) => {
    const stopTimer = logger.startTimer(operation, { component });
    try {
      const result = fn(...args);
      
      if (result && typeof result.then === 'function') {
        return result.finally(stopTimer);
      } else {
        stopTimer();
        return result;
      }
    } catch (error) {
      stopTimer();
      logger.error(`💥 Operation failed: ${operation}`, { component }, error as Error);
      throw error;
    }
  }) as T;
};

// Error boundary logging utility
export const logErrorBoundary = (
  error: Error,
  errorInfo: { componentStack: string },
  component: string
): void => {
  logger.fatal('🚨 React Error Boundary caught error', {
    component,
    operation: 'error_boundary',
    metadata: {
      componentStack: errorInfo.componentStack,
      errorBoundary: component
    }
  }, error);
};

// Export React components from separate file
export { EnterpriseErrorBoundary, logErrorBoundary as logErrorBoundaryTsx } from './enterprise-logger';