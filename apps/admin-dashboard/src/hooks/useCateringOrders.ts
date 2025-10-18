import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CateringOrder,
  CateringStatus,
  CateringOrderFilters,
  UpdateCateringOrderRequest,
  CateringOrderHistory,
  CateringQuote,
  CateringFeedback,
} from "@/types/catering";

export interface UseCateringOrdersReturn {
  orders: CateringOrder[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateOrderStatus: (
    orderId: string,
    status: CateringStatus,
    notes?: string,
  ) => Promise<void>;
  updateOrder: (
    orderId: string,
    updates: UpdateCateringOrderRequest,
  ) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  getOrderHistory: (orderId: string) => Promise<CateringOrderHistory[]>;
  createQuote: (
    orderId: string,
    quoteData: Partial<CateringQuote>,
  ) => Promise<void>;
  addFeedback: (
    orderId: string,
    feedback: Partial<CateringFeedback>,
  ) => Promise<void>;
}

export function useCateringOrders(
  filters?: CateringOrderFilters,
): UseCateringOrdersReturn {
  const [orders, setOrders] = useState<CateringOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = () => {
    let query = (supabase as any)
      .from("catering_orders_with_details")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply comprehensive filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in("status", filters.status);
    }

    if (filters?.service_type && filters.service_type.length > 0) {
      query = query.in("service_type", filters.service_type);
    }

    if (filters?.date_from) {
      query = query.gte("event_date", filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte("event_date", filters.date_to);
    }

    if (filters?.guest_count_min) {
      query = query.gte("guest_count", filters.guest_count_min);
    }

    if (filters?.guest_count_max) {
      query = query.lte("guest_count", filters.guest_count_max);
    }

    if (filters?.total_amount_min) {
      query = query.gte("total_amount", filters.total_amount_min);
    }

    if (filters?.total_amount_max) {
      query = query.lte("total_amount", filters.total_amount_max);
    }

    if (filters?.search) {
      query = query.or(
        `event_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,venue_name.ilike.%${filters.search}%`,
      );
    }

    return query;
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const query = buildQuery();
      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.warn(
          "Catering orders table not found - apply database migration first",
        );
        setError("Catering system not ready - apply database migration first");
        setOrders([]);
        return;
      }

      setOrders(data || []);
    } catch (err) {
      console.warn("Catering system not ready:", err);
      setError("Catering system not ready - apply database migration first");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    status: CateringStatus,
    notes?: string,
  ) => {
    try {
      const updates: any = { status };

      // Set timestamps based on status
      switch (status) {
        case "quoted":
          updates.quoted_at = new Date().toISOString();
          break;
        case "confirmed":
          updates.confirmed_at = new Date().toISOString();
          break;
        case "completed":
          updates.completed_at = new Date().toISOString();
          break;
      }

      const { error: updateError } = await (supabase as any)
        .from("catering_orders")
        .update(updates)
        .eq("id", orderId);

      if (updateError) {
        throw updateError;
      }

      // Add history entry if notes provided
      if (notes) {
        await (supabase as any).from("catering_order_history").insert({
          order_id: orderId,
          status,
          notes,
          changed_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      // Refresh orders list
      await fetchOrders();
    } catch (err) {
      console.warn(
        "Error updating order status - database migration may be needed:",
        err,
      );
      throw new Error(
        "Catering system not ready - apply database migration first",
      );
    }
  };

  const updateOrder = async (
    orderId: string,
    updates: UpdateCateringOrderRequest,
  ) => {
    try {
      const { error: updateError } = await (supabase as any)
        .from("catering_orders")
        .update(updates)
        .eq("id", orderId);

      if (updateError) {
        throw updateError;
      }

      // Refresh orders list
      await fetchOrders();
    } catch (err) {
      console.warn(
        "Error updating order - database migration may be needed:",
        err,
      );
      throw new Error(
        "Catering system not ready - apply database migration first",
      );
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const { error: deleteError } = await (supabase as any)
        .from("catering_orders")
        .delete()
        .eq("id", orderId);

      if (deleteError) {
        throw deleteError;
      }

      // Refresh orders list
      await fetchOrders();
    } catch (err) {
      console.warn(
        "Error deleting order - database migration may be needed:",
        err,
      );
      throw new Error(
        "Catering system not ready - apply database migration first",
      );
    }
  };

  const getOrderHistory = async (
    orderId: string,
  ): Promise<CateringOrderHistory[]> => {
    try {
      const { data, error } = await (supabase as any)
        .from("catering_order_history")
        .select(
          `
          *,
          changed_by_user:changed_by (
            id,
            full_name:user_metadata->>full_name,
            email
          )
        `,
        )
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn("Error fetching order history:", err);
      return [];
    }
  };

  const createQuote = async (
    orderId: string,
    quoteData: Partial<CateringQuote>,
  ) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const quoteNumber = `Q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const { error } = await (supabase as any).from("catering_quotes").insert({
        order_id: orderId,
        quote_number: quoteNumber,
        valid_until:
          quoteData.valid_until ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // 30 days
        terms_conditions: quoteData.terms_conditions,
        notes: quoteData.notes,
        created_by: user?.id,
        ...quoteData,
      });

      if (error) throw error;
      await fetchOrders();
    } catch (err) {
      console.warn("Error creating quote:", err);
      throw new Error(
        "Could not create quote - catering system may not be ready",
      );
    }
  };

  const addFeedback = async (
    orderId: string,
    feedback: Partial<CateringFeedback>,
  ) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;

      const { error } = await (supabase as any)
        .from("catering_feedback")
        .insert({
          order_id: orderId,
          customer_id: user?.id,
          ...feedback,
        });

      if (error) throw error;
      await fetchOrders();
    } catch (err) {
      console.warn("Error adding feedback:", err);
      throw new Error(
        "Could not add feedback - catering system may not be ready",
      );
    }
  };

  const refetch = fetchOrders;

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  // Set up real-time subscription for order updates
  useEffect(() => {
    const subscription = supabase
      .channel("catering_orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "catering_orders",
        },
        (payload) => {
          console.log("Catering order change received:", payload);
          fetchOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return {
    orders,
    loading,
    error,
    refetch,
    updateOrderStatus,
    updateOrder,
    deleteOrder,
    getOrderHistory,
    createQuote,
    addFeedback,
  };
}
