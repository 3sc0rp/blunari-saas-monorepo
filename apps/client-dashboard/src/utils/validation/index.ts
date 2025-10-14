/**
 * Schema Validation System
 * Features:
 * - Runtime type validation (Zod)
 * - API response validation with error recovery
 * - Component prop validation helpers
 * - Configuration schema enforcement
 * - Caching + basic performance timing
 * - Type-safe schema composition utilities
 */

import React from 'react';
import { z } from 'zod';
import { logger } from '../logger';

// Core validation utilities
export const createValidationError = (
  schema: string,
  errors: z.ZodError,
  context?: Record<string, any>
) => {
  const error = new Error(`Schema validation failed for ${schema}`);
  (error as any).validationErrors = errors.issues;
  (error as any).context = context;
  return error;
};

// Performance-optimized validator with caching
class SchemaValidator {
  private cache = new Map<string, any>();
  private cacheHits = 0;
  private cacheMisses = 0;

  validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    options: {
      schemaName?: string;
      context?: Record<string, any>;
      enableCache?: boolean;
    } = {}
  ): T {
    const { schemaName = 'unknown', context, enableCache = true } = options;
    
    // Generate cache key for reusable validations
    const cacheKey = enableCache ? JSON.stringify({ schema: schemaName, data }) : null;
    
    if (cacheKey && this.cache.has(cacheKey)) {
      this.cacheHits++;
      return this.cache.get(cacheKey);
    }
    
    this.cacheMisses++;
    
    try {
      const startTime = performance.now();
      const result = schema.parse(data);
      const duration = performance.now() - startTime;
      
      // Log performance metrics for slow validations
      if (duration > 10) {
        logger.warn('Slow schema validation detected', {
          component: 'schema-validator',
          operation: 'validate',
          performance: { duration },
          metadata: { schemaName, cacheHits: this.cacheHits, cacheMisses: this.cacheMisses }
        });
      }
      
      // Cache successful validations
      if (cacheKey && enableCache) {
        this.cache.set(cacheKey, result);
        
        // Limit cache size
        if (this.cache.size > 1000) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }
      
      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = createValidationError(schemaName, error, context);
        
        const logContext = {
          component: 'schema-validator',
          operation: 'validate',
          metadata: {
            schemaName,
            errors: error.issues,
            context,
            cacheStats: { hits: this.cacheHits, misses: this.cacheMisses }
          }
        };
        (logger as any).error('Schema validation failed', logContext, validationError);
        
        throw validationError;
      }
      throw error;
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    logger.info('Schema validation cache cleared', {
      component: 'schema-validator',
      operation: 'clear_cache'
    });
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.cacheMisses > 0 ? this.cacheHits / (this.cacheHits + this.cacheMisses) : 0
    };
  }
}

export const schemaValidator = new SchemaValidator();

// Common validation schemas
export const CommonSchemas = {
  // Basic primitives with validation
  NonEmptyString: z.string().min(1, 'String cannot be empty'),
  PositiveNumber: z.number().positive('Number must be positive'),
  Email: z.string().email('Invalid email format'),
  Url: z.string().url('Invalid URL format'),
  UUID: z.string().uuid('Invalid UUID format'),
  
  // Date and time
  DateString: z.string().datetime('Invalid datetime format'),
  DateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).refine(data => new Date(data.start) <= new Date(data.end), {
    message: 'Start date must be before end date'
  }),
  
  // Common ID patterns
  TenantId: z.string().uuid('Invalid tenant ID'),
  UserId: z.string().uuid('Invalid user ID'),
  WidgetId: z.string().uuid('Invalid widget ID'),
  
  // Pagination
  PaginationParams: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  }),
  
  // Error response
  ErrorResponse: z.object({
    error: z.object({
      message: z.string(),
      code: z.string(),
      details: z.record(z.string(), z.any()).optional()
    })
  })
};

// Widget-specific schemas
export const WidgetSchemas = {
  // Widget configuration
  WidgetConfiguration: z.object({
    id: CommonSchemas.WidgetId,
    name: CommonSchemas.NonEmptyString,
    type: z.enum(['booking', 'catering', 'table-management', 'analytics']),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid semver format'),
    isActive: z.boolean(),
    configuration: z.object({
      theme: z.object({
        primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
        secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
        fontFamily: z.string(),
        borderRadius: z.number().min(0).max(50)
      }),
      features: z.object({
        realTimeUpdates: z.boolean(),
        mobileOptimized: z.boolean(),
        analytics: z.boolean(),
        multiLanguage: z.boolean()
      }),
      businessRules: z.object({
        maxBookingAdvance: z.number().positive(),
        minBookingAdvance: z.number().nonnegative(),
        maxPartySize: z.number().positive(),
        requirePhone: z.boolean(),
        requireEmail: z.boolean()
      })
    }),
    createdAt: CommonSchemas.DateString,
    updatedAt: CommonSchemas.DateString,
    tenantId: CommonSchemas.TenantId
  }),

  // Widget analytics data
  WidgetAnalytics: z.object({
    widgetId: CommonSchemas.WidgetId,
    metrics: z.object({
      views: CommonSchemas.PositiveNumber,
      interactions: CommonSchemas.PositiveNumber,
      conversions: CommonSchemas.PositiveNumber,
      errors: z.number().nonnegative(),
      avgLoadTime: CommonSchemas.PositiveNumber,
      bounceRate: z.number().min(0).max(1)
    }),
    timeRange: CommonSchemas.DateRange,
    breakdown: z.object({
      byDevice: z.record(z.string(), z.number()),
      byLocation: z.record(z.string(), z.number()),
      byTimeOfDay: z.record(z.string(), z.number())
    })
  }),

  // Widget deployment
  WidgetDeployment: z.object({
    id: z.string().uuid(),
    widgetId: CommonSchemas.WidgetId,
    environment: z.enum(['development', 'staging', 'production']),
    version: z.string(),
    status: z.enum(['pending', 'deploying', 'deployed', 'failed', 'rolled-back']),
    deployedAt: CommonSchemas.DateString.optional(),
    rollbackVersion: z.string().optional(),
    metadata: z.object({
      deployedBy: CommonSchemas.UserId,
      deploymentNotes: z.string().optional(),
      performanceBaseline: z.object({
        loadTime: z.number(),
        memoryUsage: z.number(),
        bundleSize: z.number()
      }).optional()
    })
  })
};

