import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CateringPackage,
  CreateCateringPackageRequest,
  UpdateCateringPackageRequest,
} from "../types/catering";

export const useCateringPackages = (tenantId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch catering packages
  const {
    data: packages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["catering-packages", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      try {
        // Cast to any to bypass TypeScript checking for tables that may not be in schema yet
        const { data: packagesData, error } = await supabase
          .from("catering_packages" as any)
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("active", true)
          .order("popular", { ascending: false })
          .order("display_order", { ascending: true, nulls: 'last' as any })
          .order("created_at", { ascending: false });

        if (error) {
          // If table doesn't exist yet, return empty array
          if (
            error.code === "42P01" ||
            error.message?.includes("relation") ||
            error.message?.includes("does not exist")
          ) {
            console.info(
              "Catering packages table not found. Please run the database migration.",
            );
            return [];
          }
          throw error;
        }
        return (packagesData || []) as unknown as CateringPackage[];
      } catch (err) {
        console.warn("Error fetching catering packages:", err);
        return [];
      }
    },
    enabled: !!tenantId,
    staleTime: 300000, // Consider data fresh for 5 minutes
  });

  // Realtime subscription to reflect updates instantly in dashboard
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`rt-catering-packages-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catering_packages', filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["catering-packages", tenantId] });
        }
      )
      .subscribe();

    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, [tenantId, queryClient]);

  // Create catering package
  const createPackageMutation = useMutation({
    mutationFn: async (packageData: CreateCateringPackageRequest) => {
      // Prefer direct insert (uses RLS WITH CHECK + trigger). If blocked, fallback to RPC.
      try {
        const { data, error } = await supabase
          .from("catering_packages" as any)
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
        return data as unknown as CateringPackage;
      } catch (directErr: any) {
        // Fallback to RPC (SECURITY DEFINER sets tenant_id server-side; payload may omit tenant_id)
        const { data, error } = await supabase.rpc(
          "catering_create_package",
          { payload: { ...packageData } as any },
        );
        if (error) throw error;
        return data as unknown as CateringPackage;
      }
    },
    onMutate: async (packageData: CreateCateringPackageRequest) => {
      await queryClient.cancelQueries({ queryKey: ["catering-packages", tenantId] });
      const prev = queryClient.getQueryData<CateringPackage[]>(["catering-packages", tenantId]);
      const optimistic: CateringPackage = {
        id: `temp_${Date.now()}` as any,
        tenant_id: tenantId!,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        display_order: (prev?.length || 0) * 10 + 10,
        popular: false,
        ...packageData as any,
      };
      if (prev) queryClient.setQueryData(["catering-packages", tenantId], [optimistic, ...prev]);
      return { prev };
    },
    onError: (_error, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["catering-packages", tenantId], context.prev);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["catering-packages", tenantId],
      });
      toast({
        title: "Package Created",
        description: `"${(data as any)?.name || "Package"}" has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error("Create package error:", error);
      toast({
        title: "Creation Failed",
        description:
          error instanceof Error ? error.message : "Failed to create package",
        variant: "destructive",
      });
    },
  });

  // Update catering package
  const updatePackageMutation = useMutation({
    mutationFn: async ({
      packageId,
      updates,
    }: {
      packageId: string;
      updates: UpdateCateringPackageRequest;
    }) => {
      const { data, error } = await supabase
        .from("catering_packages" as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", packageId)
        .eq("tenant_id", tenantId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ packageId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["catering-packages", tenantId] });
      const prev = queryClient.getQueryData<CateringPackage[]>(["catering-packages", tenantId]);
      if (prev) {
        const next = prev.map(p => p.id === packageId ? ({ ...p, ...updates, updated_at: new Date().toISOString() } as any) : p);
        queryClient.setQueryData(["catering-packages", tenantId], next);
      }
      return { prev };
    },
    onError: (_error, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["catering-packages", tenantId], context.prev);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["catering-packages", tenantId],
      });
      toast({
        title: "Package Updated",
        description: `"${(data as any)?.name || "Package"}" has been updated.`,
      });
    },
    onError: (error) => {
      console.error("Update package error:", error);
      toast({
        title: "Update Failed",
        description:
          error instanceof Error ? error.message : "Failed to update package",
        variant: "destructive",
      });
    },
  });

  // Delete/deactivate catering package
  const deletePackageMutation = useMutation({
    mutationFn: async (packageId: string) => {
      // Soft delete by setting active to false
      const { data, error } = await supabase
        .from("catering_packages" as any)
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", packageId)
        .eq("tenant_id", tenantId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (packageId: string) => {
      await queryClient.cancelQueries({ queryKey: ["catering-packages", tenantId] });
      const prev = queryClient.getQueryData<CateringPackage[]>(["catering-packages", tenantId]);
      if (prev) {
        const next = prev.filter(p => p.id !== packageId);
        queryClient.setQueryData(["catering-packages", tenantId], next);
      }
      return { prev };
    },
    onError: (_error, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["catering-packages", tenantId], context.prev);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["catering-packages", tenantId],
      });
      toast({
        title: "Package Deleted",
        description: `"${(data as any)?.name || "Package"}" has been removed.`,
      });
    },
    onError: (error) => {
      console.error("Delete package error:", error);
      toast({
        title: "Deletion Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete package",
        variant: "destructive",
      });
    },
  });

  // Toggle package popularity
  const togglePopularMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const pkg = packages.find((p) => p.id === packageId);
      if (!pkg) throw new Error("Package not found");

      const { data, error } = await supabase
        .from("catering_packages" as any)
        .update({
          popular: !pkg.popular,
          updated_at: new Date().toISOString(),
        })
        .eq("id", packageId)
        .eq("tenant_id", tenantId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (packageId: string) => {
      await queryClient.cancelQueries({ queryKey: ["catering-packages", tenantId] });
      const prev = queryClient.getQueryData<CateringPackage[]>(["catering-packages", tenantId]);
      if (prev) {
        const next = prev.map(p => p.id === packageId ? ({ ...p, popular: !p.popular, updated_at: new Date().toISOString() } as any) : p);
        queryClient.setQueryData(["catering-packages", tenantId], next);
      }
      return { prev };
    },
    onError: (_error, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["catering-packages", tenantId], context.prev);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["catering-packages", tenantId],
      });
      toast({
        title: (data as any)?.popular
          ? "Marked as Popular"
          : "Removed from Popular",
        description: `"${(data as any)?.name || "Package"}" has been ${(data as any)?.popular ? "marked as popular" : "removed from popular packages"}.`,
      });
    },
    onError: (error) => {
      console.error("Toggle popular error:", error);
      toast({
        title: "Update Failed",
        description:
          error instanceof Error ? error.message : "Failed to update package",
        variant: "destructive",
      });
    },
  });

  // Reorder packages atomically via RPC
  const reorderPackagesMutation = useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      // Optimistic update
      const prev = queryClient.getQueryData<CateringPackage[]>(["catering-packages", tenantId]);
      if (prev) {
        const idToOrder: Record<string, number> = {};
        items.forEach(i => { idToOrder[i.id] = i.display_order; });
        const next = [...prev].map(p => ({ ...p, display_order: idToOrder[p.id] ?? p.display_order } as any));
        queryClient.setQueryData(["catering-packages", tenantId], next);
      }

      const { error } = await supabase.rpc('catering_reorder_packages', { payload: { items } as any });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catering-packages", tenantId] });
      toast({ title: 'Order Updated', description: 'Package order saved.' });
    },
    onError: (error, _vars, _ctx) => {
      queryClient.invalidateQueries({ queryKey: ["catering-packages", tenantId] });
      toast({ title: 'Reorder Failed', description: error instanceof Error ? error.message : 'Failed to reorder packages', variant: 'destructive' });
    }
  });

  // Get popular packages
  const getPopularPackages = () => {
    return packages.filter((pkg) => pkg.popular);
  };

  // Get packages by price range
  const getPackagesByPriceRange = (minPrice: number, maxPrice: number) => {
    return packages.filter(
      (pkg) =>
        pkg.price_per_person >= minPrice && pkg.price_per_person <= maxPrice,
    );
  };

  // Get packages by guest count
  const getPackagesByGuestCount = (guestCount: number) => {
    return packages.filter(
      (pkg) =>
        guestCount >= pkg.min_guests &&
        (!pkg.max_guests || guestCount <= pkg.max_guests),
    );
  };

  // Calculate package performance metrics
  const getPackageMetrics = (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
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
    reorderPackages: reorderPackagesMutation.mutate,
    isReordering: reorderPackagesMutation.isPending,
  };
};
