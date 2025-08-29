import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Booking {
  id: string;
  tenant_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  party_size: number;
  booking_time: string;
  duration_minutes: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  special_requests?: string;
  table_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  time: string;
  available_tables: number;
  table_ids: string[];
}

export const useBookingAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callBookingAPI = async (endpoint: string, options: RequestInit = {}) => {
    try {
      setLoading(true);
      
      const response = await supabase.functions.invoke('booking-api', {
        body: {
          endpoint,
          method: options.method || 'GET',
          body: options.body ? JSON.parse(options.body as string) : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    } catch (error) {
      console.error('Booking API Error:', error);
      toast({
        title: "API Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getBookings = async (filters?: { 
    status?: string; 
    date?: string; 
    tenant_id?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const endpoint = `/api/bookings${params.toString() ? `?${params.toString()}` : ''}`;
    return callBookingAPI(endpoint);
  };

  const getBooking = async (id: string) => {
    return callBookingAPI(`/api/bookings/${id}`);
  };

  const createBooking = async (bookingData: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) => {
    return callBookingAPI('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    return callBookingAPI(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  };

  const cancelBooking = async (id: string) => {
    return callBookingAPI(`/api/bookings/${id}`, {
      method: 'DELETE',
    });
  };

  const confirmBooking = async (id: string) => {
    return callBookingAPI(`/api/bookings/${id}/confirm`, {
      method: 'POST',
    });
  };

  const checkAvailability = async (date: string, partySize: number, tenantId?: string) => {
    const params = new URLSearchParams({
      date,
      party_size: partySize.toString(),
      ...(tenantId && { tenant_id: tenantId }),
    });
    
    return callBookingAPI(`/api/availability?${params.toString()}`);
  };

  return {
    loading,
    getBookings,
    getBooking,
    createBooking,
    updateBooking,
    cancelBooking,
    confirmBooking,
    checkAvailability,
  };
};