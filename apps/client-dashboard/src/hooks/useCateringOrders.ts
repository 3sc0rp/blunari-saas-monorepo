import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CateringOrder,
  CateringPackage,
  CreateCateringOrderRequest,
  UpdateCateringOrderRequest,
  CateringOrderStatus,
  CateringServiceType,
  CateringOrderFilters,
} from "../types/catering";

export const useCateringOrders = (tenantId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<CateringOrderFilters>({
    status: [],
    service_type: [],
    date_range: { start: "", end: "" },
    search: "",
  });

  // Fetch catering orders
      const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["catering-orders", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      try {
        let query = supabase
          .from("catering_orders" as any)
          .select(
            `
            *,
            catering_packages (
              id,
              name,
              price_per_person,
              includes_setup,
              includes_service,
              includes_cleanup
            )
          `,
          )
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false });

        // Apply status filter
      if (filters.status.length > 0) {
          query = query.in("status", filters.status);
        }

        // Apply service type filter
      if (filters.service_type.length > 0) {
          query = query.in("service_type", filters.service_type);
        }

        // Apply date range filter
      if (filters.date_range.start) {
          query = query.gte("event_date", filters.date_range.start);
        }
        if (filters.date_range.end) {
          query = query.lte("event_date", filters.date_range.end);
        }

        // Apply search filter
      if (filters.search) {
          query = query.or(
            `event_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`,
          );
        }

        const { data: ordersData, error } = await query;

        if (error) {
          // If table doesn't exist yet,
      return empty array
      if (
            error.code === "42P01" ||
            error.message?.includes("relation") ||
            error.message?.includes("does not exist")
          ) {            return [];
          }
          throw error;
        }

        return (ordersData || []) as unknown as CateringOrder[];
      } catch (err) {
        console.warn("Error fetching catering orders:", err);
        return [];
      }
    },
    enabled: !!tenantId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Create catering order
      const createOrderMutation = useMutation({
    mutationFn: async (orderData: CreateCateringOrderRequest) => {
      const { data, error } = await supabase
        .from("catering_orders" as any)
        .insert({
          ...orderData,
          tenant_id: tenantId!,
          status: "inquiry",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["catering-orders", tenantId],
      });
      toast({
        title: "Quote Request Submitted",
        description: `Your catering inquiry for "${(data as any)?.event_name || "your event"}" has been submitted. We'll contact you within 24 hours.`,
      });
    },
    onError: (error) => {
      console.error("Create order error:", error);
      toast({
        title: "Submission Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit your catering request",
        variant: "destructive",
      });
    },
  });

  // Update catering order
      const updateOrderMutation = useMutation({
    mutationFn: async ({
      orderId,
      updates,
    }: {
      orderId: string;
      updates: UpdateCateringOrderRequest;
    }) => {
      const { data, error } = await supabase
        .from("catering_orders" as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("tenant_id", tenantId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["catering-orders", tenantId],
      });
      toast({
        title: "Order Updated",
        description: `Catering order for "${(data as any)?.event_name || "your event"}" has been updated.`,
      });
    },
    onError: (error) => {
      console.error("Update order error:", error);
      toast({
        title: "Update Failed",
        description:
          error instanceof Error ? error.message : "Failed to update order",
        variant: "destructive",
      });
    },
  });

  // Cancel catering order
      const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from("catering_orders" as any)
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("tenant_id", tenantId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["catering-orders", tenantId],
      });
      toast({
        title: "Order Cancelled",
        description: `Catering order for "${(data as any)?.event_name || "your event"}" has been cancelled.`,
      });
    },
    onError: (error) => {
      console.error("Cancel order error:", error);
      toast({
        title: "Cancellation Failed",
        description:
          error instanceof Error ? error.message : "Failed to cancel order",
        variant: "destructive",
      });
    },
  });

  // Real-time subscription for order updates
  useEffect(() => {
    if (!tenantId) return;

    const subscription = supabase
      .channel("catering-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "catering_orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {          queryClient.invalidateQueries({
            queryKey: ["catering-orders", tenantId],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [tenantId, queryClient]);

  // Helper function to get orders by status
      const getOrdersByStatus = (status: CateringOrderStatus) => {
    return orders.filter((order) => order.status === status);
  };

  // Helper function to get orders by service type
      const getOrdersByServiceType = (serviceType: CateringServiceType) => {
    return orders.filter((order) => order.service_type === serviceType);
  };

  // Helper function to get upcoming orders (next 30 days)
      const getUpcomingOrders = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return orders.filter((order) => {
      const eventDate = new Date(order.event_date);
      return eventDate >= new Date() && eventDate <= thirtyDaysFromNow;
    });
  };

  return {
    // Data
    orders,
    isLoading,
    error,

    // Filters
    filters,
    setFilters,

    // Mutations
    createOrder: createOrderMutation.mutate,
    isCreating: createOrderMutation.isPending,
    updateOrder: updateOrderMutation.mutate,
    isUpdating: updateOrderMutation.isPending,
    cancelOrder: cancelOrderMutation.mutate,
    isCancelling: cancelOrderMutation.isPending,

    // Utilities
    refetch,
    getOrdersByStatus,
    getOrdersByServiceType,
    getUpcomingOrders,
  };
};


