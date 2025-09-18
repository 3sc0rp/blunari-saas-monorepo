import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BookingFilters,
  ExtendedBooking,
  BulkOperation,
} from "@/types/booking";
import { useToast } from "@/hooks/use-toast";

export const useAdvancedBookings = (tenantId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<BookingFilters>({
    status: [],
    dateRange: { start: "", end: "" },
    sources: [],
    search: "",
  });
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);

  // Fetch bookings with advanced filtering
  const {
    data: bookings = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["advanced-bookings", tenantId, filters],
    queryFn: async () => {
      const devLogs = import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_LOGS === 'true';
      if (devLogs) {
        console.log('[useAdvancedBookings] === QUERY START ===');
        console.log('[useAdvancedBookings] Input tenantId:', tenantId);
        console.log('[useAdvancedBookings] Input filters:', filters);
      }
      
      if (!tenantId) {
        if (devLogs) console.log('[useAdvancedBookings] No tenantId - returning empty array');
        return [];
      }

      if (devLogs) console.log('[useAdvancedBookings] Building query...');
      let query = supabase
        .from("bookings")
        .select("*")
        .eq("tenant_id", tenantId);

      if (devLogs) console.log('[useAdvancedBookings] Base query built, applying filters...');

      // Apply status filter (support legacy no_show)
      if (filters.status.length > 0) {
        const normalized = filters.status.map((s) => (s === 'no_show' ? 'noshow' : s));
        query = query.in("status", normalized as any);
      }

      // Apply date range filter
      if (filters.dateRange.start) {
        if (devLogs) console.log('[useAdvancedBookings] Applying date filter start:', filters.dateRange.start);
        query = query.gte("booking_time", filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        if (devLogs) console.log('[useAdvancedBookings] Applying date filter end:', filters.dateRange.end);
        query = query.lte("booking_time", filters.dateRange.end);
      }

      // Apply party size filter
      if (filters.partySize?.min) {
        query = query.gte("party_size", filters.partySize.min);
      }
      if (filters.partySize?.max) {
        query = query.lte("party_size", filters.partySize.max);
      }

      const [bookingsRes, tablesRes] = await Promise.all([
        query.order("booking_time", { ascending: true }),
        supabase.from("restaurant_tables").select("id,name").eq("tenant_id", tenantId)
      ]);
      const data = bookingsRes.data;
      const error = bookingsRes.error;

      if (devLogs) console.log('[useAdvancedBookings] Query result:', { data: data?.length, error });
      
      if (error) {
        console.error('[useAdvancedBookings] Query error:', error);
        throw error;
      }
      
      const tableIdToName: Record<string, string> = Object.fromEntries(
        (tablesRes.data || []).map((t: any) => [t.id, t.name])
      );

      const result = (data || []).map((b: any) => {
        const joinedName = (b as any)["restaurant_tables"]?.name;
        const mappedName = b.table_id ? tableIdToName[b.table_id] : undefined;
        const normalizedStatus = (b.status === 'no_show') ? 'noshow' : b.status;
        return {
          ...(b as any),
          status: normalizedStatus,
          table_name: joinedName || mappedName,
        } as ExtendedBooking;
      });
      
      if (devLogs) console.log('[useAdvancedBookings] Processed result:', result.length, 'bookings');
      return result;
    },
    enabled: !!tenantId,
  });

  // Realtime subscription to bookings changes for this tenant
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`bookings_rt_${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['advanced-bookings', tenantId] });
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [tenantId, queryClient]);

  // Filter bookings by search term
  const filteredBookings = useMemo(() => {
    if (!filters.search) return bookings;

    const searchTerm = filters.search.toLowerCase();
    return bookings.filter(
      (booking) =>
        booking.guest_name.toLowerCase().includes(searchTerm) ||
        booking.guest_email.toLowerCase().includes(searchTerm) ||
        booking.guest_phone?.includes(searchTerm) ||
        booking.special_requests?.toLowerCase().includes(searchTerm),
    );
  }, [bookings, filters.search]);

  // Bulk operations mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async (operation: BulkOperation) => {
      switch (operation.type) {
        case "status_update": {
          const { error: updateError } = await supabase
            .from("bookings")
            .update({ status: operation.data.status })
            .in("id", operation.bookingIds);
          if (updateError) throw updateError;
          break;
        }

        case "send_notification": {
          // Call notification edge function
          const { error: notificationError } = await supabase.functions.invoke(
            "send-bulk-notifications",
            {
              body: { bookingIds: operation.bookingIds, ...operation.data },
            },
          );
          if (notificationError) throw notificationError;
          break;
        }

        case "export": {
          // Generate CSV export
          const bookingsToExport = bookings.filter((b) =>
            operation.bookingIds.includes(b.id),
          );
          const csv = generateCSV(bookingsToExport);
          downloadCSV(csv, "bookings-export.csv");
          break;
        }

        case "delete": {
          const { error: deleteError } = await supabase
            .from("bookings")
            .delete()
            .in("id", operation.bookingIds);
          if (deleteError) throw deleteError;
          break;
        }
      }
    },
    onSuccess: (_, operation) => {
      queryClient.invalidateQueries({
        queryKey: ["advanced-bookings", tenantId],
      });
      toast({
        title: "Bulk Operation Complete",
        description: `Successfully processed ${operation.bookingIds.length} bookings.`,
      });
      setSelectedBookings([]);
    },
    onError: (error) => {
      toast({
        title: "Operation Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Update booking status
  const updateBookingMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ExtendedBooking>;
    }) => {
      // Sanitize UI fields to match DB schema
      const payload: Record<string, any> = { ...updates };
      if (payload.status) {
        payload.status = payload.status === 'noshow' ? 'no_show' : payload.status;
      }
      delete payload.table_name; // never update derived field

      const { error } = await supabase
        .from("bookings")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["advanced-bookings", tenantId] });
      const prev = queryClient.getQueryData<ExtendedBooking[]>(["advanced-bookings", tenantId]);
      if (prev) {
        queryClient.setQueryData(
          ["advanced-bookings", tenantId],
          prev.map((b) => (b.id === id ? { ...b, ...updates } as ExtendedBooking : b)),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["advanced-bookings", tenantId], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["advanced-bookings", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["today-data", tenantId] });
    },
    onSuccess: () => {
      toast({ title: "Booking Updated" });
    },
  });

  const generateCSV = (data: ExtendedBooking[]) => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Party Size",
      "Date/Time",
      "Status",
      "Table",
      "Special Requests",
    ];
    const rows = data.map((booking) => [
      booking.guest_name,
      booking.guest_email,
      booking.guest_phone || "",
      booking.party_size.toString(),
      new Date(booking.booking_time).toLocaleString(),
      booking.status,
      booking.table_id || "",
      booking.special_requests || "",
    ]);

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return {
    bookings: filteredBookings,
    isLoading,
    error,
    filters,
    setFilters,
    selectedBookings,
    setSelectedBookings,
    bulkOperation: bulkOperationMutation.mutate,
    isBulkOperationPending: bulkOperationMutation.isPending,
    updateBooking: updateBookingMutation.mutate,
    isUpdating: updateBookingMutation.isPending,
  };
};
