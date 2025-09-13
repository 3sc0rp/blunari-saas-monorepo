/**
 * React hook for Supabase realtime subscriptions
 * Provides automatic cleanup and React lifecycle integration
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { connectionManager } from '@/utils/supabaseConnection';
import { logger } from '@/utils/logger';

interface UseRealtimeSubscriptionOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
  enabled?: boolean;
}

interface RealtimeState<T = any> {
  data: T[];
  loading: boolean;
  error: string | null;
  connected: boolean;
}

export function useRealtimeSubscription<T = any>(
  options: UseRealtimeSubscriptionOptions
): RealtimeState<T> & {
  refetch: () => Promise<void>;
  subscribe: () => void;
  unsubscribe: () => void;
} {
  const {
    table,
    event = '*',
    schema = 'public',
    filter,
    onUpdate,
    onInsert,
    onDelete,
    enabled = true
  } = options;

  const [state, setState] = useState<RealtimeState<T>>({
    data: [],
    loading: true,
    error: null,
    connected: false
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  // Generate unique channel name
  const channelName = `${table}-${schema}-${event}-${filter || 'all'}`;

  const handleRealtimeUpdate = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    logger.debug('Realtime update received', {
      component: 'useRealtimeSubscription',
      table,
      event: payload.eventType,
      record: payload.new
    });

    setState(prevState => {
      let newData = [...prevState.data];

      switch (payload.eventType) {
        case 'INSERT':
          newData.push(payload.new as T);
          onInsert?.(payload);
          break;
          
        case 'UPDATE': {
          const updateIndex = newData.findIndex((item: any) => item.id === payload.new.id);
          if (updateIndex !== -1) {
            newData[updateIndex] = payload.new as T;
          }
          onUpdate?.(payload);
          break;
        }
          
        case 'DELETE':
          newData = newData.filter((item: any) => item.id !== payload.old.id);
          onDelete?.(payload);
          break;
      }

      return {
        ...prevState,
        data: newData
      };
    });
  }, [table, onUpdate, onInsert, onDelete]);

  const subscribe = useCallback(() => {
    if (!enabled || isSubscribedRef.current || channelRef.current) {
      return;
    }

    try {
      // Ensure global connection is healthy
      connectionManager.ensureConnection();

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event,
            schema,
            table,
            filter
          },
          handleRealtimeUpdate
        )
        .subscribe((status) => {
          logger.debug('Realtime subscription status', {
            component: 'useRealtimeSubscription',
            table,
            status,
            channelName
          });

          setState(prevState => ({
            ...prevState,
            connected: status === 'SUBSCRIBED',
            error: status === 'CHANNEL_ERROR' ? 'Subscription failed' : null
          }));

          if (status === 'CHANNEL_ERROR') {
            logger.error('Realtime subscription error', new Error('Channel error'), {
              component: 'useRealtimeSubscription',
              table,
              channelName
            });
            
            // Attempt to reconnect after delay
            setTimeout(() => {
              unsubscribe();
              subscribe();
            }, 5000);
          }
        });

      channelRef.current = channel;
      isSubscribedRef.current = true;

      setState(prevState => ({
        ...prevState,
        loading: false
      }));

    } catch (error) {
      logger.error('Failed to create realtime subscription', error instanceof Error ? error : new Error('Unknown error'), {
        component: 'useRealtimeSubscription',
        table
      });

      setState(prevState => ({
        ...prevState,
        loading: false,
        error: 'Failed to create subscription'
      }));
    }
  }, [enabled, channelName, event, schema, table, filter, handleRealtimeUpdate]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;

      setState(prevState => ({
        ...prevState,
        connected: false
      }));

      logger.debug('Realtime subscription unsubscribed', {
        component: 'useRealtimeSubscription',
        table
      });
    }
  }, [table]);

  const refetch = useCallback(async () => {
    setState(prevState => ({ ...prevState, loading: true }));
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) throw error;

      setState(prevState => ({
        ...prevState,
        data: data || [],
        loading: false,
        error: null
      }));
    } catch (error) {
      logger.error('Failed to refetch data', error instanceof Error ? error : new Error('Unknown error'), {
        component: 'useRealtimeSubscription',
        table
      });

      setState(prevState => ({
        ...prevState,
        loading: false,
        error: 'Failed to fetch data'
      }));
    }
  }, [table]);

  // Setup subscription on mount or when dependencies change
  useEffect(() => {
    if (enabled) {
      subscribe();
      refetch(); // Initial data fetch
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe, unsubscribe, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    ...state,
    refetch,
    subscribe,
    unsubscribe
  };
}

// Specialized hooks for common use cases
export function useOrdersRealtime(tenantId?: string) {
  return useRealtimeSubscription({
    table: 'orders',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    onInsert: (payload) => {
      // Show notification for new orders
      console.log('🆕 New order received:', payload.new);
    },
    onUpdate: (payload) => {
      // Handle order status updates
      console.log('📝 Order updated:', payload.new);
    }
  });
}

export function useMenuItemsRealtime(tenantId?: string) {
  return useRealtimeSubscription({
    table: 'menu_items',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined
  });
}

export function useReservationsRealtime(tenantId?: string) {
  return useRealtimeSubscription({
    table: 'reservations',
    filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
    onInsert: (payload) => {
      console.log('📅 New reservation:', payload.new);
    }
  });
}
