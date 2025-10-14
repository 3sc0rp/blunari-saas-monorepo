import { useMemo } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EntitlementKey = 'three_d_floor';

export function hasEntitlement(tenant: any, key: EntitlementKey): boolean {
  try {
    const settings = (tenant?.settings as any) || {};
    const entitlements = settings.entitlements || {};
    if (typeof entitlements[key] === 'boolean') return entitlements[key] === true;
    // Also support tenant_settings table mirror in frontend cache
      if (present
      const fromSettings = (tenant?.entitlements as any)?.[key];
    return Boolean(fromSettings === true);
  } catch {
    return false;
  }
}

export function useEntitlement(key: EntitlementKey): { entitled: boolean; loading: boolean } {
  const { tenant, loading } = useTenant();

  const { data: entitledFromDb, isLoading } = useQuery({
    queryKey: ['entitlement', key, tenant?.id],
    enabled: !!tenant?.id,
    staleTime: 60_000,
    queryFn: async () => {
      if (!tenant?.id) return false;
      // Try tenants.settings first
      try {
        const { data: t } = await supabase
          .from('tenants')
          .select('settings')
          .eq('id', tenant.id)
          .maybeSingle();
        const s = (t as any)?.settings || {};
        const ent = s?.entitlements || {};
        if (ent && ent[key] === true) return true;
      } catch {}

      // Fallback to tenant_settings row 'entitlements'
      try {
        const { data: ts } = await supabase
          .from('tenant_settings')
          .select('setting_value')
          .eq('tenant_id', tenant.id)
          .eq('setting_key', 'entitlements')
          .maybeSingle();
        const ent2 = (ts as any)?.setting_value || {};
        return ent2?.[key] === true;
      } catch {
        return false;
      }
    }
  });

  const entitledLocal = useMemo(() => hasEntitlement(tenant, key), [tenant, key]);
  const entitled = entitledFromDb ?? entitledLocal;
  return { entitled, loading: loading || isLoading };
}




