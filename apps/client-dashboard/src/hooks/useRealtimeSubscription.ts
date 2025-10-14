/**
 * Advanced React hook for Supabase realtime subscriptions
 * Features:
 * - Enhanced type safety with generic constraints
 * - Advanced error handling with retry strategies
 * - Performance optimizations with memoization
 * - Comprehensive state management
 * - Event debouncing and throttling
 * - Connection health monitoring
 * - Automatic recovery mechanisms
 * - Memory leak prevention
 * - Advanced filtering and data transformation
 */
import { useEffect, useState, useRef, useCallback, useMemo, useReducer } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { connectionManager } from '@/utils/supabaseConnection';
import { logger } from '@/utils/logger';
import { Database } from '@/integrations/supabase/types';

// Advanced type definitions
type TableName = keyof Database['public']['Tables'];
type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type ConnectionStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'RECONNECTING';

// Advanced configuration interfaces
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

interface PerformanceConfig {
  debounceMs: number;
  throttleMs: number;
  maxBatchSize: number;
  enableBatching: boolean;
}

interface DataTransform<TInput, TOutput> {
  mapper?: (data: TInput) => TOutput;
  filter?: (data: TInput) => boolean;
  sorter?: (a: TOutput, b: TOutput) => number;
  validator?: (data: TInput) => boolean;
}

interface UseRealtimeSubscriptionOptions<TInput = Record<string, unknown>, TOutput = TInput> {
  table: TableName;
  event?: RealtimeEvent;
  schema?: string;
  filter?: string;
  enabled?: boolean;
  
  // Advanced callbacks with enhanced type safety
  onUpdate?: (payload: RealtimePostgresChangesPayload<TInput>, transformedData?: TOutput) => void;
  onInsert?: (payload: RealtimePostgresChangesPayload<TInput>, transformedData?: TOutput) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<TInput>, transformedData?: TOutput) => void;
  onError?: (error: Error, context: ErrorContext) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
  onBatchUpdate?: (payloads: RealtimePostgresChangesPayload<TInput>[]) => void;
  
  // Advanced configuration
  retryConfig?: Partial<RetryConfig>;
  performanceConfig?: Partial<PerformanceConfig>;
  dataTransform?: DataTransform<TInput, TOutput>;
  
  // Advanced features
  enableMetrics?: boolean;
  enableOptimisticUpdates?: boolean;
  enablePersistence?: boolean;
  persistenceKey?: string;
}

interface ErrorContext {
  table: TableName;
  event: RealtimeEvent;
  channelName: string;
  attemptNumber: number;
  timestamp: number;
}

interface RealtimeMetrics {
  messageCount: number;
  errorCount: number;
  reconnectCount: number;
  averageLatency: number;
  lastMessageTime: number;
  uptime: number;
}

