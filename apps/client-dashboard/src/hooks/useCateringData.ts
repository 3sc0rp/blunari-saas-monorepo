import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CateringPackage, CreateCateringOrderRequest, CateringOrder } from '@/types/catering';

interface UseCateringDataReturn {
  packages: CateringPackage[] | null;
  loading: boolean;
  error: string | null;
  createOrder: (orderData: CreateCateringOrderRequest) => Promise<any>;
  refetch: () => Promise<void>;
  // Additional utility functions
  getOrdersByStatus: (status: string) => Promise<CateringOrder[]>;
  updateOrderStatus: (orderId: string, status: string, notes?: string) => Promise<void>;
}

export function useCateringData(tenantId?: string): UseCateringDataReturn {
  const [packages, setPackages] = useState<CateringPackage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch catering packages with their menu items for this tenant
      const { data: packagesData, error: packagesError } = await supabase
        .from('catering_packages')
        .select(`
          *,
          catering_package_items (
            id,
            quantity_per_person,
            is_included,
            additional_cost_per_person,
            catering_menu_items (
              id,
              name,
              description,
              base_price,
              unit,
              dietary_restrictions,
              allergen_info,
              image_url
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('popular', { ascending: false })
        .order('created_at', { ascending: false });

      if (packagesError) {
        throw packagesError;
      }

      setPackages(packagesData as CateringPackage[] || []);
      
    } catch (err: any) {
      console.error('Error fetching catering packages:', err);
      
      // Check if it's a table not found error (catering tables not yet created)
      if (err.code === 'PGRST106' || err.message?.includes('relation') || err.message?.includes('does not exist')) {
        setError('Catering functionality is not yet available. Please contact support to enable catering features.');
      } else {
        setError('Failed to load catering packages');
      }
      
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData: CreateCateringOrderRequest) => {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('catering_orders')
        .insert([
          {
            ...orderData,
            tenant_id: tenantId,
            status: 'inquiry',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select(`
          *,
          catering_packages (
            id,
            name,
            price_per_person
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      // Create order history entry
      await supabase
        .from('catering_order_history')
        .insert({
          order_id: data.id,
          status: 'inquiry',
          notes: 'Order created by customer'
        });

      return data;
    } catch (err: any) {
      console.error('Error creating catering order:', err);
      
      // Check if it's a table not found error
      if (err.code === 'PGRST106' || err.message?.includes('relation') || err.message?.includes('does not exist')) {
        throw new Error('Catering functionality is not yet available. Please contact support to enable catering features.');
      } else {
        throw new Error('Failed to submit catering order');
      }
    }
  };

  const getOrdersByStatus = async (status: string): Promise<CateringOrder[]> => {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('catering_orders')
        .select(`
          *,
          catering_packages (
            id,
            name,
            price_per_person
          ),
          catering_feedback (
            id,
            overall_rating,
            comments
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', status)
        .order('event_date', { ascending: true });

      if (error) {
        throw error;
      }

      return data as CateringOrder[];
    } catch (err: any) {
      console.error('Error fetching orders by status:', err);
      if (err.code === 'PGRST106' || err.message?.includes('relation') || err.message?.includes('does not exist')) {
        throw new Error('Catering functionality is not yet available');
      }
      throw new Error('Failed to fetch orders');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, notes?: string): Promise<void> => {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    try {
      // Update the order status
      const { error: updateError } = await supabase
        .from('catering_orders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        throw updateError;
      }

      // Create history entry
      const { error: historyError } = await supabase
        .from('catering_order_history')
        .insert({
          order_id: orderId,
          status,
          notes: notes || `Status updated to ${status}`
        });

      if (historyError) {
        console.error('Failed to create history entry:', historyError);
      }

    } catch (err: any) {
      console.error('Error updating order status:', err);
      if (err.code === 'PGRST106' || err.message?.includes('relation') || err.message?.includes('does not exist')) {
        throw new Error('Catering functionality is not yet available');
      }
      throw new Error('Failed to update order status');
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [tenantId]);

  return {
    packages,
    loading,
    error,
    createOrder,
    refetch: fetchPackages,
    getOrdersByStatus,
    updateOrderStatus
  };
}

// Additional utility hook for catering analytics
export function useCateringAnalytics(tenantId?: string) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch catering analytics from the view
        const { data, error } = await supabase
          .from('catering_order_metrics')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('month', { ascending: false })
          .limit(12);

        if (error && error.code !== 'PGRST106') {
          throw error;
        }

        setAnalytics(data || []);
      } catch (err) {
        console.error('Error fetching catering analytics:', err);
        setAnalytics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [tenantId]);

  return {
    analytics,
    loading
  };
}
