import { toast } from 'sonner';
import { ErrorEnvelope, ErrorEnvelopeZ } from './contracts';

/**
 * Parse API error response into ErrorEnvelope format
 */
export function parseError(error: unknown): ErrorEnvelope {
  // If it's already an ErrorEnvelope,
      return it
  try {
    return ErrorEnvelopeZ.parse(error);
  } catch {
    // Continue to other parsing methods
  }

  // Parse common error formats
      if (error instanceof Error) {
    return {
      code: 'CLIENT_ERROR',
      message: error.message,
      requestId: generateRequestId()
    };
  }

  // Parse fetch/API errors
      if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    
    // Supabase error format
      if (errorObj.message && errorObj.code) {
      return {
        code: errorObj.code,
        message: errorObj.message,
        requestId: generateRequestId()
      };
    }

    // Standard HTTP error
      if (errorObj.status && errorObj.statusText) {
      return {
        code: `HTTP_${errorObj.status}`,
        message: errorObj.statusText,
        requestId: generateRequestId()
      };
    }

    // Generic object with message
      if (errorObj.message) {
      return {
        code: 'UNKNOWN_ERROR',
        message: errorObj.message,
        requestId: generateRequestId()
      };
    }
  }

  // Fallback for unknown error types
      return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    requestId: generateRequestId()
  };
}

/**
 * Generate a unique request ID for error tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Display error toast with friendly message and request ID
 */
export function toastError(error: ErrorEnvelope | unknown, customMessage?: string) {
  const parsedError = typeof error === 'object' && error !== null && 'code' in error 
    ? error as ErrorEnvelope 
    : parseError(error);

  const userMessage = customMessage || getFriendlyErrorMessage(parsedError.code);
  const details = parsedError.requestId ? ` (ID: ${parsedError.requestId})` : '';

  toast.error(userMessage + details);

  // Log detailed error for debugging
  console.error('Error details:', {
    code: parsedError.code,
    message: parsedError.message,
    requestId: parsedError.requestId,
    issues: parsedError.issues,
    originalError: error
  });
}

/**
 * Get user-friendly error message based on error code
 */
function getFriendlyErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    // Authentication errors
    'AUTH_REQUIRED': 'Please sign in to continue',
    'AUTH_INVALID': 'Your session has expired. Please sign in again',
    'AUTH_FORBIDDEN': 'You don\'t have permission to perform this action',
    
    // Reservation errors
    'RESERVATION_NOT_FOUND': 'Reservation not found',
    'RESERVATION_CONFLICT': 'This time slot conflicts with another reservation',
    'RESERVATION_INVALID_TIME': 'Invalid reservation time',
    'RESERVATION_PAST_TIME': 'Cannot create reservations in the past',
    'RESERVATION_TOO_LARGE': 'Party size exceeds table capacity',
    
    // Table errors
    'TABLE_NOT_FOUND': 'Table not found',
    'TABLE_UNAVAILABLE': 'Table is not available at this time',
    'TABLE_MAINTENANCE': 'Table is under maintenance',
    
    // Tenant errors
    'TENANT_NOT_FOUND': 'Restaurant not found',
    'TENANT_INACTIVE': 'Restaurant account is inactive',
    
    // Validation errors
    'VALIDATION_ERROR': 'Please check your input and try again',
    'MISSING_REQUIRED_FIELD': 'Please fill in all required fields',
    
    // Network errors
    'NETWORK_ERROR': 'Network connection failed. Please try again',
    'TIMEOUT_ERROR': 'Request timed out. Please try again',
    
    // Server errors
    'INTERNAL_ERROR': 'Something went wrong. Our team has been notified',
    'SERVICE_UNAVAILABLE': 'Service is temporarily unavailable',
    
    // Client errors
    'CLIENT_ERROR': 'Something went wrong on your device'
  };

  return errorMessages[code] || 'An unexpected error occurred. Please try again';
}

/**
 * Success toast helper
 */
export function toastSuccess(message: string, description?: string) {
  toast.success(message, {
    description
  });
}

/**
 * Create idempotency key for API requests
 */
export function createIdempotencyKey(operation: string, data?: any): string {
  const timestamp = Date.now();
  const dataHash = data ? btoa(JSON.stringify(data)).substr(0, 8) : 'no_data';
  return `${operation}_${timestamp}_${dataHash}`;
}

/**
 * Retry mechanism for failed requests
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError;
}

/**
 * Log security events (placeholder for future implementation)
 */
export function logSecurityEvent(event: string, details: any) {
  console.warn('Security event:', event, details);
  // TODO: Send to security monitoring service
}

/**
 * Validate API response format
 */
export function validateApiResponse<T>(response: any, expectedSchema?: any): { data?: T; error?: ErrorEnvelope } {
  if (!response) {
    return {
      error: {
        code: 'EMPTY_RESPONSE',
        message: 'Empty response from server',
        requestId: generateRequestId()
      }
    };
  }

  // Check
      if (response.error) {
    return {
      error: parseError(response.error)
    };
  }

  // If no error and has data,
      return data
      if (response.data !== undefined) {
    return { data: response.data };
  }

  // If response is the data itself (no wrapper)
      return { data: response };
}



