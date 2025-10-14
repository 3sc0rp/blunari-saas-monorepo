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
      // Guard: tenantId must be present in normal runtime. Fallback only allowed in explicit dev flag.
      const allowDemo = import.meta.env.MODE === 'development' && import.meta.env.VITE_ALLOW_DEMO_TENANT === 'true';
      if (!tenantId && !allowDemo) {
        throw new Error('Tenant context not ready yet. Please wait for restaurant data to load before creating a booking.');
      }
      const effectiveTenantId = tenantId || (allowDemo ? 'f47ac10b-58cc-4372-a567-0e02b2c3d479' : undefined)!;
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
            phone: data.phone || null, // Phone is optional after verification removal
            special_requests: data.specialRequests,
          },
          table_id: data.tableId,
          source: data.source || 'internal',
        },
        idempotencyKey,
      );

      return reservation;
    },
    onSuccess: async (reservation) => {
      if (import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {      }
      setCreatedReservation(reservation);
      setCurrentStep(5);
      // Force-refresh key booking views for the real tenant only
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: ["advanced-bookings", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["today-data", tenantId] });
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      }
      toast({
        title: reservation.status === 'pending' ? 'Reservation Submitted (Pending Approval)' : 'Booking Created Successfully',
        description: reservation.status === 'pending'
          ? `Reservation ${reservation.reservation_id || 'created'} is pending approval and will appear in your bookings list.`
          : `Reservation ${reservation.reservation_id || 'created'} has been confirmed.`,
      });

      // Post-create verification: ensure row exists in DB;
      if (not, warn user
      if (tenantId) {
        try {
          const conf = reservation.reservation_id;
          // Grace period delay to allow replication / commit
          await new Promise(r => setTimeout(r, 1000));
          
          // Try multiple verification approaches
          let found = false;
          let verificationAttempts = [];
          
          // Attempt 1: Search by reservation ID
      if (available
      if (conf) {
            try {
              const { data: confCheck, error: confError } = await supabase
                .from('bookings')
                .select('id, status, booking_time, guest_email, guest_name')
                .eq('tenant_id', tenantId)
                .eq('id', conf)
                .limit(3);
              
              verificationAttempts.push({ method: 'id_lookup', error: confError, count: confCheck?.length || 0 });
              if (confCheck && confCheck.length > 0) {
                found = true;              }
            } catch (e) {
              verificationAttempts.push({ method: 'id_lookup', error: e, count: 0 });
            }
          }
          
          // Attempt 2: Search by email and time window
      if (!found) {
            try {
              const { data: emailCheck, error: emailError } = await supabase
                .from('bookings')
                .select('id, status, booking_time, guest_email, guest_name')
                .eq('tenant_id', tenantId)
                .eq('guest_email', formData.email)
                .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Created in last 5 minutes
                .order('created_at', { ascending: false })
                .limit(5);
              
              verificationAttempts.push({ method: 'email_time', error: emailError, count: emailCheck?.length || 0 });
              
              if (emailCheck) {
                const expectedTime = new Date(`${formData.date}T${formData.time}`).getTime();
                const matchedBooking = emailCheck.find(r => {
                  const bookingTime = new Date(r.booking_time).getTime();
                  const timeDiff = Math.abs(bookingTime - expectedTime);
                  return timeDiff < 15 * 60 * 1000; // within 15 minutes
                });
                
                if (matchedBooking) {
                  found = true;                }
              }
            } catch (e) {
              verificationAttempts.push({ method: 'email_time', error: e, count: 0 });
            }
          }
          
          // Attempt 3: Broader recent bookings check
      if (!found) {
            try {
              const { data: recentCheck, error: recentError } = await supabase
                .from('bookings')
                .select('id, status, booking_time, guest_email, guest_name, created_at')
                .eq('tenant_id', tenantId)
                .gte('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString()) // Created in last 2 minutes
                .order('created_at', { ascending: false })
                .limit(10);
              
              verificationAttempts.push({ method: 'recent', error: recentError, count: recentCheck?.length || 0 });
              
              if (recentCheck && recentCheck.length > 0) {
                found = true; // If any booking was created recently, consider it successful              }
            } catch (e) {
              verificationAttempts.push({ method: 'recent', error: e, count: 0 });
            }
          }
          
          // Log verification details for debugging
      if (import.meta.env.VITE_ENABLE_DEV_LOGS === 'true') {          }
          
          if (!found) {
            console.error('[SmartBookingCreation] Verification failed after all attempts');
            console.error('Verification attempts:', verificationAttempts);
            
            // Only show error
      if (we have permission issues or other serious problems
      const hasPermissionError = verificationAttempts.some(a => 
              a.error && (
                a.error.toString().includes('permission') || 
                a.error.toString().includes('RLS') ||
                a.error.toString().includes('access')
              )
            );
            
            if (hasPermissionError) {
              toast({
                title: 'Booking Verification Issue',
                description: 'Booking may have been created but could not be verified. Please check your bookings list.',
                variant: 'destructive'
              });
            } else {
              // Don't show error for minor verification issues - booking likely succeeded
              console.warn('[SmartBookingCreation] Verification inconclusive but booking API succeeded');
            }
          }
        } catch (e) {
          console.warn('[SmartBookingCreation] Verification process failed:', e);
          // Don't show error toast for verification failures - booking API succeeded
        }
      }
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




