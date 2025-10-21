/**
 * Error Handler Utility
 * 
 * Provides comprehensive error handling with:
 * - User-friendly error messages
 * - Retry logic with exponential backoff
 * - Offline detection
 * - Error categorization
 * - Logging for debugging
 */

// ============================================================================
// Error Types & Codes
// ============================================================================

export enum ErrorCode {
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  OFFLINE = 'OFFLINE',
  TIMEOUT = 'TIMEOUT',
  
  // Server Errors
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT = 'RATE_LIMIT',
  
  // Client Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  
  // Data Errors
  INVALID_DATA = 'INVALID_DATA',
  MISSING_DATA = 'MISSING_DATA',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage: string;
  retryable: boolean;
  statusCode?: number;
  originalError?: unknown;
}

// ============================================================================
// Error Message Mapping
// ============================================================================

const ERROR_MESSAGES: Record<ErrorCode, { message: string; userMessage: string; retryable: boolean }> = {
  [ErrorCode.NETWORK_ERROR]: {
    message: 'Network request failed',
    userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
    retryable: true,
  },
  [ErrorCode.OFFLINE]: {
    message: 'No internet connection',
    userMessage: 'You appear to be offline. Please check your internet connection and try again.',
    retryable: true,
  },
  [ErrorCode.TIMEOUT]: {
    message: 'Request timed out',
    userMessage: 'The request is taking longer than expected. Please try again.',
    retryable: true,
  },
  [ErrorCode.SERVER_ERROR]: {
    message: 'Internal server error',
    userMessage: 'Something went wrong on our end. Please try again in a few moments.',
    retryable: true,
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    message: 'Service temporarily unavailable',
    userMessage: 'Our service is temporarily unavailable. Please try again in a few minutes.',
    retryable: true,
  },
  [ErrorCode.RATE_LIMIT]: {
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests. Please wait a moment and try again.',
    retryable: true,
  },
  [ErrorCode.VALIDATION_ERROR]: {
    message: 'Validation failed',
    userMessage: 'Please check your input and try again.',
    retryable: false,
  },
  [ErrorCode.UNAUTHORIZED]: {
    message: 'Unauthorized access',
    userMessage: 'You need to be logged in to perform this action.',
    retryable: false,
  },
  [ErrorCode.FORBIDDEN]: {
    message: 'Access forbidden',
    userMessage: 'You don\'t have permission to perform this action.',
    retryable: false,
  },
  [ErrorCode.NOT_FOUND]: {
    message: 'Resource not found',
    userMessage: 'The requested information could not be found.',
    retryable: false,
  },
  [ErrorCode.INVALID_DATA]: {
    message: 'Invalid data format',
    userMessage: 'The data format is invalid. Please try again.',
    retryable: false,
  },
  [ErrorCode.MISSING_DATA]: {
    message: 'Required data missing',
    userMessage: 'Some required information is missing. Please check your input.',
    retryable: false,
  },
  [ErrorCode.UNKNOWN_ERROR]: {
    message: 'An unknown error occurred',
    userMessage: 'Something unexpected happened. Please try again.',
    retryable: true,
  },
};

