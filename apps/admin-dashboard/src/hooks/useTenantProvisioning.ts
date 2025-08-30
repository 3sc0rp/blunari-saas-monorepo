import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const BACKGROUND_OPS_URL = import.meta.env.VITE_BACKGROUND_OPS_URL || 'https://background-ops.fly.dev';

export interface ProvisioningData {
  // Basic Information
  restaurantName: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  cuisineTypeId?: string;

  // Owner Account
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPassword: string;

  // Business Configuration
  timezone: string;
  businessHours: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  }>;
  partySizeConfig: {
    minPartySize: number;
    maxPartySize: number;
    defaultPartySize: number;
    allowLargeParties: boolean;
    largePartyThreshold: number;
  };

  // Billing Setup
  selectedPlanId: string;
  billingCycle: 'monthly' | 'yearly';
  
  // Feature Configuration
  enabledFeatures: {
    deposits: boolean;
    posIntegration: boolean;
    etaNotifications: boolean;
    customBranding: boolean;
    advancedAnalytics: boolean;
    multiLocation: boolean;
  };
}

export const useTenantProvisioning = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const provisionTenant = async (data: ProvisioningData) => {
    try {
      setLoading(true);
      
      console.log('Provisioning tenant via background-ops API', { 
        restaurantName: data.restaurantName,
        url: `${BACKGROUND_OPS_URL}/api/v1/tenants/provision`
      });

      const response = await fetch(`${BACKGROUND_OPS_URL}/api/v1/tenants/provision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to provision tenant');
      }

      toast({
        title: "Success!",
        description: result.message || `${data.restaurantName} has been successfully created!`,
      });

      return result;

    } catch (error) {
      console.error('Tenant provisioning error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Provisioning Failed",
        description: errorMessage,
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
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, value.toString());
        });
      }
      
      const url = `${BACKGROUND_OPS_URL}/api/v1/tenants${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tenants: HTTP ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenants",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getTenant = async (id: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${BACKGROUND_OPS_URL}/api/v1/tenants/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tenant not found');
        }
        throw new Error(`Failed to fetch tenant: HTTP ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch tenant",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    provisionTenant,
    getTenants,
    getTenant,
  };
};