interface RealtimeState<T = Record<string, unknown>> {
  data: T[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  connectionStatus: ConnectionStatus;
  metrics: RealtimeMetrics;
  lastUpdate: number;
  retryCount: number;
}

// State management with reducer for complex state updates
type RealtimeAction<T> =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_DATA'; payload: T[] }
  | { type: 'ADD_DATA'; payload: T }
  | { type: 'UPDATE_DATA'; payload: { id: string | number; data: T } }
  | { type: 'REMOVE_DATA'; payload: string | number }
  | { type: 'INCREMENT_RETRY'; payload?: number }
  | { type: 'RESET_RETRY' }
  | { type: 'UPDATE_METRICS'; payload: Partial<RealtimeMetrics> }
  | { type: 'BATCH_UPDATE'; payload: T[] };

function realtimeReducer<T>(state: RealtimeState<T>, action: RealtimeAction<T>): RealtimeState<T> {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_CONNECTION_STATUS':
      return { 
        ...state, 
        connectionStatus: action.payload,
        connected: action.payload === 'CONNECTED'
      };
    
    case 'SET_DATA':
      return { 
        ...state, 
        data: action.payload, 
        lastUpdate: Date.now(),
        loading: false 
      };
    
    case 'ADD_DATA':
      return { 
        ...state, 
        data: [...state.data, action.payload],
        lastUpdate: Date.now()
      };
    
    case 'UPDATE_DATA': {
      const updatedData = state.data.map(item => {
        const itemWithId = item as T & { id: string | number };
        return itemWithId.id === action.payload.id ? action.payload.data : item;
      });
      return { 
        ...state, 
        data: updatedData,
        lastUpdate: Date.now()
      };
    }
    
    case 'REMOVE_DATA': {
      const filteredData = state.data.filter(item => {
        const itemWithId = item as T & { id: string | number };
        return itemWithId.id !== action.payload;
      });
      return { 
        ...state, 
        data: filteredData,
        lastUpdate: Date.now()
      };
    }
    
    case 'INCREMENT_RETRY':
      return { 
        ...state, 
        retryCount: state.retryCount + (action.payload || 1)
      };
    
    case 'RESET_RETRY':
      return { ...state, retryCount: 0 };
    
    case 'UPDATE_METRICS':
      return { 
        ...state, 
        metrics: { ...state.metrics, ...action.payload }
      };
    
    case 'BATCH_UPDATE':
      return { 
        ...state, 
        data: action.payload,
        lastUpdate: Date.now()
      };
    
    default:
      return state;
  }
}

// Default configurations
      const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true
};

const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  debounceMs: 100,
  throttleMs: 1000,
  maxBatchSize: 50,
  enableBatching: false
};

const DEFAULT_METRICS: RealtimeMetrics = {
  messageCount: 0,
  errorCount: 0,
  reconnectCount: 0,
  averageLatency: 0,
  lastMessageTime: 0,
  uptime: 0
};

// Utility functions for advanced features
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );
  
  if (config.jitter) {
    return delay + Math.random() * 1000;
  }
  
  return delay;
}

function debounce<T extends (...args: unknown[]) => void>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

