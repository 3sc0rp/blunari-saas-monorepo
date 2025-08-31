import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  total_visits: number;
  total_spent: number;
  last_visit: string;
  average_party_size: number;
  customer_type: 'regular' | 'vip' | 'new' | 'inactive';
  preferences: string[];
  allergies: string[];
  special_occasions: Array<{
    type: string;
    date: string;
    notes?: string;
  }>;
  loyalty_points: number;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export const useCustomerManagement = (tenantId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch customers with their booking history
  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Get all bookings for this tenant to derive customer data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('booking_time', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Group bookings by customer email
      const customerMap = new Map<string, any>();

      bookingsData.forEach(booking => {
        const key = booking.guest_email;
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: booking.id, // Use first booking ID as customer ID
            name: booking.guest_name,
            email: booking.guest_email,
            phone: booking.guest_phone,
            bookings: [],
            total_spent: 0,
            total_visits: 0,
            party_sizes: [],
            last_visit: booking.booking_time
          });
        }

        const customer = customerMap.get(key);
        customer.bookings.push(booking);
        customer.total_visits++;
        customer.party_sizes.push(booking.party_size);
        
        // Calculate estimated spend from actual booking data
        if (booking.status === 'completed') {
          customer.total_spent += booking.party_size * 45; // Estimated $45 per person
        }

        // Update last visit to most recent
        if (new Date(booking.booking_time) > new Date(customer.last_visit)) {
          customer.last_visit = booking.booking_time;
        }
      });

      // Convert to Customer format
      const customersArray: Customer[] = Array.from(customerMap.values()).map(customerData => {
        const avgPartySize = customerData.party_sizes.length > 0 
          ? customerData.party_sizes.reduce((sum: number, size: number) => sum + size, 0) / customerData.party_sizes.length 
          : 0;

        // Determine customer type based on visit frequency and recency
        let customerType: Customer['customer_type'] = 'new';
        const daysSinceLastVisit = (Date.now() - new Date(customerData.last_visit).getTime()) / (1000 * 60 * 60 * 24);
        
        if (customerData.total_visits >= 10 || customerData.total_spent >= 1000) {
          customerType = 'vip';
        } else if (customerData.total_visits >= 3) {
          customerType = 'regular';
        } else if (daysSinceLastVisit > 90) {
          customerType = 'inactive';
        }

        return {
          id: customerData.id,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          total_visits: customerData.total_visits,
          total_spent: customerData.total_spent,
          last_visit: customerData.last_visit,
          average_party_size: Math.round(avgPartySize * 10) / 10,
          customer_type: customerType,
          preferences: [], // Could be expanded with customer preferences table
          allergies: [], // Could be expanded with dietary restrictions table
          special_occasions: [], // Could be expanded with customer occasions table
          loyalty_points: Math.floor(customerData.total_spent / 10), // 1 point per $10 spent
        };
      });

      return customersArray.sort((a, b) => b.total_visits - a.total_visits);
    },
    enabled: !!tenantId,
  });

  // Add new customer
  const addCustomerMutation = useMutation({
    mutationFn: async (customerData: Partial<Customer>) => {
      // This would create a customer profile
      // For now, customers are created through bookings
      throw new Error('Customer creation is handled through the booking system');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', tenantId] });
      toast({
        title: 'Customer Added',
        description: 'Customer has been successfully added.'
      });
    }
  });

  return {
    customers,
    isLoading,
    error,
    addCustomer: addCustomerMutation.mutate,
    isAdding: addCustomerMutation.isPending
  };
};