// Week 17-18: Smart Notifications - useNotificationTemplates & useNotificationDeliveries Hooks
// React hooks for templates and delivery tracking
// Author: AI Agent
// Date: October 20, 2025

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// NOTIFICATION TEMPLATES
// =====================================================

export interface NotificationTemplate {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string;
  category: string;
  templates: Record<string, any>;
  variables: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  is_system_template: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  tenant_id: string;
  name: string;
  description?: string;
  category: string;
  templates: Record<string, any>;
  variables: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
}

// Query keys
export const templateKeys = {
  all: ['notification-templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (tenantId?: string, category?: string) =>
    [...templateKeys.lists(), tenantId, category] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
  system: () => [...templateKeys.all, 'system'] as const,
  categories: () => [...templateKeys.all, 'categories'] as const,
};

/**
 * Hook: Get notification templates
 */
export function useNotificationTemplates(tenantId?: string, category?: string) {
  return useQuery({
    queryKey: templateKeys.list(tenantId, category),
    queryFn: async () => {
      let query = supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      // Include system templates + tenant templates
      if (tenantId) {
        query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
      } else {
        query = query.is('tenant_id', null);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as NotificationTemplate[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook: Get system templates only
 */
export function useSystemTemplates(category?: string) {
  return useQuery({
    queryKey: [...templateKeys.system(), category],
    queryFn: async () => {
      let query = supabase
        .from('notification_templates')
        .select('*')
        .eq('is_system_template', true)
        .eq('is_active', true)
        .order('name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as NotificationTemplate[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (system templates rarely change)
  });
}

/**
 * Hook: Get single template
 */
export function useNotificationTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as NotificationTemplate;
    },
    enabled: !!id,
  });
}

/**
 * Hook: Get template categories
 */
export function useTemplateCategories() {
  return useQuery({
    queryKey: templateKeys.categories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data.map((t) => t.category))];
      return categories;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook: Create custom template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          ...input,
          is_system_template: false,
          is_active: true,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as NotificationTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });
}

/**
 * Hook: Update template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<NotificationTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('notification_templates')
        .update(updates)
        .eq('id', id)
        .eq('is_system_template', false) // Can't update system templates
        .select()
        .single();

      if (error) throw error;
      return data as NotificationTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(data.id) });
    },
  });
}

/**
 * Hook: Delete template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', templateId)
        .eq('is_system_template', false); // Can't delete system templates

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });
}

// =====================================================
// NOTIFICATION DELIVERIES
// =====================================================

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  tenant_id: string;
  channel: string;
  status: string;
  external_id?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  failed_at?: string;
  error_code?: string;
  error_message?: string;
  retry_count: number;
  cost_amount?: number;
  cost_currency?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Query keys
export const deliveryKeys = {
  all: ['notification-deliveries'] as const,
  lists: () => [...deliveryKeys.all, 'list'] as const,
  list: (tenantId: string, notificationId?: string, channel?: string) =>
    [...deliveryKeys.lists(), tenantId, notificationId, channel] as const,
  detail: (id: string) => [...deliveryKeys.all, 'detail', id] as const,
  stats: (tenantId: string, channel?: string, days?: number) =>
    [...deliveryKeys.all, 'stats', tenantId, channel, days] as const,
};

/**
 * Hook: Get notification deliveries
 */
export function useNotificationDeliveries(
  tenantId: string,
  notificationId?: string,
  channel?: string
) {
  return useQuery({
    queryKey: deliveryKeys.list(tenantId, notificationId, channel),
    queryFn: async () => {
      let query = supabase
        .from('notification_deliveries')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (notificationId) {
        query = query.eq('notification_id', notificationId);
      }

      if (channel) {
        query = query.eq('channel', channel);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as NotificationDelivery[];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook: Get single delivery
 */
export function useNotificationDelivery(id: string) {
  return useQuery({
    queryKey: deliveryKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_deliveries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as NotificationDelivery[];
    },
    enabled: !!id,
  });
}

/**
 * Hook: Get delivery statistics by channel
 */
export function useDeliveryStats(tenantId: string, channel?: string, days = 30) {
  return useQuery({
    queryKey: deliveryKeys.stats(tenantId, channel, days),
    queryFn: async () => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from('notification_deliveries')
        .select('status, channel, cost_amount, cost_currency')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate);

      if (channel) {
        query = query.eq('channel', channel);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate statistics
      const total = data.length;
      const byStatus = data.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byChannel = data.reduce((acc, d) => {
        acc[d.channel] = (acc[d.channel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalCost = data.reduce((sum, d) => {
        return sum + (d.cost_amount || 0);
      }, 0);

      return {
        total,
        sent: byStatus.sent || 0,
        delivered: byStatus.delivered || 0,
        failed: byStatus.failed || 0,
        bounced: byStatus.bounced || 0,
        delivery_rate: total > 0 ? ((byStatus.delivered || 0) / total) * 100 : 0,
        by_channel: byChannel,
        total_cost: totalCost,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Get failed deliveries
 */
export function useFailedDeliveries(tenantId: string, limit = 50) {
  return useQuery({
    queryKey: [...deliveryKeys.lists(), 'failed', tenantId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_deliveries')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as NotificationDelivery[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook: Get recent deliveries (last 24 hours)
 */
export function useRecentDeliveries(tenantId: string, limit = 100) {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  return useQuery({
    queryKey: [...deliveryKeys.lists(), 'recent', tenantId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_deliveries')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', last24Hours)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as NotificationDelivery[];
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

/**
 * Hook: Get delivery performance by time of day
 */
export function useDeliveryPerformanceByTime(tenantId: string, days = 7) {
  return useQuery({
    queryKey: [...deliveryKeys.all, 'performance-by-time', tenantId, days],
    queryFn: async () => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('notification_deliveries')
        .select('created_at, status, sent_at, delivered_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate);

      if (error) throw error;

      // Group by hour of day
      const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        total: 0,
        delivered: 0,
        failed: 0,
      }));

      data.forEach((delivery) => {
        const hour = new Date(delivery.created_at).getHours();
        hourlyStats[hour].total++;
        if (delivery.status === 'delivered') {
          hourlyStats[hour].delivered++;
        } else if (delivery.status === 'failed') {
          hourlyStats[hour].failed++;
        }
      });

      return hourlyStats;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook: Track delivery webhook updates
 * For external provider callbacks
 */
export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      externalId,
      status,
      metadata,
    }: {
      externalId: string;
      status: string;
      metadata?: Record<string, any>;
    }) => {
      const updates: Record<string, any> = { status };

      if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      } else if (status === 'failed' || status === 'bounced') {
        updates.failed_at = new Date().toISOString();
        if (status === 'bounced') {
          updates.bounced_at = new Date().toISOString();
        }
      }

      if (metadata) {
        updates.metadata = metadata;
      }

      const { data, error } = await supabase
        .from('notification_deliveries')
        .update(updates)
        .eq('external_id', externalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
    },
  });
}
