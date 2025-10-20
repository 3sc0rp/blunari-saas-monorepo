/**
 * useMenuRecommendations Hook
 * 
 * React hook for fetching and managing AI-generated menu recommendations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MenuRecommendation {
  id: string;
  tenant_id: string;
  catering_package_id: string;
  recommended_for: 'general' | 'season' | 'event_type' | 'dietary' | 'budget' | 'trending';
  target_audience: string | null;
  reason: string | null;
  confidence_score: number | null;
  predicted_popularity: number | null;
  suggested_price: number | null;
  expected_orders_per_month: number | null;
  seasonal_factor: number | null;
  trend_direction: 'rising' | 'stable' | 'falling' | null;
  last_recommended_at: string;
  times_shown: number;
  times_clicked: number;
  times_ordered: number;
  created_at: string;
  updated_at: string;
}

export interface GenerateRecommendationsParams {
  tenant_id: string;
  limit?: number;
  recommendation_type?: 'general' | 'season' | 'trending';
}

export function useMenuRecommendations(
  tenantId: string,
  recommendationType: 'general' | 'season' | 'trending' = 'general'
) {
  const queryClient = useQueryClient();

  // Fetch existing recommendations
  const {
    data: recommendations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['menu-recommendations', tenantId, recommendationType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_recommendations')
        .select(`
          *,
          catering_packages:catering_package_id (
            id,
            name,
            description,
            price,
            image_url,
            dietary_preferences
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('recommended_for', recommendationType)
        .order('confidence_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!tenantId,
  });

  // Generate new recommendations via Edge Function
  const generateRecommendationsMutation = useMutation({
    mutationFn: async (params: GenerateRecommendationsParams) => {
      const { data, error } = await supabase.functions.invoke('recommend-menu-items', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['menu-recommendations', tenantId] });
      toast.success(`Generated ${data.recommendations?.length || 0} recommendations`);
    },
    onError: (error: any) => {
      console.error('Error generating recommendations:', error);
      toast.error(error.message || 'Failed to generate recommendations');
    },
  });

  // Track recommendation interaction
  const trackInteractionMutation = useMutation({
    mutationFn: async ({ recommendationId, action }: { recommendationId: string; action: 'shown' | 'clicked' | 'ordered' }) => {
      const field = action === 'shown' ? 'times_shown' : action === 'clicked' ? 'times_clicked' : 'times_ordered';
      
      const { error } = await supabase.rpc('increment', {
        table_name: 'menu_recommendations',
        row_id: recommendationId,
        field_name: field,
      });

      if (error) throw error;
    },
    onError: (error: any) => {
      console.error('Error tracking interaction:', error);
    },
  });

  // Calculate conversion rate
  const conversionRate = recommendations
    ? recommendations.reduce((sum, rec) => {
        const shown = rec.times_shown || 0;
        if (shown === 0) return sum;
        return sum + ((rec.times_ordered || 0) / shown);
      }, 0) / recommendations.length
    : 0;

  return {
    recommendations,
    isLoading,
    error,
    refetch,
    generateRecommendations: generateRecommendationsMutation.mutate,
    isGenerating: generateRecommendationsMutation.isPending,
    trackInteraction: trackInteractionMutation.mutate,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

export function useTopRecommendations(tenantId: string, limit = 5) {
  // Fetch top recommendations using SQL function
  return useQuery({
    queryKey: ['top-recommendations', tenantId, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_menu_recommendations', {
        p_tenant_id: tenantId,
        p_limit: limit,
      });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    enabled: !!tenantId,
  });
}
