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
      if (!tenantId) return [];

      // Get tables
      const { data: tablesData, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("name");

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
        const currentBooking = bookingsData.find(
          (booking) => booking.table_id === table.id,
        );

        let status: Table["status"] = "available";
        if (currentBooking) {
          status = currentBooking.status === "seated" ? "occupied" : "reserved";
        }

        const tableData: Table = {
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          status,
          position:
            table.position_x && table.position_y
              ? { x: table.position_x, y: table.position_y }
              : { x: 100, y: 100 },
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

  // Update table status
  const updateTableMutation = useMutation({
    mutationFn: async ({
      tableId,
      updates,
    }: {
      tableId: string;
      updates: Partial<Table>;
    }) => {
      const { error } = await supabase
        .from("restaurant_tables")
        .update(updates)
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
