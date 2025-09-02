import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tenant } from "@/integrations/supabase/types";
import { getTenantBySlug, getUserTenant } from "@/lib/api-helpers";

// Helper function to extract tenant slug from domain/subdomain
function getTenantSlugFromDomain(): string | null {
  const hostname = window.location.hostname;
  
  // For localhost development, check for tenant parameter in URL
  if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam) return tenantParam;
    
    // No default - must be explicitly provided
    return null;
  }

  // For production domains, extract subdomain
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    // Extract subdomain (e.g., "restaurant" from "restaurant.example.com")
    return parts[0];
  }

  // Check if it's a direct domain match
  if (parts.length === 2) {
    // Could be direct domain like "restaurant.com"
    return parts[0];
  }

  return null;
}

export const useTenant = () => {
  const { user } = useAuth();
  const tenantSlug = getTenantSlugFromDomain();

  // Tenant lookup by domain/slug - real data only
  const { data: tenantByDomain, isLoading: isLoadingDomain, error: domainError } = useQuery({
    queryKey: ["tenant-by-domain", tenantSlug],
    queryFn: async () => {
      if (!tenantSlug) return null;

      const { data, error } = await getTenantBySlug(tenantSlug);
      
      if (error) {
        console.error(`Domain-based tenant lookup failed for "${tenantSlug}":`, error);
        throw new Error(`Failed to load tenant "${tenantSlug}": ${error.message}`);
      }

      return data as Tenant | null;
    },
    enabled: !!tenantSlug,
    retry: 1, // Retry once on failure
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // User-based tenant lookup - real data only
  const { data: tenantByUser, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ["tenant-by-user", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await getUserTenant(user.id);
      
      if (error) {
        console.error(`User-based tenant lookup failed for user "${user.id}":`, error);
        // Don't throw error for user lookup as it might be expected to fail
        return null;
      }

      if (!data || !data.tenants) {
        return null;
      }

      return data.tenants as Tenant;
    },
    enabled: !!user && !tenantByDomain,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Determine the final tenant and access type
  const tenant = tenantByDomain || tenantByUser;
  const accessType = tenantByDomain ? "domain" : "user";

  const isLoading = isLoadingDomain || isLoadingUser;
  const error = domainError || userError;

  // Create tenant info for user-based access
  const tenantInfo = tenantByUser ? {
    tenant_id: tenantByUser.id,
    tenant_name: tenantByUser.name,
    tenant_slug: tenantByUser.slug,
    tenant_status: tenantByUser.status,
    provisioning_status: "active"
  } : null;

  return {
    tenant,
    tenantInfo,
    accessType,
    tenantSlug,
    isLoading,
    error,
  };
};
