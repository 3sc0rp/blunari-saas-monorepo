import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CateringPackage,
  CreateCateringOrderRequest,
  CateringOrder,
} from "@/types/catering";

// Type-safe database query wrapper
type SupabaseTable = "tenants" | "profiles" | "bookings"; // Known existing tables

interface DatabaseError extends Error {
  code?: string;
  details?: string;
}

interface UseCateringDataReturn {
  packages: CateringPackage[] | null;
  loading: boolean;
  error: string | null;
  createOrder: (orderData: CreateCateringOrderRequest) => Promise<any>;
  refetch: () => Promise<void>;
  // Additional utility functions
  getOrdersByStatus: (status: string) => Promise<CateringOrder[]>;
  updateOrderStatus: (
    orderId: string,
    status: string,
    notes?: string,
  ) => Promise<void>;
  // Diagnostic info
  tablesExist: boolean;
  diagnosticInfo: {
    cateringTablesAvailable: boolean;
    lastErrorCode?: string;
    lastErrorMessage?: string;
  };
}

export function useCateringData(tenantId?: string): UseCateringDataReturn {
  const [packages, setPackages] = useState<CateringPackage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tablesExist, setTablesExist] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    cateringTablesAvailable: boolean;
    lastErrorCode?: string;
    lastErrorMessage?: string;
  }>({
    cateringTablesAvailable: false,
  });

  // Diagnostic function to check if catering tables exist
  const checkTableExistence = useCallback(async (): Promise<boolean> => {
    try {
      // Use a simple existence check by trying to count rows with limit 0
      const { error } = await (supabase as any)
        .from("catering_packages")
        .select("id", { count: "exact", head: true })
        .limit(0);

      if (error) {
        if (
          error.code === "PGRST106" ||
          error.message?.includes("relation") ||
          error.message?.includes("does not exist")
        ) {
          setDiagnosticInfo((prev) => ({
            ...prev,
            cateringTablesAvailable: false,
            lastErrorCode: error.code,
            lastErrorMessage: error.message,
          }));
          return false;
        }
        // Other errors might be permission issues, so assume tables exist
        return true;
      }

      setDiagnosticInfo((prev) => ({
        ...prev,
        cateringTablesAvailable: true,
      }));
      return true;
    } catch (err: any) {
      setDiagnosticInfo((prev) => ({
        ...prev,
        cateringTablesAvailable: false,
        lastErrorCode: err.code,
        lastErrorMessage: err.message,
      }));
      return false;
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First check if tables exist
      const exist = await checkTableExistence();
      setTablesExist(exist);

      if (!exist) {
        // No mock data - only real database data
        setError('No catering packages found');
        setPackages([]);
        return;
      }

      // Real database query (only if tables exist)
      const { data: packagesData, error: packagesError } = await (
        supabase as any
      )
        .from("catering_packages")
        .select(
          `
          *,
          catering_package_items (
            id,
            quantity_per_person,
            is_included,
            additional_cost_per_person,
            catering_menu_items (
              id,
              name,
              description,
              base_price,
              unit,
              dietary_restrictions,
              allergen_info,
              image_url
            )
          )
        `,
        )
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("popular", { ascending: false })
        .order("created_at", { ascending: false });

      if (packagesError) {
        throw packagesError;
      }

      setPackages((packagesData as CateringPackage[]) || []);
    } catch (err: any) {
      console.error("Error fetching catering packages:", err);

      const isTableError =
        err.code === "PGRST106" ||
        err.message?.includes("relation") ||
        err.message?.includes("does not exist");

      if (isTableError) {
        setError(
          "Catering functionality is not yet available. Please contact support to enable catering features.",
        );
        setTablesExist(false);
      } else {
        setError("Failed to load catering packages");
      }

      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, checkTableExistence]);

  const createOrder = useCallback(
    async (orderData: CreateCateringOrderRequest) => {
      if (!tenantId) {
        throw new Error("Tenant ID is required");
      }

      // Check if tables exist first
      if (!tablesExist) {
        // Simulate order creation for demo mode
        const mockOrder = {
          id: `mock-order-${Date.now()}`,
          ...orderData,
          tenant_id: tenantId,
          status: "inquiry" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log("Demo mode: Order would be created:", mockOrder);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return mockOrder;
      }

      try {
        const { data, error } = await (supabase as any)
          .from("catering_orders")
          .insert([
            {
              ...orderData,
              tenant_id: tenantId,
              status: "inquiry",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select(
            `
          *,
          catering_packages (
            id,
            name,
            price_per_person
          )
        `,
          )
          .single();

        if (error) {
          throw error;
        }

        // Create order history entry
        try {
          await (supabase as any).from("catering_order_history").insert({
            order_id: data.id,
            status: "inquiry",
            notes: "Order created by customer",
          });
        } catch (historyError) {
          console.warn("Failed to create order history entry:", historyError);
          // Don't fail the whole operation for history entry failure
        }

        return data;
      } catch (err: any) {
        console.error("Error creating catering order:", err);

        // Check if it's a table not found error
        if (
          err.code === "PGRST106" ||
          err.message?.includes("relation") ||
          err.message?.includes("does not exist")
        ) {
          throw new Error(
            "Catering functionality is not yet available. Please contact support to enable catering features.",
          );
        } else {
          throw new Error("Failed to submit catering order");
        }
      }
    },
    [tenantId, tablesExist],
  );

  const getOrdersByStatus = useCallback(
    async (status: string): Promise<CateringOrder[]> => {
      if (!tenantId) {
        throw new Error("Tenant ID is required");
      }

      if (!tablesExist) {
        // Return empty array for demo mode
        return [];
      }

      try {
        const { data, error } = await (supabase as any)
          .from("catering_orders")
          .select(
            `
          *,
          catering_packages (
            id,
            name,
            price_per_person
          ),
          catering_feedback (
            id,
            overall_rating,
            comments
          )
        `,
          )
          .eq("tenant_id", tenantId)
          .eq("status", status)
          .order("event_date", { ascending: true });

        if (error) {
          throw error;
        }

        return data as CateringOrder[];
      } catch (err: any) {
        console.error("Error fetching orders by status:", err);
        if (
          err.code === "PGRST106" ||
          err.message?.includes("relation") ||
          err.message?.includes("does not exist")
        ) {
          throw new Error("Catering functionality is not yet available");
        }
        throw new Error("Failed to fetch orders");
      }
    },
    [tenantId, tablesExist],
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: string, notes?: string): Promise<void> => {
      if (!tenantId) {
        throw new Error("Tenant ID is required");
      }

      if (!tablesExist) {
        // Simulate status update for demo mode
        console.log(
          `Demo mode: Order ${orderId} status would be updated to ${status}`,
          { notes },
        );
        return;
      }

      try {
        // Update the order status
        const { error: updateError } = await (supabase as any)
          .from("catering_orders")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("tenant_id", tenantId);

        if (updateError) {
          throw updateError;
        }

        // Create history entry
        try {
          const { error: historyError } = await (supabase as any)
            .from("catering_order_history")
            .insert({
              order_id: orderId,
              status,
              notes: notes || `Status updated to ${status}`,
            });

          if (historyError) {
            console.error("Failed to create history entry:", historyError);
          }
        } catch (historyErr) {
          console.warn(
            "History entry creation failed, but order update succeeded:",
            historyErr,
          );
        }
      } catch (err: any) {
        console.error("Error updating order status:", err);
        if (
          err.code === "PGRST106" ||
          err.message?.includes("relation") ||
          err.message?.includes("does not exist")
        ) {
          throw new Error("Catering functionality is not yet available");
        }
        throw new Error("Failed to update order status");
      }
    },
    [tenantId, tablesExist],
  );

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return {
    packages,
    loading,
    error,
    createOrder,
    refetch: fetchPackages,
    getOrdersByStatus,
    updateOrderStatus,
    tablesExist,
    diagnosticInfo,
  };
}

// Additional utility hook for catering analytics
export function useCateringAnalytics(tenantId?: string) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Check if analytics tables/views exist
      const { error: checkError } = await (supabase as any)
        .from("catering_order_metrics")
        .select("tenant_id", { count: "exact", head: true })
        .limit(0);

      if (checkError) {
        if (
          checkError.code === "PGRST106" ||
          checkError.message?.includes("relation") ||
          checkError.message?.includes("does not exist")
        ) {
          setTablesExist(false);
          // Provide mock analytics for demo
          setAnalytics([
            {
              tenant_id: tenantId,
              month: new Date().toISOString().substring(0, 7),
              total_orders: 5,
              total_revenue: 12500,
              avg_order_value: 2500,
              popular_service_type: "drop_off",
            },
          ]);
          setLoading(false);
          return;
        }
      }

      setTablesExist(true);

      // Fetch catering analytics from the view
      const { data, error } = await (supabase as any)
        .from("catering_order_metrics")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("month", { ascending: false })
        .limit(12);

      if (error && error.code !== "PGRST106") {
        throw error;
      }

      setAnalytics(data || []);
    } catch (err) {
      console.error("Error fetching catering analytics:", err);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    tablesExist,
    refetch: fetchAnalytics,
  };
}
