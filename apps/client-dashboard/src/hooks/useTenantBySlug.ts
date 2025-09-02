import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Tenant = Database['public']['Tables']['tenants']['Row'];

interface UseTenantBySlugReturn {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
}

export function useTenantBySlug(slug: string): UseTenantBySlugReturn {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'active')
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setError('Tenant not found');
          } else {
            throw error;
          }
          return;
        }

        setTenant(data);
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setError('Failed to load tenant information');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [slug]);

  return {
    tenant,
    loading,
    error
  };
}
