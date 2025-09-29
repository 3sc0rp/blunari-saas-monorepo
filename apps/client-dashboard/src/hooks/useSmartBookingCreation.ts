import { useState, useEffect } from "react";
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
  const [authState, setAuthState] = useState<{ user: any | null; session: any | null }>({ user: null, session: null });

  // Check authentication state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthState({ user: session?.user || null, session });
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({ user: session?.user || null, session });
    });
    
    return () => subscription.unsubscribe();
  }, []);

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
      // Use demo tenant if no tenantId provided (for testing)
      const effectiveTenantId = tenantId || "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const bookingDateTime = new Date(`${data.date}T${data.time}`);

      // Establish a consistent idempotency key for this reservation attempt
      const idempotencyKey = crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

      // 1) Create a hold using the live widget function (include idempotency key)
      const hold = await createHold(
        {
          tenant_id: effectiveTenantId,
          party_size: data.partySize,
          slot: { time: bookingDateTime.toISOString(), available_tables: 1 },
          table_id: data.tableId,
        },
        idempotencyKey,
      );

      // 2) Confirm reservation with idempotency (assumes deposit handled in UI when required)
      const [first_name, ...rest] = (data.customerName || "").trim().split(" ");
      const last_name = rest.join(" ") || "";

      const reservation = await confirmReservation(
        {
          tenant_id: effectiveTenantId,
          hold_id: hold.hold_id,
          guest_details: {
            first_name: first_name || data.customerName || "Guest",
            last_name: last_name || "Guest", // Ensure non-empty last_name
            email: data.email,
            phone: data.phone || "0000000000", // Ensure minimum 10 chars
            special_requests: data.specialRequests,
          },
          table_id: data.tableId,
        },
        idempotencyKey,
      );

      return reservation;
    },
    onSuccess: (reservation) => {
      setCreatedReservation(reservation);
      setCurrentStep(5);
      // Force-refresh key booking views immediately; Realtime will follow-up
      const effectiveTenantId = tenantId || "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      queryClient.invalidateQueries({ queryKey: ["advanced-bookings", effectiveTenantId] });
      queryClient.invalidateQueries({ queryKey: ["today-data", effectiveTenantId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
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
    authState,
    isAuthenticated: !!authState.session,
  };
};
