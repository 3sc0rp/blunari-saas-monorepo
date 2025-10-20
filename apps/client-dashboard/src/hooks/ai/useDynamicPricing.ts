/**
 * useDynamicPricing Hook
 * 
 * React hook for calculating and managing dynamic pricing.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DynamicPricingResult {
  package_id: string;
  package_name: string;
  base_price: number;
  adjusted_price: number;
  price_change_percent: number;
  price_change_type: 'premium' | 'discount' | 'standard';
  demand_multiplier: number;
  applied_rules: Array<{
    rule_id: string;
    rule_name: string;
    adjustment: number;
  }>;
  explanation: string;
  model_id: string;
}

export interface CalculatePricingParams {
  tenant_id: string;
  package_id: string;
  event_date?: string;
  guest_count?: number;
}

export function useDynamicPricing(tenantId: string, packageId: string, eventDate?: string) {
  const queryClient = useQueryClient();

  // Calculate pricing via Edge Function
  const calculatePricingMutation = useMutation({
    mutationFn: async (params: CalculatePricingParams) => {
      const { data, error } = await supabase.functions.invoke('calculate-dynamic-pricing', {
        body: params,
      });

      if (error) throw error;
      return data as DynamicPricingResult;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['dynamic-pricing', tenantId, packageId, eventDate], data);
    },
    onError: (error: any) => {
      console.error('Error calculating pricing:', error);
      toast.error(error.message || 'Failed to calculate pricing');
    },
  });

  // Fetch pricing history
  const {
    data: pricingHistory,
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: ['pricing-history', tenantId, packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_history')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('catering_package_id', packageId)
        .order('applied_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!tenantId && !!packageId,
  });

  // Calculate pricing statistics
  const stats = pricingHistory
    ? {
        total_adjustments: pricingHistory.length,
        avg_adjustment: pricingHistory.reduce((sum, h) => sum + (h.adjusted_price - h.original_price), 0) / pricingHistory.length,
        max_premium: Math.max(...pricingHistory.map((h) => h.adjusted_price - h.original_price)),
        max_discount: Math.min(...pricingHistory.map((h) => h.adjusted_price - h.original_price)),
      }
    : null;

  return {
    calculatePricing: calculatePricingMutation.mutate,
    isCalculating: calculatePricingMutation.isPending,
    pricingResult: calculatePricingMutation.data,
    pricingHistory,
    isLoadingHistory,
    stats,
  };
}

export function usePricingRules(tenantId: string) {
  const queryClient = useQueryClient();

  // Fetch all pricing rules
  const {
    data: rules,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['pricing-rules', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!tenantId,
  });

  // Create new pricing rule
  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: any) => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .insert({ ...ruleData, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules', tenantId] });
      toast.success('Pricing rule created');
    },
    onError: (error: any) => {
      console.error('Error creating rule:', error);
      toast.error(error.message || 'Failed to create rule');
    },
  });

  // Update pricing rule
  const updateRuleMutation = useMutation({
    mutationFn: async ({ ruleId, updates }: { ruleId: string; updates: any }) => {
      const { data, error } = await supabase
        .from('pricing_rules')
        .update(updates)
        .eq('id', ruleId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules', tenantId] });
      toast.success('Pricing rule updated');
    },
    onError: (error: any) => {
      console.error('Error updating rule:', error);
      toast.error(error.message || 'Failed to update rule');
    },
  });

  // Delete pricing rule
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', ruleId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules', tenantId] });
      toast.success('Pricing rule deleted');
    },
    onError: (error: any) => {
      console.error('Error deleting rule:', error);
      toast.error(error.message || 'Failed to delete rule');
    },
  });

  return {
    rules,
    isLoading,
    error,
    refetch,
    createRule: createRuleMutation.mutate,
    updateRule: updateRuleMutation.mutate,
    deleteRule: deleteRuleMutation.mutate,
    isCreating: createRuleMutation.isPending,
    isUpdating: updateRuleMutation.isPending,
    isDeleting: deleteRuleMutation.isPending,
  };
}
