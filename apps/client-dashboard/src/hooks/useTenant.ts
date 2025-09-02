import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tenant, UserTenantWithTenant } from "@/integrations/supabase/types";
import { getTenantBySlug, getUserTenant } from "@/lib/api-helpers";

// Helper function to extract tenant slug from domain/subdomain or URL path
function getTenantSlugFromDomain(): string | null {
  try {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // For localhost development, check for tenant in URL path first, then query param
    if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
      // Check if URL path starts with a tenant slug (e.g., /kpizza, /dees-poizza)
      const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
      if (pathSegments.length > 0) {
        const potentialSlug = pathSegments[0];
        // Basic validation - tenant slugs should be alphanumeric with hyphens
        if (/^[a-zA-Z0-9-]+$/.test(potentialSlug)) {
          return potentialSlug;
        }
      }
      
      // Fallback to query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const tenantParam = urlParams.get('tenant');
      return tenantParam;
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
  } catch (error) {
    console.error('Error extracting tenant slug:', error);
    return null;
  }
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
        console.error(`Tenant lookup failed for "${tenantSlug}":`, error);
        throw new Error(`Failed to load tenant: ${error.message}`);
      }

      return data as Tenant | null;
    },
    enabled: !!tenantSlug,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // User-based tenant lookup - real data only
  const { data: tenantByUser, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ["tenant-by-user", user?.id],
    queryFn: async () => {
      if (!user) {
        return null;
      }

      const { data, error } = await getUserTenant(user.id);
      
      if (error) {
        console.error("User-based tenant lookup failed:", error);
        return null;
      }

      // Cast the data to the expected type since it comes from our typed API
      const userTenantData = data as UserTenantWithTenant | null;
      if (!userTenantData || !userTenantData.tenants) {
        return null;
      }

      return userTenantData.tenants;
    },
    enabled: !!user && !tenantByDomain && !isLoadingDomain, // Only run if we have a user and no domain tenant
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Determine the final tenant and access type
  const tenant = tenantByDomain || tenantByUser || null;
  const accessType = tenantByDomain ? "domain" : tenantByUser ? "user" : null;

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
