import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
  timezone: string;
  currency: string;
  created_at: string;
  updated_at: string;
  analytics?: {
    total_bookings: number;
    revenue: number;
    active_tables: number;
  };
}

export interface TenantFeatures {
  [key: string]: boolean | string | number;
}

export const useTenantAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callTenantAPI = async (endpoint: string, options: RequestInit = {}) => {
    try {
      setLoading(true);
      
      const response = await supabase.functions.invoke('tenant-api', {
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
      console.error('Tenant API Error:', error);
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

  const getTenants = async (filters?: { 
    status?: string; 
    page?: number; 
    limit?: number; 
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const endpoint = `/tenants${params.toString() ? `?${params.toString()}` : ''}`;
    return callTenantAPI(endpoint);
  };

  const getTenant = async (id: string) => {
    return callTenantAPI(`/tenants/${id}`);
  };

  const createTenant = async (tenantData: Omit<TenantData, 'id' | 'created_at' | 'updated_at'>) => {
    return callTenantAPI('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
  };

  const updateTenant = async (id: string, updates: Partial<TenantData>) => {
    return callTenantAPI(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  };

  const deleteTenant = async (id: string) => {
    return callTenantAPI(`/tenants/${id}`, {
      method: 'DELETE',
    });
  };

  const getTenantAnalytics = async (id: string, dateRange?: { start: string; end: string }) => {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('start_date', dateRange.start);
      params.append('end_date', dateRange.end);
    }
    
    const endpoint = `/tenants/${id}/analytics${params.toString() ? `?${params.toString()}` : ''}`;
    return callTenantAPI(endpoint);
  };

  const updateTenantFeatures = async (id: string, features: TenantFeatures) => {
    return callTenantAPI(`/tenants/${id}/features`, {
      method: 'POST',
      body: JSON.stringify(features),
    });
  };

  return {
    loading,
    getTenants,
    getTenant,
    createTenant,
    updateTenant,
    deleteTenant,
    getTenantAnalytics,
    updateTenantFeatures,
  };
};