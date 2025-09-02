import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tenant } from "@/integrations/supabase/types";
import { getTenantBySlug, getUserTenant } from "@/lib/api-helpers";

// Helper function to extract tenant slug from domain/subdomain
function getTenantSlugFromDomain(): string | null {
  const hostname = window.location.hostname;
  
  // For localhost development, check for tenant parameter in URL or use demo
  if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam) return tenantParam;
    
    // Default to demo-restaurant for development
    return "demo-restaurant";
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

  // Enhanced tenant lookup using the new API helpers
  const { data: tenantByDomain, isLoading: isLoadingDomain, error: domainError } = useQuery({
    queryKey: ["tenant-by-domain", tenantSlug],
    queryFn: async () => {
      if (!tenantSlug) return null;

      const { data, error } = await getTenantBySlug(tenantSlug);
      
      if (error) {
        console.warn(`Domain-based tenant lookup failed for "${tenantSlug}":`, error);
        return null;
      }

      return data as Tenant | null;
    },
    enabled: !!tenantSlug,
    retry: false, // Don't retry to avoid API spam
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // User-based tenant lookup with better error handling
  const { data: tenantByUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["tenant-by-user", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await getUserTenant(user.id);
      
      if (error) {
        console.warn(`User-based tenant lookup failed for user "${user.id}":`, error);
        return null;
      }

      if (!data || !data.tenants) {
        return null;
      }

      return data.tenants as Tenant;
    },
    enabled: !!user && !tenantByDomain,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Determine the final tenant and access type
  const tenant = tenantByDomain || tenantByUser;
  const accessType = tenantByDomain ? "domain" : "user";

  const isLoading = isLoadingDomain || isLoadingUser;
  const error = domainError;

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
