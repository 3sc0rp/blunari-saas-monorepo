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

  const callEdgeFunction = useCallback(async <T = unknown>(
    functionName: string, 
    payload?: Record<string, unknown>
  ): Promise<APIResponse<T>> => {
    try {
      setLoading(true);
      
      const response = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      if (response.error) {
        const data: Record<string, unknown> = response.data as Record<string, unknown>;
        const errObj = data?.error || data;
        const message = (errObj as { message?: string })?.message || response.error.message || 'Edge function error';
        const code = (errObj as { code?: string })?.code ? ` (${(errObj as { code: string }).code})` : '';
        const details = (errObj as { details?: string })?.details ? ` - ${(errObj as { details: string }).details}` : '';
        throw new Error(`${message}${code}${details}`);
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
    tenant: { id: string; slug: string }
  ): Promise<{ jobId?: string; message?: string; email?: { success?: boolean; message?: string; warning?: string; error?: string } }> => {
    const payload: Record<string, unknown> = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      emailType: 'welcome'
    };

    const response = await callEdgeFunction('tenant-email-operations', payload);
    
    if (!response.success) {
      const err = (response as { error?: { message?: string; code?: string } }).error || {};
      const message = err.message || 'Failed to queue email';
      const code = err.code ? ` (${err.code})` : '';
      throw new Error(`${message}${code}`);
    }

    const responseData = response as { jobId?: string; message?: string; email?: { success?: boolean; message?: string; warning?: string; error?: string } };
    return { jobId: responseData.jobId, message: responseData.message, email: responseData.email };
  }, [callEdgeFunction]);

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