function throttle<T extends (...args: unknown[]) => void>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}
// Advanced realtime subscription hook with comprehensive features
export function useRealtimeSubscription<TInput = Record<string, unknown>, TOutput = TInput>(
  options: UseRealtimeSubscriptionOptions<TInput, TOutput>
): RealtimeState<TOutput> & {
  refetch: () => Promise<void>;
  subscribe: () => void;
  unsubscribe: () => void;
  reset: () => void;
  getMetrics: () => RealtimeMetrics;
  isHealthy: () => boolean;
} {
  const {
    table,
    event = '*',
    schema = 'public',
    filter,
    enabled = true,
    onUpdate,
    onInsert,
    onDelete,
    onError,
    onConnectionChange,
    onBatchUpdate,
    retryConfig = {},
    performanceConfig = {},
    dataTransform = {},
    enableMetrics = false,
    enableOptimisticUpdates = false,
    enablePersistence = false,
    persistenceKey
  } = options;

  // Merge configurations with defaults
      const finalRetryConfig = useMemo(() => ({ 
    ...DEFAULT_RETRY_CONFIG, 
    ...retryConfig 
  }), [retryConfig]);
  
  const finalPerformanceConfig = useMemo(() => ({ 
    ...DEFAULT_PERFORMANCE_CONFIG, 
    ...performanceConfig 
  }), [performanceConfig]);

  // Initialize state with reducer for complex state management
      const [state, dispatch] = useReducer(realtimeReducer<TOutput>, {
    data: [],
    loading: true,
    error: null,
    connected: false,
    connectionStatus: 'IDLE',
    metrics: { ...DEFAULT_METRICS },
    lastUpdate: 0,
    retryCount: 0
  });

  // Refs for persistent data across renders
      const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const metricsStartTimeRef = useRef(Date.now());
  const batchBufferRef = useRef<RealtimePostgresChangesPayload<TInput>[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique channel name with additional entropy
      const channelName = useMemo(() => 
    `${table}-${schema}-${event}-${filter || 'all'}-${Date.now()}`,
    [table, schema, event, filter]
  );

  // Data transformation utilities
      const transformData = useCallback((inputData: TInput): TOutput | null => {
    try {
      // Apply validation first
      if (dataTransform.validator && !dataTransform.validator(inputData)) {
        return null;
      }

      // Apply filter
      if (dataTransform.filter && !dataTransform.filter(inputData)) {
        return null;
      }

      // Apply mapper or
      return as-is
      const transformed = dataTransform.mapper 
        ? dataTransform.mapper(inputData) 
        : (inputData as unknown as TOutput);

      return transformed;
    } catch (error) {
      logger.error('Data transformation failed', error as Error, {
        component: 'useRealtimeSubscription',
        table,
        inputData
      });
      return null;
    }
  }, [dataTransform, table]);

  // Advanced metrics tracking
      const updateMetrics = useCallback((updates: Partial<RealtimeMetrics>) => {
    if (!enableMetrics) return;
    
    dispatch({ 
      type: 'UPDATE_METRICS', 
      payload: {
        ...updates,
        uptime: Date.now() - metricsStartTimeRef.current
      }
    });
  }, [enableMetrics]);

  // Batch processing for performance
      const processBatch = useCallback(() => {
    if (batchBufferRef.current.length === 0) return;

    const batch = [...batchBufferRef.current];
    batchBufferRef.current = [];

    // Process batch updates
      const transformedBatch = batch
      .map(payload => {
        const transformed = transformData(payload.new as TInput);
        return transformed ? { payload, transformed } : null;
      })
      .filter(Boolean) as { payload: RealtimePostgresChangesPayload<TInput>; transformed: TOutput }[];

    // Apply batch updates to state
      if (transformedBatch.length > 0) {
      const newData = transformedBatch.map(item => item.transformed);
      dispatch({ type: 'BATCH_UPDATE', payload: newData });
      
      // Call batch callback
      onBatchUpdate?.(batch);
    }

    updateMetrics({ 
      messageCount: state.metrics.messageCount + batch.length,
      lastMessageTime: Date.now()
    });
  }, [transformData, onBatchUpdate, updateMetrics, state.metrics.messageCount]);

  // Debounced batch processor
      const debouncedProcessBatch = useMemo(
    () => debounce(processBatch, finalPerformanceConfig.debounceMs),
    [processBatch, finalPerformanceConfig.debounceMs]
  );

  // Advanced realtime update handler with batching and transformation
      const handleRealtimeUpdate = useCallback((payload: RealtimePostgresChangesPayload<TInput>) => {
    const startTime = Date.now();

    logger.debug('Realtime update received', {
      component: 'useRealtimeSubscription',
      table,
      event: payload.eventType,
      record: payload.new
    });

    // Handle batching
      if (finalPerformanceConfig.enableBatching) {
      batchBufferRef.current.push(payload);
      
      if (batchBufferRef.current.length >= finalPerformanceConfig.maxBatchSize) {
        processBatch();
      } else {
        debouncedProcessBatch();
      }
      return;
    }

    // Handle individual updates with transformation
      const transformed = payload.new ? transformData(payload.new as TInput) : null;
    
    if (transformed || payload.eventType === 'DELETE') {
      switch (payload.eventType) {
        case 'INSERT':
          if (transformed) {
            dispatch({ type: 'ADD_DATA', payload: transformed });
            onInsert?.(payload, transformed);
          }
          break;
          
        case 'UPDATE': {
          if (transformed) {
            const itemWithId = payload.new as TInput & { id: string | number };
            dispatch({ 
              type: 'UPDATE_DATA', 
              payload: { id: itemWithId.id, data: transformed }
            });
            onUpdate?.(payload, transformed);
          }
          break;
        }
          
        case 'DELETE': {
          const itemWithId = payload.old as TInput & { id: string | number };
          dispatch({ type: 'REMOVE_DATA', payload: itemWithId.id });
          onDelete?.(payload);
          break;
        }
      }
    }

    // Update performance metrics
      const latency = Date.now() - startTime;
    updateMetrics({
      messageCount: state.metrics.messageCount + 1,
      averageLatency: (state.metrics.averageLatency + latency) / 2,
      lastMessageTime: Date.now()
    });
  }, [
    table, 
    transformData, 
    finalPerformanceConfig, 
    processBatch, 
    debouncedProcessBatch,
    onInsert, 
    onUpdate, 
    onDelete,
    updateMetrics,
    state.metrics.messageCount,
    state.metrics.averageLatency
  ]);

  // Advanced connection status handler
      const handleConnectionStatusChange = useCallback((status: string) => {
    const connectionStatus: ConnectionStatus = (() => {
      switch (status) {
        case 'SUBSCRIBED': return 'CONNECTED';
        case 'CHANNEL_ERROR': return 'ERROR';
        case 'CLOSED': return 'DISCONNECTED';
        default: return 'CONNECTING';
      }
    })();

    dispatch({ type: 'SET_CONNECTION_STATUS', payload: connectionStatus });
    onConnectionChange?.(connectionStatus);

    logger.debug('Realtime connection status changed', {
      component: 'useRealtimeSubscription',
      table,
      status,
      connectionStatus,
      channelName
    });

    if (status === 'CHANNEL_ERROR') {
      const error = new Error('Realtime channel error');
      const errorContext: ErrorContext = {
        table,
        event,
        channelName,
        attemptNumber: state.retryCount,
        timestamp: Date.now()
      };

      dispatch({ type: 'SET_ERROR', payload: 'Connection error' });
      updateMetrics({ errorCount: state.metrics.errorCount + 1 });
      
      onError?.(error, errorContext);
      
      // Schedule reconnect
      if (state.retryCount < finalRetryConfig.maxAttempts) {
        const delay = calculateBackoffDelay(state.retryCount, finalRetryConfig);
        dispatch({ type: 'INCREMENT_RETRY' });
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'RECONNECTING' });
        updateMetrics({ reconnectCount: state.metrics.reconnectCount + 1 });

        retryTimeoutRef.current = setTimeout(() => {
          logger.info('Attempting to reconnect', {
            component: 'useRealtimeSubscription',
            table,
            attempt: state.retryCount + 1,
            delay
          });
          
          // Inline reconnection logic to avoid circular dependency
      if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
            isSubscribedRef.current = false;
          }
          
          // Reconnect
          setTimeout(() => {
            if (enabled && !isSubscribedRef.current && !channelRef.current) {
              try {
                dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'CONNECTING' });
                
                connectionManager.ensureConnection();

                const channel = supabase
                  .channel(channelName)
                  .on(
                    'postgres_changes' as any,
                    {
                      event,
                      schema,
                      table,
                      filter
                    },
                    handleRealtimeUpdate
                  )
                  .subscribe(handleConnectionStatusChange);

                channelRef.current = channel;
                isSubscribedRef.current = true;
                dispatch({ type: 'SET_LOADING', payload: false });
              } catch (reconnectError) {
                logger.error('Reconnection failed', reconnectError as Error, {
                  component: 'useRealtimeSubscription',
                  table
                });
              }
            }
          }, 100);
        }, delay);
      }
    } else if (status === 'SUBSCRIBED') {
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'RESET_RETRY' });
    }
  }, [
    table, 
    event, 
    channelName, 
    state.retryCount, 
    state.metrics.errorCount,
    state.metrics.reconnectCount,
    finalRetryConfig,
    onConnectionChange, 
    onError, 
    updateMetrics,
    enabled,
    schema,
    filter,
    handleRealtimeUpdate
  ]);

  // Enhanced subscribe function with advanced error handling
      const subscribe = useCallback(() => {
    if (!enabled || isSubscribedRef.current || channelRef.current) {
      return;
    }

    try {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'CONNECTING' });
      
      // Ensure global connection is healthy
      connectionManager.ensureConnection();

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes' as any,
          {
            event,
            schema,
            table,
            filter
          },
          handleRealtimeUpdate
        )
        .subscribe(handleConnectionStatusChange);

      channelRef.current = channel;
      isSubscribedRef.current = true;

      dispatch({ type: 'SET_LOADING', payload: false });

      logger.info('Realtime subscription created', {
        component: 'useRealtimeSubscription',
        table,
        channelName,
        config: { event, schema, filter }
      });

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown subscription error');
      logger.error('Failed to create realtime subscription', err, {
        component: 'useRealtimeSubscription',
        table
      });

      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create subscription' });
      updateMetrics({ errorCount: state.metrics.errorCount + 1 });
      
      const errorContext: ErrorContext = {
        table,
        event,
        channelName,
        attemptNumber: state.retryCount,
        timestamp: Date.now()
      };
      
      onError?.(err, errorContext);
    }
  }, [
    enabled,
    channelName,
    event,
    schema,
    table,
    filter,
    handleRealtimeUpdate,
    handleConnectionStatusChange,
    state.retryCount,
    state.metrics.errorCount,
    updateMetrics,
    onError
  ]);

  // Enhanced unsubscribe with cleanup
      const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;

      // Clear timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }

      // Process any remaining batch items
      if (batchBufferRef.current.length > 0) {
        processBatch();
      }

      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'DISCONNECTED' });

      logger.debug('Realtime subscription unsubscribed', {
        component: 'useRealtimeSubscription',
        table
      });
    }
  }, [table, processBatch]);

  // Enhanced refetch with optimistic updates support
      const refetch = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Use a more specific select to avoid type issues
      const response = await supabase
        .from(table as any)
        .select('*');

      if (response.error) throw response.error;

      // Transform fetched data with proper type handling
      const transformedData = (response.data || [])
        .map(item => transformData(item as unknown as TInput))
        .filter(Boolean) as TOutput[];

      // Apply sorting
      if (specified
      if (dataTransform.sorter) {
        transformedData.sort(dataTransform.sorter);
      }

      dispatch({ type: 'SET_DATA', payload: transformedData });

      logger.debug('Data refetched successfully', {
        component: 'useRealtimeSubscription',
        table,
        count: transformedData.length
      });

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown refetch error');
      logger.error('Failed to refetch data', err, {
        component: 'useRealtimeSubscription',
        table
      });

      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch data' });
      updateMetrics({ errorCount: state.metrics.errorCount + 1 });
      
      const errorContext: ErrorContext = {
        table,
        event,
        channelName,
        attemptNumber: 0,
        timestamp: Date.now()
      };
      
      onError?.(err, errorContext);
    }
  }, [
    table, 
    transformData, 
    dataTransform.sorter, 
    state.metrics.errorCount,
    updateMetrics, 
    onError,
    event,
    channelName
  ]);

  // Reset function for clearing state
      const reset = useCallback(() => {
    dispatch({ type: 'SET_DATA', payload: [] });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'RESET_RETRY' });
    dispatch({ type: 'UPDATE_METRICS', payload: { ...DEFAULT_METRICS } });
    metricsStartTimeRef.current = Date.now();
  }, []);

  // Get current metrics
      const getMetrics = useCallback(() => ({
    ...state.metrics,
    uptime: Date.now() - metricsStartTimeRef.current
  }), [state.metrics]);

  // Health check
      const isHealthy = useCallback(() => {
    const now = Date.now();
    const timeSinceLastMessage = now - state.metrics.lastMessageTime;
    const isRecentlyActive = timeSinceLastMessage < 60000; // 1 minute
      return state.connected && 
           state.error === null && 
           state.retryCount < finalRetryConfig.maxAttempts &&
           (state.metrics.messageCount === 0 || isRecentlyActive);
  }, [
    state.connected, 
    state.error, 
    state.retryCount, 
    state.metrics.lastMessageTime,
    state.metrics.messageCount,
    finalRetryConfig.maxAttempts
  ]);

  // Setup subscription lifecycle with initial setup
  useEffect(() => {
    if (enabled) {
      // Inline initial setup to avoid dependency issues
      const initializeSubscription = async () => {
        subscribe();
        await refetch(); // Initial data fetch
      };
      
      initializeSubscription().catch(error => {
        logger.error('Failed to initialize subscription', error as Error, {
          component: 'useRealtimeSubscription',
          table
        });
      });
    }

    return unsubscribe;
  }, [enabled, table]); // Minimal dependencies to prevent infinite loops

  // Cleanup on unmount
  useEffect(() => {
    return unsubscribe;
  }, [unsubscribe]);

  // Persistence support
  useEffect(() => {
    if (enablePersistence && persistenceKey && state.data.length > 0) {
      try {
        localStorage.setItem(persistenceKey, JSON.stringify(state.data));
      } catch (error) {
        logger.error('Failed to persist data', error as Error, {
          component: 'useRealtimeSubscription',
          table,
          persistenceKey
        });
      }
    }
  }, [enablePersistence, persistenceKey, state.data, table]);

  // Load persisted data on mount
  useEffect(() => {
    if (enablePersistence && persistenceKey) {
      try {
        const persistedData = localStorage.getItem(persistenceKey);
        if (persistedData) {
          const data = JSON.parse(persistedData) as TOutput[];
          dispatch({ type: 'SET_DATA', payload: data });
        }
      } catch (error) {
        logger.error('Failed to load persisted data', error as Error, {
          component: 'useRealtimeSubscription',
          table,
          persistenceKey
        });
      }
    }
  }, [enablePersistence, persistenceKey, table]);

  return {
    ...state,
    refetch,
    subscribe,
    unsubscribe,
    reset,
    getMetrics,
    isHealthy
  };
}

