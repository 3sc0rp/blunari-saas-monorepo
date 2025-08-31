import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  currency: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: any;
  cuisine_type_id?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  created_at: string;
  updated_at: string;
}

// Extract tenant slug from subdomain or domain
const getTenantSlugFromDomain = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  
  // Handle different domain patterns
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1') || hostname.includes('lovable.dev')) {
    // For local development, check for ?tenant= parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam) return tenantParam;
    
    // Fallback to Demo Restaurant for development
    return '2b6c705c-a484-4cda-9003-2f59a82b1c8e.sandbox.lovable.dev';
  }
  
  // Production patterns:
  // restaurant-slug.blunari.ai -> extract "restaurant-slug"
  // restaurant-slug.blunari.app -> extract "restaurant-slug"
  // custom-domain.com -> lookup by domain
  
  const parts = hostname.split('.');
  
  if (parts.length >= 3 && (parts[1] === 'blunari' || parts.includes('blunari'))) {
    // Subdomain pattern: restaurant-slug.blunari.ai
    return parts[0];
  }
  
  // Custom domain - return hostname to lookup in database
  return hostname;
};

export const useTenant = () => {
  const { user } = useAuth();
  const tenantSlug = getTenantSlugFromDomain();

  // First, try to get tenant by subdomain/domain
  const { data: tenantByDomain, isLoading: isLoadingDomain } = useQuery({
    queryKey: ['tenant-by-domain', tenantSlug],
    queryFn: async () => {
      if (!tenantSlug) return null;

      // Use the secure public tenant info view for public access
      let { data, error } = await supabase
        .from('tenant_public_info')
        .select('*')
        .eq('slug', tenantSlug)
        .single();

      if (error && error.code === 'PGRST116') {
        // Not found by slug, try by custom domain
        const { data: domainData, error: domainError } = await supabase
          .from('domains')
          .select(`
            tenant_id,
            tenants (
              id, name, slug, status, timezone, currency, description,
              phone, email, website, address, cuisine_type_id, logo_url,
              primary_color, secondary_color, created_at, updated_at
            )
          `)
          .eq('domain', tenantSlug)
          .eq('status', 'active')
          .single();

        if (domainError) return null;
        data = domainData?.tenants as any;
      }

      if (error && error.code !== 'PGRST116') throw error;
      return data as Tenant | null;
    },
    enabled: !!tenantSlug,
  });

  // Fallback: get tenant by user (for admin access or development)
  const { data: tenantByUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['tenant-by-user', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .rpc('get_user_tenant', { p_user_id: user.id });

      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      return data[0] as {
        tenant_id: string;
        tenant_name: string;
        tenant_slug: string;
        tenant_status: string;
        provisioning_status: string;
      };
    },
    enabled: !!user && !tenantByDomain,
  });

  // Get full tenant details for user-based lookup
  const { data: tenantDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['tenant-details', tenantByUser?.tenant_id],
    queryFn: async () => {
      if (!tenantByUser?.tenant_id) return null;

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantByUser.tenant_id)
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    enabled: !!tenantByUser?.tenant_id,
  });

  // Determine the final tenant and access type
  const tenant = tenantByDomain || tenantDetails;
  const tenantInfo = tenantByDomain ? null : tenantByUser;
  const accessType = tenantByDomain ? 'domain' : 'user';
  
  const isLoading = isLoadingDomain || isLoadingUser || isLoadingDetails;

  return {
    tenant,
    tenantInfo,
    accessType,
    tenantSlug,
    isLoading,
    error: null,
  };
};