// ============================================================================
// Error Detection & Categorization
// ============================================================================

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: unknown): ErrorDetails {
  // Check if offline
  if (!navigator.onLine) {
    return {
      code: ErrorCode.OFFLINE,
      ...ERROR_MESSAGES[ErrorCode.OFFLINE],
      originalError: error,
    };
  }

  // Handle HTTP errors (fetch response)
  if (error && typeof error === 'object' && 'status' in error) {
    const statusCode = (error as { status: number }).status;
    
    if (statusCode === 401) {
      return { code: ErrorCode.UNAUTHORIZED, statusCode, ...ERROR_MESSAGES[ErrorCode.UNAUTHORIZED], originalError: error };
    }
    if (statusCode === 403) {
      return { code: ErrorCode.FORBIDDEN, statusCode, ...ERROR_MESSAGES[ErrorCode.FORBIDDEN], originalError: error };
    }
    if (statusCode === 404) {
      return { code: ErrorCode.NOT_FOUND, statusCode, ...ERROR_MESSAGES[ErrorCode.NOT_FOUND], originalError: error };
    }
    if (statusCode === 422) {
      return { code: ErrorCode.VALIDATION_ERROR, statusCode, ...ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR], originalError: error };
    }
    if (statusCode === 429) {
      return { code: ErrorCode.RATE_LIMIT, statusCode, ...ERROR_MESSAGES[ErrorCode.RATE_LIMIT], originalError: error };
    }
    if (statusCode >= 500) {
      return { code: ErrorCode.SERVER_ERROR, statusCode, ...ERROR_MESSAGES[ErrorCode.SERVER_ERROR], originalError: error };
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return { code: ErrorCode.NETWORK_ERROR, ...ERROR_MESSAGES[ErrorCode.NETWORK_ERROR], originalError: error };
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return { code: ErrorCode.TIMEOUT, ...ERROR_MESSAGES[ErrorCode.TIMEOUT], originalError: error };
    }
    if (errorMessage.includes('validation')) {
      return { code: ErrorCode.VALIDATION_ERROR, ...ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR], originalError: error };
    }
  }

  // Handle PostgrestError from Supabase
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const pgError = error as { code: string; message: string };
    
    // Supabase specific error codes
    if (pgError.code === 'PGRST116') {
      return { code: ErrorCode.NOT_FOUND, ...ERROR_MESSAGES[ErrorCode.NOT_FOUND], originalError: error };
    }
    if (pgError.code.startsWith('PGRST')) {
      return { code: ErrorCode.SERVER_ERROR, ...ERROR_MESSAGES[ErrorCode.SERVER_ERROR], originalError: error };
    }
  }

  // Default to unknown error
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    ...ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR],
    originalError: error,
  };
}

/**
 * Get user-friendly error details
 */
export function getErrorDetails(error: unknown): ErrorDetails {
  return categorizeError(error);
}

// ============================================================================
// Retry Handler with Exponential Backoff
// ============================================================================

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, delay: number, error: ErrorDetails) => void;
}

export class RetryHandler {
  private maxRetries: number;
  private initialDelay: number;
  private maxDelay: number;
  private backoffMultiplier: number;
  private onRetry?: (attempt: number, delay: number, error: ErrorDetails) => void;

  constructor(options: RetryOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.initialDelay = options.initialDelay ?? 1000; // 1 second
    this.maxDelay = options.maxDelay ?? 10000; // 10 seconds
    this.backoffMultiplier = options.backoffMultiplier ?? 2;
    this.onRetry = options.onRetry;
  }

  /**
   * Calculate delay for retry attempt with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.initialDelay * Math.pow(this.backoffMultiplier, attempt);
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    shouldRetry?: (error: ErrorDetails) => boolean
  ): Promise<T> {
    let lastError: ErrorDetails | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Check if online before attempting
        if (!navigator.onLine && attempt > 0) {
          throw new Error('Offline');
        }

        return await fn();
      } catch (error) {
        lastError = categorizeError(error);

        // Don't retry if error is not retryable
        if (!lastError.retryable) {
          throw lastError;
        }

        // Custom retry logic
        if (shouldRetry && !shouldRetry(lastError)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          throw lastError;
        }

        // Calculate delay and notify
        const delay = this.calculateDelay(attempt);
        this.onRetry?.(attempt + 1, delay, lastError);

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError!;
  }
}

// ============================================================================
// Offline Detection
// ============================================================================

export class OfflineDetector {
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.notify(true);
  };

  private handleOffline = () => {
    this.notify(false);
  };

  private notify(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  /**
   * Subscribe to online/offline status changes
   */
  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
  }
}

// ============================================================================
// Singleton Offline Detector
// ============================================================================

export const offlineDetector = new OfflineDetector();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: ErrorDetails): string {
  return `[${error.code}] ${error.message}${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}`;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const details = categorizeError(error);
  return details.retryable;
}

/**
 * Get retry delay suggestion based on error type
 */
export function getRetrySuggestion(error: ErrorDetails): number {
  switch (error.code) {
    case ErrorCode.RATE_LIMIT:
      return 5000; // 5 seconds for rate limit
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 10000; // 10 seconds for service unavailable
    case ErrorCode.TIMEOUT:
      return 3000; // 3 seconds for timeout
    default:
      return 2000; // 2 seconds default
  }
}
