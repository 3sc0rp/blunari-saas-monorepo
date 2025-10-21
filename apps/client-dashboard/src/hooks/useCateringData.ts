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
  message: string;
}

interface VenueAddress {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

interface OrderMetricsRow {
  tenant_id: string;
  month: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  popular_service_type: string;
}

interface UseCateringDataReturn {
  packages: CateringPackage[] | null;
  loading: boolean;
  error: string | null;
  createOrder: (orderData: CreateCateringOrderRequest) => Promise<CateringOrder | { id: string; status: string; tenant_id: string; created_at: string; updated_at: string }>;
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
      const { error } = await supabase
        .from("catering_packages")
        .select("id", { count: "exact", head: true })
        .limit(0);

      if (error) {
        const dbError = error as DatabaseError;
        if (
          dbError.code === "PGRST106" ||
          dbError.message?.includes("relation") ||
          dbError.message?.includes("does not exist")
        ) {
          setDiagnosticInfo((prev) => ({
            ...prev,
            cateringTablesAvailable: false,
            lastErrorCode: dbError.code,
            lastErrorMessage: dbError.message,
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
    } catch (err) {
      const dbError = err as DatabaseError;
      setDiagnosticInfo((prev) => ({
        ...prev,
        cateringTablesAvailable: false,
        lastErrorCode: dbError.code,
        lastErrorMessage: dbError.message,
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
      const { data: packagesData, error: packagesError } = await supabase
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
              dietary_restrictions,
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
    } catch (err) {
      const dbError = err as DatabaseError;
      console.error("Error fetching catering packages:", dbError);

      const isTableError =
        dbError.code === "PGRST106" ||
        dbError.message?.includes("relation") ||
        dbError.message?.includes("does not exist");

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
        // Format venue_address as JSONB (required field in DB)
        let formattedVenueAddress: VenueAddress;
        if (typeof orderData.venue_address === 'string' && orderData.venue_address.trim()) {
          formattedVenueAddress = {
            street: orderData.venue_address.trim(),
            city: "",
            state: "",
            zip_code: "",
            country: "USA"
          };
        } else if (typeof orderData.venue_address === 'object' && orderData.venue_address !== null) {
          formattedVenueAddress = orderData.venue_address as VenueAddress;
        } else {
          // Default value if not provided
          formattedVenueAddress = {
            street: "Not specified",
            city: "",
            state: "",
            zip_code: "",
            country: "USA"
          };
        }

        // Ensure contact_phone is not empty (database requires it)
        const contactPhone = orderData.contact_phone?.trim() || "Not provided";

        // Format dietary_requirements as TEXT (comma-separated string)
        const dietaryRequirements = Array.isArray(orderData.dietary_requirements) 
          ? orderData.dietary_requirements.join(', ')
          : orderData.dietary_requirements || '';

        // Build database-compatible payload (remove fields that don't exist in schema)
        const dbPayload = {
          package_id: orderData.package_id,
          event_type_id: orderData.event_type_id,
          event_name: orderData.event_name,
          event_date: orderData.event_date,
          event_start_time: orderData.event_start_time,
          event_end_time: orderData.event_end_time,
          guest_count: orderData.guest_count,
          service_type: orderData.service_type,
          contact_name: orderData.contact_name,
          contact_email: orderData.contact_email,
          contact_phone: contactPhone,
          venue_name: orderData.venue_name || null,
          venue_address: formattedVenueAddress,
          special_instructions: orderData.special_instructions || null,
          dietary_requirements: dietaryRequirements,
          tenant_id: tenantId,
          status: "inquiry",
          subtotal: 0, // Will be calculated by backend
          total_amount: 0, // Will be calculated by backend
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("catering_orders")
          .insert([dbPayload])
          .select(
            `
          *,
          catering_packages (
            id,
            name,
            price_per_person,
            pricing_type,
            base_price,
            serves_count,
            tray_description
          )
        `,
          )
          .single();

        if (error) {
          throw error;
        }

        // Create order history entry
        try {
          await supabase.from("catering_order_history").insert({
            order_id: data.id,
            status: "inquiry",
            notes: "Order created by customer",
          });
        } catch (historyError) {
          console.warn("Failed to create order history entry:", historyError);
          // Don't fail the whole operation for history entry failure
        }

        return data as CateringOrder;
      } catch (err) {
        const dbError = err as DatabaseError;
        console.error("Error creating catering order:", dbError);

        // Check if it's a table not found error
        if (
          dbError.code === "PGRST106" ||
          dbError.message?.includes("relation") ||
          dbError.message?.includes("does not exist")
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
        const { data, error } = await supabase
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
      } catch (err) {
        const dbError = err as DatabaseError;
        console.error("Error fetching orders by status:", dbError);
        if (
          dbError.code === "PGRST106" ||
          dbError.message?.includes("relation") ||
          dbError.message?.includes("does not exist")
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
        const { error: updateError } = await supabase
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
          const { error: historyError } = await supabase
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
      } catch (err) {
        const dbError = err as DatabaseError;
        console.error("Error updating order status:", dbError);
        if (
          dbError.code === "PGRST106" ||
          dbError.message?.includes("relation") ||
          dbError.message?.includes("does not exist")
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
  const [analytics, setAnalytics] = useState<OrderMetricsRow[] | null>(null);
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
      const { error: checkError } = await supabase
        .from("catering_order_metrics")
        .select("tenant_id", { count: "exact", head: true })
        .limit(0);

      if (checkError) {
        const dbError = checkError as DatabaseError;
        if (
          dbError.code === "PGRST106" ||
          dbError.message?.includes("relation") ||
          dbError.message?.includes("does not exist")
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
      const { data, error } = await supabase
        .from("catering_order_metrics")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("month", { ascending: false })
        .limit(12);

      if (error && error.code !== "PGRST106") {
        throw error;
      }

      setAnalytics((data as OrderMetricsRow[]) || []);
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
