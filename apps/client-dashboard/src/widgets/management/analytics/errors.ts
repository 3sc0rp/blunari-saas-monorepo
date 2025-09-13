/**
 * Analytics Error Types and Handling
 */

export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AnalyticsError';
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      originalError: this.originalError?.message
    };
  }
}

export class EdgeFunctionError extends AnalyticsError {
  constructor(
    message: string, 
    code: string, 
    public response: any,
    context?: Record<string, any>
  ) {
    super(message, code, context);
    this.name = 'EdgeFunctionError';
  }
}

export class DatabaseError extends AnalyticsError {
  constructor(
    message: string,
    code: string,
    public query?: any,
    context?: Record<string, any>
  ) {
    super(message, code, context);
    this.name = 'DatabaseError';
  }
}

export enum AnalyticsErrorCode {
  EDGE_FUNCTION_ERROR = 'EDGE_FUNCTION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  MISSING_TENANT = 'MISSING_TENANT',
  INVALID_CONFIG = 'INVALID_CONFIG',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export function isRetryableError(error: AnalyticsError): boolean {
  const retryableCodes = [
    AnalyticsErrorCode.NETWORK_ERROR,
    AnalyticsErrorCode.TIMEOUT_ERROR,
    AnalyticsErrorCode.RATE_LIMIT_ERROR
  ];
  return retryableCodes.includes(error.code as AnalyticsErrorCode);
}

export function getErrorContext(error: any): Record<string, any> {
  return {
    timestamp: new Date().toISOString(),
    type: error.constructor.name,
    code: error.code || 'UNKNOWN',
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    originalError: error.originalError?.message
  };
}