import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  TenantData, 
  TenantFeature, 
  ProvisioningRequestData, 
  ProvisioningResponse,
  EmailResendRequest,
  APIResponse 
} from '@/types/admin';

export const useAdminAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callEdgeFunction = useCallback(async <T = any>(
    functionName: string, 
    payload?: any
  ): Promise<APIResponse<T>> => {
    try {
      setLoading(true);
      
      const response = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data as APIResponse<T>;
    } catch (error) {
      console.error(`Edge function ${functionName} error:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "API Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Tenant Operations
  const provisionTenant = useCallback(async (
    data: ProvisioningRequestData
  ): Promise<APIResponse<ProvisioningResponse>> => {
    const response = await callEdgeFunction<ProvisioningResponse>('tenant-provisioning', data);
    return response;
  }, [callEdgeFunction]);

  const resendWelcomeEmail = useCallback(async (
    tenantSlug: string
  ): Promise<void> => {
    const payload: EmailResendRequest = {
      tenantSlug,
      emailType: 'welcome'
    };
    
    await callEdgeFunction('tenant-email-operations', payload);
    
    toast({
      title: "Email Sent",
      description: "Welcome email has been queued for delivery.",
    });
  }, [callEdgeFunction, toast]);

  // Features Management
  const getTenantFeatures = useCallback(async (
    tenantSlug: string
  ): Promise<TenantFeature[]> => {
    const response = await callEdgeFunction<TenantFeature[]>('tenant-features', {
      action: 'get',
      tenantSlug
    });
    return response.data!;
  }, [callEdgeFunction]);

  const updateTenantFeature = useCallback(async (
    tenantSlug: string,
    featureKey: string,
    enabled: boolean
  ): Promise<void> => {
    await callEdgeFunction('tenant-features', {
      action: 'update',
      tenantSlug,
      featureKey,
      enabled
    });
    
    toast({
      title: "Feature Updated",
      description: `Feature ${featureKey} has been ${enabled ? 'enabled' : 'disabled'}.`,
    });
  }, [callEdgeFunction, toast]);

  const resetFeaturesToPlan = useCallback(async (
    tenantSlug: string
  ): Promise<void> => {
    await callEdgeFunction('tenant-features', {
      action: 'reset-to-plan',
      tenantSlug
    });
    
    toast({
      title: "Features Reset",
      description: "All feature overrides have been removed. Features now match the plan.",
    });
  }, [callEdgeFunction, toast]);

  // Slug to Tenant ID resolution
  const resolveTenantId = useCallback(async (
    slug: string
  ): Promise<string> => {
    const response = await callEdgeFunction<{ tenantId: string }>('tenant-resolver', {
      slug
    });
    return response.data!.tenantId;
  }, [callEdgeFunction]);

  // Enhanced tenant fetching with proper types
  const getTenant = useCallback(async (
    tenantId: string
  ): Promise<TenantData> => {
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        status,
        timezone,
        currency,
        description,
        phone,
        email,
        website,
        address,
        created_at,
        updated_at,
        domains:domains(count)
      `)
      .eq('id', tenantId)
      .single();

    if (error) throw error;

    return {
      ...data,
      domainsCount: Array.isArray(data.domains) ? data.domains.length : 0,
    } as TenantData;
  }, []);

  const listTenants = useCallback(async (filters?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tenants: TenantData[]; total: number }> => {
    let query = supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        status,
        timezone,
        currency,
        description,
        created_at,
        updated_at,
        domains:domains(count)
      `, { count: 'exact' });

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
    }
    
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.range(
        filters.offset || 0, 
        (filters.offset || 0) + filters.limit - 1
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const tenants = (data || []).map(tenant => ({
      ...tenant,
      domainsCount: Array.isArray(tenant.domains) ? tenant.domains.length : 0,
    })) as TenantData[];

    return { tenants, total: count || 0 };
  }, []);

  return {
    loading,
    // Tenant Operations
    provisionTenant,
    resendWelcomeEmail,
    getTenant,
    listTenants,
    // Features Management
    getTenantFeatures,
    updateTenantFeature,
    resetFeaturesToPlan,
    // Utilities
    resolveTenantId,
    callEdgeFunction,
  };
};