/**
 * useErrorHandler Hook
 * 
 * React hook for error handling with retry logic and offline detection
 */

import { useState, useCallback, useEffect } from 'react';
import {
  ErrorDetails,
  RetryHandler,
  RetryOptions,
  offlineDetector,
  getErrorDetails,
  formatErrorForLogging,
} from '@/utils/error-handler';

// ============================================================================
// Types
// ============================================================================

export interface ErrorState {
  error: ErrorDetails | null;
  isRetrying: boolean;
  retryAttempt: number;
  retryDelay: number | null;
  isOffline: boolean;
}

export interface UseErrorHandlerOptions extends RetryOptions {
  onError?: (error: ErrorDetails) => void;
  onRetry?: (attempt: number, delay: number, error: ErrorDetails) => void;
  onRecovery?: () => void;
  logErrors?: boolean;
}

export interface UseErrorHandlerReturn {
  error: ErrorDetails | null;
  isRetrying: boolean;
  retryAttempt: number;
  retryDelay: number | null;
  isOffline: boolean;
  executeWithRetry: <T>(fn: () => Promise<T>) => Promise<T>;
  handleError: (error: unknown) => void;
  clearError: () => void;
  retry: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    onError,
    onRetry,
    onRecovery,
    logErrors = true,
    ...retryOptions
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryAttempt: 0,
    retryDelay: null,
    isOffline: !offlineDetector.isOnline(),
  });

  const [retryFn, setRetryFn] = useState<(() => Promise<void>) | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const unsubscribe = offlineDetector.subscribe((isOnline) => {
      setErrorState(prev => {
        const newState = { ...prev, isOffline: !isOnline };
        
        // Clear offline errors when coming back online
        if (isOnline && prev.error?.code === 'OFFLINE') {
          newState.error = null;
          onRecovery?.();
        }
        
        return newState;
      });
    });

    return unsubscribe;
  }, [onRecovery]);

  /**
   * Handle error and categorize it
   */
  const handleError = useCallback((error: unknown) => {
    const errorDetails = getErrorDetails(error);

    // Log error if enabled
    if (logErrors) {
      console.error('[ErrorHandler]', formatErrorForLogging(errorDetails), errorDetails.originalError);
    }

    setErrorState(prev => ({
      ...prev,
      error: errorDetails,
      isRetrying: false,
      retryAttempt: 0,
      retryDelay: null,
    }));

    onError?.(errorDetails);
  }, [logErrors, onError]);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      error: null,
      isRetrying: false,
      retryAttempt: 0,
      retryDelay: null,
    }));
  }, []);

  /**
   * Execute function with automatic retry on failure
   */
  const executeWithRetry = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      clearError();

      const retryHandler = new RetryHandler({
        ...retryOptions,
        onRetry: (attempt, delay, error) => {
          setErrorState(prev => ({
            ...prev,
            isRetrying: true,
            retryAttempt: attempt,
            retryDelay: delay,
            error,
          }));

          onRetry?.(attempt, delay, error);

          if (logErrors) {
            console.log(`[ErrorHandler] Retrying (attempt ${attempt}) in ${delay}ms...`);
          }
        },
      });

      try {
        const result = await retryHandler.execute(fn);

        // Clear error on success
        if (errorState.error) {
          clearError();
          onRecovery?.();
        }

        return result;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    [retryOptions, onRetry, logErrors, errorState.error, clearError, onRecovery, handleError]
  );

  /**
   * Manual retry function
   */
  const retry = useCallback(async () => {
    if (!retryFn) {
      console.warn('[ErrorHandler] No retry function available');
      return;
    }

    try {
      await retryFn();
      clearError();
      onRecovery?.();
    } catch (error) {
      handleError(error);
    }
  }, [retryFn, clearError, onRecovery, handleError]);

  return {
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryAttempt: errorState.retryAttempt,
    retryDelay: errorState.retryDelay,
    isOffline: errorState.isOffline,
    executeWithRetry,
    handleError,
    clearError,
    retry,
  };
}

// ============================================================================
// Export
// ============================================================================

export default useErrorHandler;