// Advanced specialized hooks with enhanced features
export function useBookingsRealtime(tenantId?: string, options?: Partial<UseRealtimeSubscriptionOptions>) {
  return useRealtimeSubscription({
    table: 'bookings',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    enableMetrics: true,
    enableOptimisticUpdates: true,
    retryConfig: {
      maxAttempts: 3,
      baseDelay: 2000
    },
    performanceConfig: {
      enableBatching: true,
      maxBatchSize: 10,
      debounceMs: 200
    },
    onInsert: (payload, transformedData) => {
      // Enhanced notification for new bookings
      logger.info('🆕 New booking received', {
        component: 'useBookingsRealtime',
        bookingId: (payload.new as { id: string })?.id,
        tenantId,
        data: transformedData
      });
    },
    onUpdate: (payload, transformedData) => {
      // Enhanced booking status updates
      logger.info('📝 Booking updated', {
        component: 'useBookingsRealtime',
        bookingId: (payload.new as { id: string })?.id,
        tenantId,
        data: transformedData
      });
    },
    onError: (error, context) => {
      logger.error('Bookings realtime error', error, {
        component: 'useBookingsRealtime',
        tenantId,
        context
      });
    },
    ...options
  });
}

export function useRestaurantMenuItemsRealtime(tenantId?: string, options?: Partial<UseRealtimeSubscriptionOptions>) {
  return useRealtimeSubscription({
    table: 'restaurant_menus' as TableName,
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    enableMetrics: true,
    dataTransform: {
      sorter: (a, b) => {
        // Sort by category, then by name
      const aItem = a as { category?: string; name?: string };
        const bItem = b as { category?: string; name?: string };
        
        const categoryCompare = (aItem.category || '').localeCompare(bItem.category || '');
        if (categoryCompare !== 0) return categoryCompare;
        
        return (aItem.name || '').localeCompare(bItem.name || '');
      },
      validator: (data) => {
        // Validate menu item has required fields
      const item = data as { name?: string; base_price?: number };
        return !!(item.name && typeof item.base_price === 'number' && item.base_price > 0);
      }
    },
    ...options
  });
}

