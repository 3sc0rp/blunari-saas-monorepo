import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createHold, confirmReservation } from "@/api/booking-proxy";
import { BookingFormData, TableOptimization } from "@/types/booking";
import { useToast } from "@/hooks/use-toast";

export const useSmartBookingCreation = (tenantId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [createdReservation, setCreatedReservation] = useState<any | null>(null);
  const [formData, setFormData] = useState<BookingFormData>({
    customerName: "",
    email: "",
    phone: "",
    partySize: 2,
    date: "",
    time: "",
    duration: 120,
    source: "phone",
    specialRequests: "",
    depositRequired: false,
  });

  // Fetch available tables for optimization
  const { data: availableTables = [] } = useQuery({
    queryKey: ["available-tables", tenantId, formData.date, formData.time],
    queryFn: async () => {
      if (!tenantId || !formData.date || !formData.time) return [];

      // Get all tables
      const { data: tables, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true);

      if (tablesError) throw tablesError;

      // Get conflicting bookings
      const bookingDateTime = new Date(`${formData.date}T${formData.time}`);
      const endTime = new Date(
        bookingDateTime.getTime() + (formData.duration || 120) * 60000,
      );

      const { data: conflicts, error: conflictsError } = await supabase
        .from("bookings")
        .select("table_id")
        .eq("tenant_id", tenantId)
        .gte("booking_time", bookingDateTime.toISOString())
        .lt("booking_time", endTime.toISOString())
        .in("status", ["confirmed", "seated"]);

      if (conflictsError) throw conflictsError;

      const conflictTableIds = new Set(
        conflicts.map((c) => c.table_id).filter(Boolean),
      );

      // Calculate optimization scores
      return tables
        .filter((table) => !conflictTableIds.has(table.id))
        .map(
          (table) =>
            ({
              tableId: table.id,
              tableName: table.name,
              capacity: table.capacity,
              utilization: (formData.partySize / table.capacity) * 100,
              recommendationScore: calculateRecommendationScore(
                table,
                formData.partySize,
              ),
              conflicts: 0,
            }) as TableOptimization,
        )
        .sort((a, b) => b.recommendationScore - a.recommendationScore);
    },
    enabled: !!tenantId && !!formData.date && !!formData.time,
  });

  // Calculate ETA prediction
  const calculateETA = (bookingTime: string, partySize: number) => {
    const baseTime = new Date(bookingTime);
    // Simple ETA calculation - in real app this would be more sophisticated
    const preparation = partySize * 2; // 2 minutes per person prep
    const buffer = Math.random() * 10; // Random buffer for realism
    return Math.round(preparation + buffer);
  };

  // Calculate recommendation score for table optimization
  const calculateRecommendationScore = (
    table: { capacity: number; [key: string]: unknown },
    partySize: number,
  ) => {
    const utilization = (partySize / table.capacity) * 100;

    // Perfect utilization is around 75-85%
    let score = 100;
    if (utilization < 50) score -= (50 - utilization) * 2; // Penalty for under-utilization
    if (utilization > 90) score -= (utilization - 90) * 3; // Penalty for over-crowding

    return Math.max(0, score);
  };

  // Create booking mutation (server-side via Edge Function for RLS-safe inserts)
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData & { tableId?: string }) => {
      if (!tenantId) throw new Error("Missing tenant");
      const bookingDateTime = new Date(`${data.date}T${data.time}`);

      // 1) Create a hold using the live widget function
      const hold = await createHold({
        tenant_id: tenantId,
        party_size: data.partySize,
        slot: { time: bookingDateTime.toISOString(), available_tables: 1 },
        table_id: data.tableId,
      });

      // 2) Confirm reservation with idempotency (assumes deposit handled in UI when required)
      const idempotencyKey = crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const [first_name, ...rest] = (data.customerName || "").trim().split(" ");
      const last_name = rest.join(" ") || "";

      const reservation = await confirmReservation(
        {
          tenant_id: tenantId,
          hold_id: hold.hold_id,
          guest_details: {
            first_name: first_name || data.customerName || "Guest",
            last_name: last_name || "",
            email: data.email,
            phone: data.phone,
            special_requests: data.specialRequests,
          },
          table_id: data.tableId,
          deposit: data.depositRequired
            ? { required: true, amount_cents: Math.round((data.depositAmount || 0) * 100), paid: (data as any).depositPaid === true }
            : undefined,
        },
        idempotencyKey,
      );

      return reservation;
    },
    onSuccess: (reservation) => {
      setCreatedReservation(reservation);
      setCurrentStep(5);
      // Force-refresh key booking views immediately; Realtime will follow-up
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: ["advanced-bookings", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["today-data", tenantId] });
      }
      toast({
        title: "Booking Created Successfully",
        description: `Reservation ${reservation.confirmation_number || reservation.reservation_id} created.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Booking",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCurrentStep(1);
    setCreatedReservation(null);
    setFormData({
      customerName: "",
      email: "",
      phone: "",
      partySize: 2,
      date: "",
      time: "",
      duration: 120,
      source: "phone",
      specialRequests: "",
      depositRequired: false,
    });
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const previousStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const updateFormData = (updates: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  return {
    currentStep,
    formData,
    availableTables,
    createBooking: createBookingMutation.mutate,
    isCreating: createBookingMutation.isPending,
    createdReservation,
    nextStep,
    previousStep,
    updateFormData,
    resetForm,
    calculateETA,
  };
};
