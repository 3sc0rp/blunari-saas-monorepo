// Week 17-18: Smart Notifications - useNotifications Hook
// React hooks for notification CRUD operations and real-time updates
// Author: AI Agent
// Date: October 20, 2025

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Notification {
  id: string;
  tenant_id: string;
  user_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  recipient_device_token?: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
  image_url?: string;
  template_id?: string;
  template_variables?: Record<string, any>;
  channels: string[];
  channel_priority?: Record<string, any>;
  scheduled_at?: string;
  expires_at?: string;
  group_id?: string;
  is_digest_eligible: boolean;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  failure_reason?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  tenant_id: string;
  user_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  recipient_device_token?: string;
  category: string;
  priority?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
  image_url?: string;
  template_id?: string;
  template_variables?: Record<string, any>;
  channels: string[];
  channel_priority?: Record<string, any>;
  scheduled_at?: string;
  expires_at?: string;
}

export interface NotificationFilters {
  category?: string;
  priority?: string;
  status?: string;
  unread_only?: boolean;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

// Query keys factory
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (tenantId: string, userId?: string, filters?: NotificationFilters) =>
    [...notificationKeys.lists(), tenantId, userId, filters] as const,
  unread: (tenantId: string, userId: string) =>
    [...notificationKeys.all, 'unread', tenantId, userId] as const,
  detail: (id: string) => [...notificationKeys.all, 'detail', id] as const,
  stats: (tenantId: string, userId?: string) =>
    [...notificationKeys.all, 'stats', tenantId, userId] as const,
};

/**
 * Hook: Get notifications for current user
 * Auto-refreshes every 30 seconds for real-time updates
 */
export function useNotifications(
  tenantId: string,
  userId?: string,
  filters?: NotificationFilters
) {
  return useQuery({
    queryKey: notificationKeys.list(tenantId, userId, filters),
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Add user filter
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Add filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.unread_only) {
        query = query.is('read_at', null);
      }
      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Notification[];
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30s
  });
}

/**
 * Hook: Get single notification by ID
 */
export function useNotification(id: string) {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Notification;
    },
    enabled: !!id,
  });
}

/**
 * Hook: Get unread notification count
 */
export function useUnreadCount(tenantId: string, userId: string) {
  return useQuery({
    queryKey: notificationKeys.unread(tenantId, userId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    },
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 10 * 1000, // Auto-refresh every 10s
  });
}

/**
 * Hook: Get notification statistics
 */
export function useNotificationStats(tenantId: string, userId?: string) {
  return useQuery({
    queryKey: notificationKeys.stats(tenantId, userId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_notification_stats', {
        p_tenant_id: tenantId,
        p_days: 30,
      });

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Create notification via Edge Function
 */
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNotificationInput) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate notification lists
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      if (variables.user_id) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unread(variables.tenant_id, variables.user_id),
        });
      }
    },
  });
}

/**
 * Hook: Mark notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.detail(data.id),
      });
      if (data.user_id) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unread(data.tenant_id, data.user_id),
        });
      }
    },
  });
}

/**
 * Hook: Mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, userId }: { tenantId: string; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unread(variables.tenantId, variables.userId),
      });
    },
  });
}

/**
 * Hook: Delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    },
  });
}

/**
 * Hook: Delete multiple notifications
 */
export function useDeleteNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      userId,
      beforeDate,
    }: {
      tenantId: string;
      userId: string;
      beforeDate?: string;
    }) => {
      let query = supabase
        .from('notifications')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (beforeDate) {
        query = query.lt('created_at', beforeDate);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unread(variables.tenantId, variables.userId),
      });
    },
  });
}

/**
 * Hook: Retry failed notification
 */
export function useRetryNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // Get the notification
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (fetchError) throw fetchError;

      // Check if can retry
      if (notification.retry_count >= notification.max_retries) {
        throw new Error('Maximum retries exceeded');
      }

      // Reset status and schedule
      const { data, error } = await supabase
        .from('notifications')
        .update({
          status: 'pending',
          retry_count: notification.retry_count + 1,
          scheduled_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.detail(data.id),
      });
    },
  });
}

/**
 * Hook: Get recent notifications (last 24 hours)
 */
export function useRecentNotifications(tenantId: string, userId: string, limit = 10) {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  return useNotifications(tenantId, userId, {
    start_date: last24Hours,
    limit,
  });
}

/**
 * Hook: Get notifications by category
 */
export function useNotificationsByCategory(
  tenantId: string,
  userId: string,
  category: string
) {
  return useNotifications(tenantId, userId, { category });
}

/**
 * Hook: Get urgent notifications
 */
export function useUrgentNotifications(tenantId: string, userId: string) {
  return useNotifications(tenantId, userId, {
    priority: 'urgent',
    unread_only: true,
  });
}

/**
 * Hook: Subscribe to real-time notification updates
 */
export function useNotificationSubscription(
  tenantId: string,
  userId: string,
  onNotification: (notification: Notification) => void
) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const channel = supabase
      .channel(`notifications:${tenantId}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${tenantId},user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          onNotification(notification);
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
          queryClient.invalidateQueries({
            queryKey: notificationKeys.unread(tenantId, userId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, userId, onNotification, queryClient]);
}

// Re-export React for the subscription hook
import React from 'react';
