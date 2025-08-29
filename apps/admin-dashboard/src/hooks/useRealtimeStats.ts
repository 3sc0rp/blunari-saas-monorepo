import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RealtimeStats {
  totalTenants: number;
  activeTenants: number;
  totalBookings: number;
  totalRevenue: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    tenant_name?: string;
  }>;
}

export const useRealtimeStats = () => {
  const [stats, setStats] = useState<RealtimeStats>({
    totalTenants: 0,
    activeTenants: 0,
    totalBookings: 0,
    totalRevenue: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      setError(null);
      
      // Fetch tenant stats
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, status')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Fetch booking stats
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, deposit_amount, created_at, tenant_id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (bookingsError) throw bookingsError;

      // Calculate stats
      const totalTenants = tenants?.length || 0;
      const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;
      const totalBookings = bookings?.length || 0;
      const totalRevenue = bookings?.reduce((sum, booking) => 
        sum + (booking.deposit_amount || 0), 0) || 0;

      // Create mock recent activity (in real app, this would come from an activity log table)
      const recentActivity = [
        {
          id: '1',
          type: 'tenant_created',
          description: 'New tenant "The Italian Kitchen" created',
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          tenant_name: 'The Italian Kitchen'
        },
        {
          id: '2', 
          type: 'booking_confirmed',
          description: 'Booking confirmed for party of 4',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          type: 'tenant_updated',
          description: 'Settings updated for "Bistro Central"',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          tenant_name: 'Bistro Central'
        }
      ];

      setStats({
        totalTenants,
        activeTenants,
        totalBookings,
        totalRevenue: totalRevenue / 100, // Convert from cents
        recentActivity
      });

    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch real-time statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscriptions
    const tenantsChannel = supabase
      .channel('tenants-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tenants' },
        () => {
          fetchStats();
          toast({
            title: "Live Update",
            description: "Tenant data updated in real-time",
          });
        }
      )
      .subscribe();

    const bookingsChannel = supabase
      .channel('bookings-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchStats();
          toast({
            title: "Live Update", 
            description: "Booking data updated in real-time",
          });
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(tenantsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [toast]);

  const refetch = () => {
    setLoading(true);
    fetchStats();
  };

  return { stats, loading, error, refetch };
};