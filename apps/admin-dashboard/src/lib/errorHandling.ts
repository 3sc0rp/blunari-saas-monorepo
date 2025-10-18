/**
 * Centralized error handling utilities
 */

import { logger } from './logger';

export interface ErrorHandlerOptions {
  operation: string;
  component?: string;
  userId?: string;
  silent?: boolean;
  toast?: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
  };
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unknown error occurred';
}

/**
 * Handle operation errors consistently
 */
export function handleOperationError(
  error: unknown,
  options: ErrorHandlerOptions,
  toastFn?: (config: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
): void {
  const message = getErrorMessage(error);
  
  // Log error
  logger.error(`${options.operation} failed`, {
    component: options.component,
    userId: options.userId,
    error: message,
  });
  
  // Show toast notification if provided
  if (toastFn && options.toast) {
    toastFn({
      title: options.toast.title,
      description: options.toast.description || message,
      variant: options.toast.variant || 'destructive',
    });
  }
}

/**
 * Async error boundary wrapper
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions,
  toastFn?: (config: { title: string; description: string; variant?: 'default' | 'destructive' }) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleOperationError(error, options, toastFn);
    return null;
  }
}

/**
 * Classify error types
 */
export type ErrorType = 'network' | 'auth' | 'validation' | 'permission' | 'not_found' | 'unknown';

export function classifyError(error: unknown): ErrorType {
  const message = getErrorMessage(error).toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  
  if (message.includes('unauthorized') || message.includes('auth') || message.includes('token')) {
    return 'auth';
  }
  
  if (message.includes('invalid') || message.includes('validation') || message.includes('required')) {
    return 'validation';
  }
  
  if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
    return 'permission';
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return 'not_found';
  }
  
  return 'unknown';
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const errorType = classifyError(error);
  
  const messages: Record<ErrorType, string> = {
    network: 'Network error. Please check your internet connection and try again.',
    auth: 'Authentication failed. Please log in again.',
    validation: 'Invalid input. Please check your data and try again.',
    permission: 'You do not have permission to perform this action.',
    not_found: 'The requested resource was not found.',
    unknown: 'An unexpected error occurred. Please try again.',
  };
  
  return messages[errorType];
}
