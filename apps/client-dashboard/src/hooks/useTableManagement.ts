import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "maintenance";
  position: { x: number; y: number };
  table_type: "standard" | "bar" | "booth" | "outdoor" | "private";
  current_booking?: {
    guest_name: string;
    party_size: number;
    time_remaining: number;
    booking_id: string;
  };
}

export const useTableManagement = (tenantId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch tables with current bookings
  const {
    data: tables = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tables", tenantId],
    queryFn: async () => {
      const devLogs = import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true';
      if (devLogs) console.log('[useTableManagement] Fetching tables for tenant:', tenantId);
      
      if (!tenantId) {
        if (devLogs) console.log('[useTableManagement] No tenantId - returning empty');
        return [];
      }

      // Get tables
      const { data: tablesData, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("name");

      if (devLogs) console.log('[useTableManagement] Tables query result:', { count: tablesData?.length, error: tablesError });

      if (tablesError) throw tablesError;

      // Get current bookings for tables
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("status", ["confirmed", "seated"])
        .not("table_id", "is", null);

      if (bookingsError) throw bookingsError;

      // Combine tables with booking data
      const tablesWithBookings: Table[] = tablesData.map((table) => {
        const currentBooking = bookingsData.find((booking) => booking.table_id === table.id);

        // Prefer booking-derived status when a booking exists; otherwise use DB status
        let status: Table["status"] = (table.status as Table["status"]) || "available";
        if (currentBooking) {
          status = currentBooking.status === "seated" ? "occupied" : "reserved";
        }

        const hasPosition = typeof table.position_x === "number" && typeof table.position_y === "number";

        const tableData: Table = {
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          status,
          position: hasPosition ? { x: table.position_x, y: table.position_y } : { x: 100, y: 100 },
          table_type: (table.table_type as Table["table_type"]) || "standard",
          current_booking: currentBooking
            ? {
                guest_name: currentBooking.guest_name,
                party_size: currentBooking.party_size,
                time_remaining: calculateTimeRemaining(
                  currentBooking.booking_time,
                  currentBooking.duration_minutes,
                ),
                booking_id: currentBooking.id,
              }
            : undefined,
        };

        return tableData;
      });

      return tablesWithBookings;
    },
    enabled: !!tenantId,
  });

  // Update table status / fields
  const updateTableMutation = useMutation({
    mutationFn: async ({
      tableId,
      updates,
    }: {
      tableId: string;
      updates: Partial<Table>;
    }) => {
      const payload: any = { ...updates };
      // Map UI position back to position_x/position_y if present
      if (updates.position) {
        payload.position_x = updates.position.x;
        payload.position_y = updates.position.y;
        delete payload.position;
      }
      const { error } = await supabase
        .from("restaurant_tables")
        .update(payload)
        .eq("id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", tenantId] });
      toast({
        title: "Table Updated",
        description: "Table has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description:
          error instanceof Error ? error.message : "Failed to update table",
        variant: "destructive",
      });
    },
  });

  return {
    tables,
    isLoading,
    error,
    updateTable: updateTableMutation.mutate,
    isUpdating: updateTableMutation.isPending,
    changeStatus: async (tableId: string, status: Table["status"]) => {
      const { error: err } = await supabase
        .from("restaurant_tables")
        .update({ status })
        .eq("id", tableId);
      if (err) throw err;
      await queryClient.invalidateQueries({ queryKey: ["tables", tenantId] });
      toast({ title: "Status Updated", description: `Table set to ${status}.` });
    },
    deactivateTable: async (tableId: string) => {
      const { error: err } = await supabase
        .from("restaurant_tables")
        .update({ active: false })
        .eq("id", tableId);
      if (err) throw err;
      await queryClient.invalidateQueries({ queryKey: ["tables", tenantId] });
      toast({ title: "Table Deactivated", description: "Table is no longer active." });
    },
    addTable: async (newTable: Omit<Table, "id" | "status" | "current_booking"> & { status?: Table["status"] }) => {
      if (!tenantId) throw new Error("Missing tenant");
      const payload: any = {
        tenant_id: tenantId,
        name: newTable.name,
        capacity: newTable.capacity,
        table_type: newTable.table_type,
        active: true,
        position_x: newTable.position?.x ?? 100,
        position_y: newTable.position?.y ?? 100,
      };
      const { error } = await supabase.from("restaurant_tables").insert(payload);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["tables", tenantId] });
    },
  };
};

function calculateTimeRemaining(
  bookingTime: string,
  durationMinutes: number,
): number {
  const bookingStart = new Date(bookingTime);
  const bookingEnd = new Date(bookingStart.getTime() + durationMinutes * 60000);
  const now = new Date();

  const remainingMs = bookingEnd.getTime() - now.getTime();
  return Math.max(0, Math.floor(remainingMs / 60000)); // Convert to minutes
}
