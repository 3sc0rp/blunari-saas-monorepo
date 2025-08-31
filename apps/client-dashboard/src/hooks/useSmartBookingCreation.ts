import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookingFormData, TableOptimization } from '@/types/booking';
import { useToast } from '@/hooks/use-toast';

export const useSmartBookingCreation = (tenantId?: string) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BookingFormData>({
    customerName: '',
    email: '',
    phone: '',
    partySize: 2,
    date: '',
    time: '',
    duration: 120,
    source: 'phone',
    specialRequests: '',
    depositRequired: false
  });

  // Fetch available tables for optimization
  const { data: availableTables = [] } = useQuery({
    queryKey: ['available-tables', tenantId, formData.date, formData.time],
    queryFn: async () => {
      if (!tenantId || !formData.date || !formData.time) return [];

      // Get all tables
      const { data: tables, error: tablesError } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true);

      if (tablesError) throw tablesError;

      // Get conflicting bookings
      const bookingDateTime = new Date(`${formData.date}T${formData.time}`);
      const endTime = new Date(bookingDateTime.getTime() + (formData.duration || 120) * 60000);

      const { data: conflicts, error: conflictsError } = await supabase
        .from('bookings')
        .select('table_id')
        .eq('tenant_id', tenantId)
        .gte('booking_time', bookingDateTime.toISOString())
        .lt('booking_time', endTime.toISOString())
        .in('status', ['confirmed', 'seated']);

      if (conflictsError) throw conflictsError;

      const conflictTableIds = new Set(conflicts.map(c => c.table_id).filter(Boolean));

      // Calculate optimization scores
      return tables
        .filter(table => !conflictTableIds.has(table.id))
        .map(table => ({
          tableId: table.id,
          tableName: table.name,
          capacity: table.capacity,
          utilization: (formData.partySize / table.capacity) * 100,
          recommendationScore: calculateRecommendationScore(table, formData.partySize),
          conflicts: 0
        } as TableOptimization))
        .sort((a, b) => b.recommendationScore - a.recommendationScore);
    },
    enabled: !!tenantId && !!formData.date && !!formData.time
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
  const calculateRecommendationScore = (table: { capacity: number; [key: string]: unknown }, partySize: number) => {
    const utilization = (partySize / table.capacity) * 100;
    
    // Perfect utilization is around 75-85%
    let score = 100;
    if (utilization < 50) score -= (50 - utilization) * 2; // Penalty for under-utilization
    if (utilization > 90) score -= (utilization - 90) * 3; // Penalty for over-crowding
    
    return Math.max(0, score);
  };

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData & { tableId?: string }) => {
      const bookingDateTime = new Date(`${data.date}T${data.time}`);
      const eta = calculateETA(bookingDateTime.toISOString(), data.partySize);
      
      const bookingData = {
        tenant_id: tenantId,
        guest_name: data.customerName,
        guest_email: data.email,
        guest_phone: data.phone,
        party_size: data.partySize,
        booking_time: bookingDateTime.toISOString(),
        duration_minutes: data.duration || 120,
        table_id: data.tableId,
        special_requests: data.specialRequests,
        status: 'confirmed',
        deposit_required: data.depositRequired,
        deposit_amount: data.depositAmount,
        eta_prediction: eta,
        confidence_score: Math.random() * 20 + 80 // 80-100% confidence
      };

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;
      return booking;
    },
    onSuccess: (booking) => {
      toast({
        title: 'Booking Created Successfully',
        description: `Booking for ${booking.guest_name} on ${new Date(booking.booking_time).toLocaleDateString()} has been confirmed.`
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create Booking',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      customerName: '',
      email: '',
      phone: '',
      partySize: 2,
      date: '',
      time: '',
      duration: 120,
      source: 'phone',
      specialRequests: '',
      depositRequired: false
    });
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const previousStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const updateFormData = (updates: Partial<BookingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return {
    currentStep,
    formData,
    availableTables,
    createBooking: createBookingMutation.mutate,
    isCreating: createBookingMutation.isPending,
    nextStep,
    previousStep,
    updateFormData,
    resetForm,
    calculateETA
  };
};