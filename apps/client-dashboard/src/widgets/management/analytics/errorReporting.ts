/**
 * Analytics Error Reporting Service
 */

import { AnalyticsError, getErrorContext } from './errors';

class AnalyticsErrorReporter {
  private static instance: AnalyticsErrorReporter;
  private errorLog: Array<{
    timestamp: string;
    error: AnalyticsError;
    context: Record<string, any>;
  }> = [];

  private constructor() {}

  public static getInstance(): AnalyticsErrorReporter {
    if (!AnalyticsErrorReporter.instance) {
      AnalyticsErrorReporter.instance = new AnalyticsErrorReporter();
    }
    return AnalyticsErrorReporter.instance;
  }

  public reportError(error: AnalyticsError, additionalContext: Record<string, any> = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error,
      context: {
        ...getErrorContext(error),
        ...additionalContext
      }
    };

    this.errorLog.push(errorEntry);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Analytics Error:', {
        name: error.name,
        message: error.message,
        code: error.code,
        context: errorEntry.context
      });
    }

    // Could add external error reporting service integration here
  }

  public getRecentErrors(count: number = 10) {
    return this.errorLog.slice(-count);
  }

  public clearErrors() {
    this.errorLog = [];
  }

  public getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {} as Record<string, number>,
      byCode: {} as Record<string, number>,
      lastError: this.errorLog[this.errorLog.length - 1]
    };

    this.errorLog.forEach(entry => {
      const { error } = entry;
      stats.byType[error.name] = (stats.byType[error.name] || 0) + 1;
      stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1;
    });

    return stats;
  }
}

export const analyticsErrorReporter = AnalyticsErrorReporter.getInstance();