// API Response schemas
export const ApiSchemas = {
  // Generic API response wrapper
  ApiResponse: <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: CommonSchemas.ErrorResponse.shape.error.optional(),
    meta: z.object({
      timestamp: CommonSchemas.DateString,
      requestId: z.string().uuid(),
      version: z.string()
    })
  }),

  // Paginated response
  PaginatedResponse: <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    })
  }),

  // Widget management API responses
  GetWidgetsResponse: z.lazy(() => 
    ApiSchemas.ApiResponse(
      ApiSchemas.PaginatedResponse(WidgetSchemas.WidgetConfiguration)
    )
  ),

  GetWidgetAnalyticsResponse: z.lazy(() => 
    ApiSchemas.ApiResponse(WidgetSchemas.WidgetAnalytics)
  ),

  CreateWidgetResponse: z.lazy(() => 
    ApiSchemas.ApiResponse(WidgetSchemas.WidgetConfiguration)
  )
};

// Component prop validation decorators
export function withPropValidation<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  propsSchema: z.ZodSchema<P>,
  options: { componentName?: string; enableCache?: boolean } = {}
) {
  const ValidatedComponent: React.FC<P> = (props) => {
    try {
      const validatedProps = schemaValidator.validate(propsSchema, props, {
        schemaName: `${options.componentName || Component.displayName || Component.name}Props`,
        enableCache: options.enableCache ?? true
      });
      
      return React.createElement(Component, validatedProps);
    } catch (error) {
      const logContext = {
        component: options.componentName || Component.displayName || Component.name,
        operation: 'prop_validation'
      };
      (logger as any).error('Component prop validation failed', logContext, error as Error);
      
      // Return error boundary or fallback
      return React.createElement('div', {
        className: 'p-4 border border-red-200 rounded-md bg-red-50',
        children: [
          React.createElement('h4', { 
            className: 'text-red-800 font-medium',
            children: 'Component Validation Error'
          }),
          React.createElement('p', {
            className: 'text-red-600 text-sm mt-1',
            children: process.env.NODE_ENV === 'development' 
              ? (error as Error).message 
              : 'Invalid component props provided'
          })
        ]
      });
    }
  };
  
  ValidatedComponent.displayName = `withPropValidation(${Component.displayName || Component.name})`;
  
  return ValidatedComponent;
}

// API response validation hook
export function useValidatedApiResponse<T>(
  apiCall: () => Promise<unknown>,
  schema: z.ZodSchema<T>,
  options: {
    schemaName?: string;
    retryOnValidationError?: boolean;
    fallbackData?: T;
  } = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      const validatedData = schemaValidator.validate(schema, response, {
        schemaName: options.schemaName || 'ApiResponse'
      });
      
      setData(validatedData);
      setRetryCount(0);
    } catch (err) {
      const error = err as Error;
      
      if (options.retryOnValidationError && retryCount < 2) {
        logger.warn('API validation failed, retrying', {
          component: 'validated-api-hook',
          operation: 'retry_validation',
          metadata: { retryCount: retryCount + 1 }
        });
        
        setRetryCount(prev => prev + 1);
        setTimeout(fetchData, 1000 * Math.pow(2, retryCount));
        return;
      }
      
      setError(error);
      
      if (options.fallbackData) {
        setData(options.fallbackData);
      }
    } finally {
      setLoading(false);
    }
  }, [apiCall, schema, options, retryCount]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Schema validation middleware for API clients
export function createValidatedApiClient(baseUrl: string) {
  return {
    async get<T>(
      endpoint: string,
      schema: z.ZodSchema<T>,
      options: RequestInit = {}
    ): Promise<T> {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return schemaValidator.validate(schema, data, {
        schemaName: `GET ${endpoint}`,
        context: { endpoint, status: response.status }
      });
    },

    async post<T, U>(
      endpoint: string,
      body: T,
      responseSchema: z.ZodSchema<U>,
      bodySchema?: z.ZodSchema<T>,
      options: RequestInit = {}
    ): Promise<U> {
      // Validate request body if schema provided
      const validatedBody = bodySchema 
        ? schemaValidator.validate(bodySchema, body, {
            schemaName: `POST ${endpoint} Request`,
            context: { endpoint }
          })
        : body;

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: JSON.stringify(validatedBody),
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return schemaValidator.validate(responseSchema, data, {
        schemaName: `POST ${endpoint} Response`,
        context: { endpoint, status: response.status }
      });
    }
  };
}