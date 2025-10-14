/**
 * CRITICAL FIX: Async/Await Error Handling Utilities
 * Provides safe async operations with proper error handling and timeout protection
 */

export interface AsyncResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  timeout?: boolean;
}

/**
 * CRITICAL FIX: Safe async wrapper that prevents unhandled promise rejections
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  timeoutMs = 10000
): Promise<AsyncResult<T>> {
  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });

    // Race between the actual promise and timeout
    const data = await Promise.race([promise, timeoutPromise]);
    
    return {
      success: true,
      data
    };
  } catch (error) {
    const isTimeout = error instanceof Error && error.message.includes('timed out');
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      timeout: isTimeout
    };
  }
}

/**
 * CRITICAL FIX: Retry wrapper for unreliable operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<AsyncResult<T>> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await safeAsync(operation());
    
    if (result.success) {
      return result;
    }

    lastError = result.error;
    
    // Don't retry on timeout or on last attempt
    if (result.timeout || attempt === maxAttempts) {
      break;
    }

    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
  }

  return {
    success: false,
    error: lastError || new Error('All retry attempts failed')
  };
}

/**
 * CRITICAL FIX: Debounced async operation to prevent rapid fire requests
 */
export class DebouncedAsync<T> {
  private timeoutId: NodeJS.Timeout | null = null;
  private lastPromise: Promise<AsyncResult<T>> | null = null;

  async execute(
    operation: () => Promise<T>,
    delayMs = 300
  ): Promise<AsyncResult<T>> {
    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Return existing promise if still pending
    if (this.lastPromise) {
      return this.lastPromise;
    }

    // Create new debounced promise
    this.lastPromise = new Promise((resolve) => {
      this.timeoutId = setTimeout(async () => {
        const result = await safeAsync(operation());
        this.lastPromise = null;
        this.timeoutId = null;
        resolve(result);
      }, delayMs);
    });

    return this.lastPromise;
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      this.lastPromise = null;
    }
  }
}

/**
 * CRITICAL FIX: Concurrent operation manager to prevent race conditions
 */
export class ConcurrentManager {
  private activeOperations = new Map<string, Promise<any>>();

  async execute<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<AsyncResult<T>> {
    // If operation is already running, return existing promise
    if (this.activeOperations.has(key)) {
      try {
        const data = await this.activeOperations.get(key)!;
        return { success: true, data };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }

    // Start new operation
    const promise = operation();
    this.activeOperations.set(key, promise);

    try {
      const data = await promise;
      this.activeOperations.delete(key);
      return { success: true, data };
    } catch (error) {
      this.activeOperations.delete(key);
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  isRunning(key: string): boolean {
    return this.activeOperations.has(key);
  }

  cancel(key: string): void {
    this.activeOperations.delete(key);
  }

  cancelAll(): void {
    this.activeOperations.clear();
  }
}

/**
 * CRITICAL FIX: Batch operation processor for efficient bulk operations
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize = 5,
  delayBetweenBatches = 100
): Promise<(AsyncResult<R> & { item: T })[]> {
  const results: (AsyncResult<R> & { item: T })[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (item) => {
      const result = await safeAsync(processor(item));
      return { ...result, item };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches to prevent overwhelming the system
    if (i + batchSize < items.length && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}

// Convenience function for Promise.all with error handling
export async function safePromiseAll<T>(
  promises: Promise<T>[]
): Promise<AsyncResult<T[]>> {
  try {
    const results = await Promise.allSettled(promises);
    const successful: T[] = [];
    const errors: Error[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        errors.push(new Error(`Promise ${index} failed: ${result.reason}`));
      }
    });

    if (errors.length > 0) {
      return {
        success: false,
        error: new Error(`${errors.length} of ${promises.length} operations failed`),
        data: successful.length > 0 ? successful : undefined
      };
    }

    return {
      success: true,
      data: successful
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
