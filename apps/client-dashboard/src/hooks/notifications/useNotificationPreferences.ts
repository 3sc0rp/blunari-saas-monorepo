// Week 17-18: Smart Notifications - useNotificationPreferences Hook
// React hooks for managing user notification preferences
// Author: AI Agent
// Date: October 20, 2025

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface NotificationPreferences {
  id: string;
  tenant_id: string;
  user_id: string;
  is_enabled: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  timezone: string;
  channel_preferences: Record<string, any>;
  category_preferences: Record<string, any>;
  enable_digest: boolean;
  digest_frequency: string;
  digest_time: string;
  digest_day_of_week?: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesInput {
  tenant_id: string;
  user_id: string;
  is_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  timezone?: string;
  channel_preferences?: Record<string, any>;
  category_preferences?: Record<string, any>;
  enable_digest?: boolean;
  digest_frequency?: string;
  digest_time?: string;
  digest_day_of_week?: number | null;
}

export interface NotificationChannel {
  id: string;
  tenant_id: string;
  channel: string;
  is_enabled: boolean;
  config: Record<string, any>;
  max_sends_per_hour?: number;
  max_sends_per_day?: number;
  current_hour_count: number;
  current_day_count: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  last_used_at?: string;
}

// Query keys factory
export const preferenceKeys = {
  all: ['notification-preferences'] as const,
  detail: (tenantId: string, userId: string) =>
    [...preferenceKeys.all, tenantId, userId] as const,
  channels: (tenantId: string) => [...preferenceKeys.all, 'channels', tenantId] as const,
  test: (userId: string, channel: string, category: string) =>
    [...preferenceKeys.all, 'test', userId, channel, category] as const,
};

/**
 * Hook: Get user notification preferences
 */
export function useNotificationPreferences(tenantId: string, userId: string) {
  return useQuery({
    queryKey: preferenceKeys.detail(tenantId, userId),
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-notification-preferences?user_id=${userId}&tenant_id=${tenantId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch preferences');
      }

      const result = await response.json();
      return result.preferences as NotificationPreferences;
    },
    enabled: !!tenantId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePreferencesInput) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-notification-preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify(input),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      const result = await response.json();
      return result.preferences as NotificationPreferences;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: preferenceKeys.detail(data.tenant_id, data.user_id),
      });
    },
  });
}

/**
 * Hook: Reset preferences to defaults
 */
export function useResetPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, userId }: { tenantId: string; userId: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-notification-preferences/reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({ tenant_id: tenantId, user_id: userId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset preferences');
      }

      const result = await response.json();
      return result.preferences as NotificationPreferences;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: preferenceKeys.detail(data.tenant_id, data.user_id),
      });
    },
  });
}

/**
 * Hook: Test notification preferences
 * Check if a notification would be sent given current preferences
 */
export function useTestPreferences() {
  return useMutation({
    mutationFn: async ({
      userId,
      tenantId,
      channel,
      category,
      priority = 'normal',
    }: {
      userId: string;
      tenantId: string;
      channel: string;
      category: string;
      priority?: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-notification-preferences/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({ user_id: userId, tenant_id: tenantId, channel, category, priority }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to test preferences');
      }

      return await response.json();
    },
  });
}

/**
 * Hook: Get available notification channels for tenant
 */
export function useNotificationChannels(tenantId: string) {
  return useQuery({
    queryKey: preferenceKeys.channels(tenantId),
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-notification-preferences/channels?tenant_id=${tenantId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch channels');
      }

      const result = await response.json();
      return result.channels as NotificationChannel[];
    },
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook: Toggle notifications on/off
 */
export function useToggleNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      userId,
      enabled,
    }: {
      tenantId: string;
      userId: string;
      enabled: boolean;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-notification-preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            user_id: userId,
            is_enabled: enabled,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle notifications');
      }

      const result = await response.json();
      return result.preferences as NotificationPreferences;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: preferenceKeys.detail(data.tenant_id, data.user_id),
      });
    },
  });
}

/**
 * Hook: Update channel preferences
 */
export function useUpdateChannelPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      userId,
      channel,
      enabled,
      categories,
    }: {
      tenantId: string;
      userId: string;
      channel: string;
      enabled: boolean;
      categories?: string[];
    }) => {
      // Get current preferences
      const { data: currentPrefs } = await supabase
        .from('notification_preferences')
        .select('channel_preferences')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .single();

      const channelPreferences = currentPrefs?.channel_preferences || {};
      
      // Update specific channel
      channelPreferences[channel] = {
        enabled,
        categories: categories || channelPreferences[channel]?.categories || [],
      };

      // Update via Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-notification-preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            user_id: userId,
            channel_preferences: channelPreferences,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update channel preferences');
      }

      const result = await response.json();
      return result.preferences as NotificationPreferences;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: preferenceKeys.detail(data.tenant_id, data.user_id),
      });
    },
  });
}

/**
 * Hook: Update category preferences
 */
export function useUpdateCategoryPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      userId,
      category,
      enabled,
      priorityThreshold,
    }: {
      tenantId: string;
      userId: string;
      category: string;
      enabled: boolean;
      priorityThreshold?: string;
    }) => {
      // Get current preferences
      const { data: currentPrefs } = await supabase
        .from('notification_preferences')
        .select('category_preferences')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .single();

      const categoryPreferences = currentPrefs?.category_preferences || {};
      
      // Update specific category
      categoryPreferences[category] = {
        enabled,
        priority_threshold: priorityThreshold || categoryPreferences[category]?.priority_threshold || 'normal',
      };

      // Update via Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-notification-preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            user_id: userId,
            category_preferences: categoryPreferences,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category preferences');
      }

      const result = await response.json();
      return result.preferences as NotificationPreferences;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: preferenceKeys.detail(data.tenant_id, data.user_id),
      });
    },
  });
}

/**
 * Hook: Update quiet hours
 */
export function useUpdateQuietHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      userId,
      startTime,
      endTime,
      timezone,
    }: {
      tenantId: string;
      userId: string;
      startTime: string | null;
      endTime: string | null;
      timezone?: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-notification-preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            user_id: userId,
            quiet_hours_start: startTime,
            quiet_hours_end: endTime,
            timezone: timezone,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update quiet hours');
      }

      const result = await response.json();
      return result.preferences as NotificationPreferences;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: preferenceKeys.detail(data.tenant_id, data.user_id),
      });
    },
  });
}

/**
 * Hook: Update digest settings
 */
export function useUpdateDigestSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantId,
      userId,
      enabled,
      frequency,
      time,
      dayOfWeek,
    }: {
      tenantId: string;
      userId: string;
      enabled: boolean;
      frequency?: string;
      time?: string;
      dayOfWeek?: number | null;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-notification-preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            user_id: userId,
            enable_digest: enabled,
            digest_frequency: frequency,
            digest_time: time,
            digest_day_of_week: dayOfWeek,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update digest settings');
      }

      const result = await response.json();
      return result.preferences as NotificationPreferences;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: preferenceKeys.detail(data.tenant_id, data.user_id),
      });
    },
  });
}
