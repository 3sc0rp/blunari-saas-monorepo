import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Tenant, UserTenantWithTenant } from "@/integrations/supabase/types";
import { getUserTenant } from "@/lib/api-helpers";

export const useTenant = () => {
  const { user } = useAuth();

  // Single tenant policy: Get the user's tenant automatically
  // No domain/slug detection needed - each user belongs to exactly one tenant
  const { data: userTenantData, isLoading, error } = useQuery({
    queryKey: ["user-tenant", user?.id],
    queryFn: async () => {
      if (!user) {
        return null;
      }

      const { data, error } = await getUserTenant(user.id);
      
      if (error) {
        console.error("Failed to get user's tenant:", error);
        return null;
      }

      // Cast the data to the expected type since it comes from our typed API
      const userTenantData = data as UserTenantWithTenant | null;
      if (!userTenantData || !userTenantData.tenants) {
        return null;
      }

      return userTenantData;
    },
    enabled: !!user,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Extract tenant info from user-tenant relationship
  const tenant = userTenantData?.tenants || null;
  const accessType = tenant ? "user" : null;
  const tenantSlug = tenant?.slug || null;

  // Create tenant info for the authenticated user
  const tenantInfo = userTenantData ? {
    tenant_id: userTenantData.tenant_id,
    tenant_name: tenant?.name || '',
    tenant_slug: tenant?.slug || '',
    tenant_status: tenant?.status || 'active',
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