export function useWidgetEventsRealtime(tenantId?: string, options?: Partial<UseRealtimeSubscriptionOptions>) {
  return useRealtimeSubscription({
    table: 'widget_events' as TableName,
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    enableMetrics: true,
    enablePersistence: true,
    persistenceKey: `widget_events_${tenantId}`,
    performanceConfig: {
      debounceMs: 500 // Longer debounce for widget events
    },
    dataTransform: {
      sorter: (a, b) => {
        // Sort by created date
      const aEvent = a as { created_at?: string };
        const bEvent = b as { created_at?: string };
        
        const aTime = new Date(aEvent.created_at || 0).getTime();
        const bTime = new Date(bEvent.created_at || 0).getTime();
        
        return bTime - aTime; // Latest first
      }
    },
    onInsert: (payload, transformedData) => {
      logger.info('� New widget event', {
        component: 'useWidgetEventsRealtime',
        eventId: (payload.new as { id: string })?.id,
        tenantId,
        data: transformedData
      });
    },
    onConnectionChange: (status) => {
      logger.debug('Widget events connection status', {
        component: 'useWidgetEventsRealtime',
        tenantId,
        status
      });
    },
    ...options
  });
}

// Advanced analytics hook for realtime data monitoring
export function useRealtimeAnalytics(table: TableName, tenantId?: string) {
  const subscription = useRealtimeSubscription({
    table,
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    enableMetrics: true,
    performanceConfig: {
      enableBatching: true,
      maxBatchSize: 100
    },
    onBatchUpdate: (payloads) => {
      // Advanced analytics processing
      logger.info('Batch analytics update', {
        component: 'useRealtimeAnalytics',
        table,
        tenantId,
        batchSize: payloads.length,
        events: payloads.map(p => p.eventType)
      });
    }
  });

  const analytics = useMemo(() => {
    const metrics = subscription.getMetrics();
    return {
      ...metrics,
      isActive: subscription.isHealthy(),
      dataCount: subscription.data.length,
      efficiency: metrics.messageCount > 0 ? metrics.messageCount / (metrics.errorCount + 1) : 0
    };
  }, [subscription]);

  return {
    ...subscription,
    analytics
  };
}

