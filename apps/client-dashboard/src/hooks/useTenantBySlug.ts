import { useState, useEffect } from "react";
// Public widget context must avoid supabase-js to prevent Locks API usage.
// We resolve tenant via the lightweight edge function instead.
import { getTenantBySlug } from "@/api/booking-proxy";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  timezone?: string;
  currency?: string;
  contact_email?: string;
  contact_phone?: string;
};

interface UseTenantBySlugReturn {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
}

export function useTenantBySlug(slug: string): UseTenantBySlugReturn {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const info = await getTenantBySlug(slug);
        if (cancelled) return;
        setTenant({
          id: info.tenant_id,
          name: info.name,
          slug: info.slug,
          timezone: info.timezone,
          currency: info.currency,
          contact_email: info.contact_email,
          contact_phone: info.contact_phone,
        });
      } catch (err) {
        if (cancelled) return;
        setError("Failed to load tenant information");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return {
    tenant,
    loading,
    error,
  };
}
