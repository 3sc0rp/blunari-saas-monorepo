import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CateringPackage, CreateCateringPackageRequest, UpdateCateringPackageRequest } from '@/types/catering';

export const useCateringPackages = (tenantId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch catering packages
  const { 
    data: packages = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['catering-packages', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data: packagesData, error } = await supabase
        .from('catering_packages')
        .select('*')
        .eq('active', true)
        .order('popular', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (packagesData || []) as CateringPackage[];
    },
    enabled: !!tenantId,
    staleTime: 300000, // Consider data fresh for 5 minutes
  });

  // Create catering package
  const createPackageMutation = useMutation({
    mutationFn: async (packageData: CreateCateringPackageRequest) => {
      const { data, error } = await supabase
        .from('catering_packages')
        .insert({
          ...packageData,
          tenant_id: tenantId!,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catering-packages', tenantId] });
      toast({
        title: 'Package Created',
        description: `"${data.name}" package has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error('Create package error:', error);
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create package',
        variant: 'destructive',
      });
    },
  });

  // Update catering package
  const updatePackageMutation = useMutation({
    mutationFn: async ({ 
      packageId, 
      updates 
    }: { 
      packageId: string; 
      updates: UpdateCateringPackageRequest 
    }) => {
      const { data, error } = await supabase
        .from('catering_packages')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', packageId)
        .eq('tenant_id', tenantId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catering-packages', tenantId] });
      toast({
        title: 'Package Updated',
        description: `"${data.name}" package has been updated.`,
      });
    },
    onError: (error) => {
      console.error('Update package error:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update package',
        variant: 'destructive',
      });
    },
  });

  // Delete/deactivate catering package
  const deletePackageMutation = useMutation({
    mutationFn: async (packageId: string) => {
      // Soft delete by setting active to false
      const { data, error } = await supabase
        .from('catering_packages')
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', packageId)
        .eq('tenant_id', tenantId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catering-packages', tenantId] });
      toast({
        title: 'Package Deleted',
        description: `"${data.name}" package has been removed.`,
      });
    },
    onError: (error) => {
      console.error('Delete package error:', error);
      toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'Failed to delete package',
        variant: 'destructive',
      });
    },
  });

  // Toggle package popularity
  const togglePopularMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const pkg = packages.find(p => p.id === packageId);
      if (!pkg) throw new Error('Package not found');

      const { data, error } = await supabase
        .from('catering_packages')
        .update({
          popular: !pkg.popular,
          updated_at: new Date().toISOString(),
        })
        .eq('id', packageId)
        .eq('tenant_id', tenantId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catering-packages', tenantId] });
      toast({
        title: data.popular ? 'Marked as Popular' : 'Removed from Popular',
        description: `"${data.name}" package has been ${data.popular ? 'marked as popular' : 'removed from popular packages'}.`,
      });
    },
    onError: (error) => {
      console.error('Toggle popular error:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update package',
        variant: 'destructive',
      });
    },
  });

  // Get popular packages
  const getPopularPackages = () => {
    return packages.filter(pkg => pkg.popular);
  };

  // Get packages by price range
  const getPackagesByPriceRange = (minPrice: number, maxPrice: number) => {
    return packages.filter(pkg => 
      pkg.price_per_person >= minPrice && pkg.price_per_person <= maxPrice
    );
  };

  // Get packages by guest count
  const getPackagesByGuestCount = (guestCount: number) => {
    return packages.filter(pkg => 
      guestCount >= pkg.min_guests && (!pkg.max_guests || guestCount <= pkg.max_guests)
    );
  };

  // Calculate package performance metrics
  const getPackageMetrics = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return null;

    // For now return empty metrics since we don't have orders relationship loaded
    return {
      total_orders: 0,
      confirmed_orders: 0,
      conversion_rate: 0,
      total_revenue: 0,
      average_order_value: 0,
    };
  };

  return {
    // Data
    packages,
    isLoading,
    error,
    
    // Mutations
    createPackage: createPackageMutation.mutate,
    isCreating: createPackageMutation.isPending,
    updatePackage: updatePackageMutation.mutate,
    isUpdating: updatePackageMutation.isPending,
    deletePackage: deletePackageMutation.mutate,
    isDeleting: deletePackageMutation.isPending,
    togglePopular: togglePopularMutation.mutate,
    isTogglingPopular: togglePopularMutation.isPending,
    
    // Utilities
    refetch,
    getPopularPackages,
    getPackagesByPriceRange,
    getPackagesByGuestCount,
    getPackageMetrics,
  };
};
