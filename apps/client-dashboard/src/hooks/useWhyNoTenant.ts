import { useTenant } from '@/hooks/useTenant';

export type NoTenantReason =
  | 'loading'
  | 'no-session'
  | 'missing-email'
  | 'provisioning'
  | 'provision-failed'
  | 'resolved'
  | 'unknown';

// Derive reason why tenant may be absent (for diagnostics panels)
export function useWhyNoTenant(): { reason: NoTenantReason; ready: boolean } {
  const { tenant, isLoading } = useTenant();
  if (tenant) return { reason: 'resolved', ready: true };
  if (isLoading) return { reason: 'loading', ready: false };
  // TODO: Could tap into an event log or diagnostics store for richer classification.
  return { reason: 'unknown', ready: true };
}