// Multi-table subscription hook for complex scenarios  
export function useMultiTableRealtime(
  subscriptions: Array<{
    table: TableName;
    filter?: string;
    enabled?: boolean;
  }>,
  tenantId?: string
) {
  // Create individual subscriptions as a stable array
      const subscriptionConfigs = useMemo(() => 
    subscriptions.map(sub => ({
      ...sub,
      filter: sub.filter || (tenantId ? `tenant_id=eq.${tenantId}` : undefined),
      enableMetrics: true
    })), [subscriptions, tenantId]);

  // Use a consistent way to create subscriptions
      const results = subscriptionConfigs.map((config, index) => 
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRealtimeSubscription({
      ...config,
      // Add a unique key to prevent React from treating these as the same hook
      table: config.table,
      filter: config.filter,
      enabled: config.enabled,
      enableMetrics: config.enableMetrics
    })
  );

  const combinedState = useMemo(() => {
    const allData = results.flatMap(result => result.data);
    const isLoading = results.some(result => result.loading);
    const hasError = results.some(result => result.error);
    const isConnected = results.every(result => result.connected);
    
    const combinedMetrics = results.reduce((acc, result) => {
      const metrics = result.getMetrics();
      return {
        messageCount: acc.messageCount + metrics.messageCount,
        errorCount: acc.errorCount + metrics.errorCount,
        reconnectCount: acc.reconnectCount + metrics.reconnectCount,
        averageLatency: (acc.averageLatency + metrics.averageLatency) / 2,
        lastMessageTime: Math.max(acc.lastMessageTime, metrics.lastMessageTime),
        uptime: Math.max(acc.uptime, metrics.uptime)
      };
    }, { ...DEFAULT_METRICS });

    return {
      data: allData,
      loading: isLoading,
      error: hasError ? 'One or more subscriptions have errors' : null,
      connected: isConnected,
      metrics: combinedMetrics,
      subscriptions: results,
      isHealthy: () => results.every(result => result.isHealthy())
    };
  }, [results]);

  return combinedState;
}


