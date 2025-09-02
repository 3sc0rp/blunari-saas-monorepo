import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CateringPackage, CreateCateringOrderRequest } from '@/types/catering';

interface UseCateringDataReturn {
  packages: CateringPackage[] | null;
  loading: boolean;
  error: string | null;
  createOrder: (orderData: CreateCateringOrderRequest) => Promise<void>;
  refetch: () => Promise<void>;
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

      // Fetch catering packages for this tenant
      const { data: packagesData, error: packagesError } = await supabase
        .from('catering_packages')
        .select(`
          *,
          catering_package_items!inner(
            quantity,
            catering_menu_items!inner(
              id,
              name,
              description,
              category_id,
              price_per_person,
              dietary_restrictions,
              allergens
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

      setPackages(packagesData || []);
    } catch (err) {
      console.error('Error fetching catering packages:', err);
      setError('Failed to load catering packages');
      // For development - show empty packages instead of error
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
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error creating catering order:', err);
      throw new Error('Failed to submit catering order');
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
    refetch: fetchPackages
  };
}
