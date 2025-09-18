import { useMemo } from 'react';
import { useTenant } from '@/hooks/useTenant';

export type EntitlementKey = 'three_d_floor';

export function hasEntitlement(tenant: any, key: EntitlementKey): boolean {
  try {
    const settings = (tenant?.settings as any) || {};
    const entitlements = settings.entitlements || {};
    if (typeof entitlements[key] === 'boolean') return entitlements[key] === true;
    // Also support tenant_settings table mirror in frontend cache if present
    const fromSettings = (tenant?.entitlements as any)?.[key];
    return Boolean(fromSettings === true);
  } catch {
    return false;
  }
}

export function useEntitlement(key: EntitlementKey): { entitled: boolean; loading: boolean } {
  const { tenant, loading } = useTenant();
  const entitled = useMemo(() => hasEntitlement(tenant, key), [tenant, key]);
  return { entitled, loading };
}


