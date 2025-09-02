import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
  cuisine_type_id?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  created_at: string;
  updated_at: string;
}

// Extract tenant slug from subdomain or domain
const getTenantSlugFromDomain = (): string | null => {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;

  // Handle different domain patterns
  if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
    // For local development, check for ?tenant= parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get("tenant");
    if (tenantParam) return tenantParam;

    // Fallback to Demo Restaurant for development
    return "demo-restaurant";
  }

  // Production patterns:
  // restaurant-slug.blunari.ai -> extract "restaurant-slug"
  // restaurant-slug.blunari.app -> extract "restaurant-slug"
  // custom-domain.com -> lookup by domain

  const parts = hostname.split(".");

  if (
    parts.length >= 3 &&
    (parts[1] === "blunari" || parts.includes("blunari"))
  ) {
    // Subdomain pattern: restaurant-slug.blunari.ai
    return parts[0];
  }

  // Custom domain - return hostname to lookup in database
  return hostname;
};

export const useTenant = () => {
  const { user } = useAuth();
  const tenantSlug = getTenantSlugFromDomain();

  // Simplified tenant lookup using main tenants table only
  const { data: tenantByDomain, isLoading: isLoadingDomain } = useQuery({
    queryKey: ["tenant-by-domain", tenantSlug],
    queryFn: async () => {
      if (!tenantSlug) return null;

      try {
        // Try direct tenant lookup by slug first
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .eq("slug", tenantSlug)
          .single();

        if (error && error.code === "PGRST116") {
          // Not found by slug - for development, return a mock tenant
          if (tenantSlug === "demo-restaurant" || window.location.hostname === "localhost") {
            return {
              id: "demo-tenant-id",
              name: "Demo Restaurant", 
              slug: "demo-restaurant",
              status: "active",
              timezone: "UTC",
              currency: "USD",
              description: "Demo restaurant for development",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Tenant;
          }
          return null;
        }

        if (error) {
          console.warn("Tenant lookup error:", error);
          return null;
        }

        return data as Tenant | null;
      } catch (err) {
        console.warn("Tenant lookup failed:", err);
        return null;
      }
    },
    enabled: !!tenantSlug,
    retry: 1, // Reduce retries to avoid spam
  });

  // Fallback: get tenant by user (for admin access or development)
  const { data: tenantByUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["tenant-by-user", user?.id],
    queryFn: async () => {
      if (!user) return null;

      try {
        const { data, error } = await supabase.rpc("get_user_tenant", {
          p_user_id: user.id,
        });

        if (error) {
          console.warn("User tenant lookup error:", error);
          return null;
        }

        if (!data || data.length === 0) return null;

        return data[0] as {
          tenant_id: string;
          tenant_name: string;
          tenant_slug: string;
          tenant_status: string;
          provisioning_status: string;
        };
      } catch (err) {
        console.warn("User tenant lookup failed:", err);
        return null;
      }
    },
    enabled: !!user && !tenantByDomain,
    retry: 1,
  });

  // Get full tenant details for user-based lookup
  const { data: tenantDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["tenant-details", tenantByUser?.tenant_id],
    queryFn: async () => {
      if (!tenantByUser?.tenant_id) return null;

      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantByUser.tenant_id)
          .single();

        if (error) {
          console.warn("Tenant details lookup error:", error);
          return null;
        }
        return data as Tenant;
      } catch (err) {
        console.warn("Tenant details lookup failed:", err);
        return null;
      }
    },
    enabled: !!tenantByUser?.tenant_id,
    retry: 1,
  });

  // Determine the final tenant and access type
  const tenant = tenantByDomain || tenantDetails;
  const tenantInfo = tenantByDomain ? null : tenantByUser;
  const accessType = tenantByDomain ? "domain" : "user";

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
