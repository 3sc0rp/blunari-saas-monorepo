import React from 'react';
import { useTenant } from '@/hooks/useTenant';
import { useWhyNoTenant } from '@/hooks/useWhyNoTenant';

export const TenantDiagnosticsPanel: React.FC = () => {
  if (!import.meta.env.DEV) return null;
  const { tenant, tenantId, tenantSlug, isLoading } = useTenant();
  const { reason } = useWhyNoTenant();
  return (
    <div style={{ position: 'fixed', bottom: 8, right: 8, fontSize: 11, fontFamily: 'monospace', background: '#111827', color: '#9ca3af', padding: '8px 10px', borderRadius: 6, zIndex: 9999 }}>
      <strong style={{ color: '#f9fafb' }}>Tenant Diagnostics</strong>
      <div>Status: {isLoading ? 'loading' : tenant ? 'ready' : 'none'}</div>
      <div>Reason: {reason}</div>
      <div>TenantId: {tenantId || '—'}</div>
      <div>Slug: {tenantSlug || '—'}</div>
      <div>Time: {new Date().toLocaleTimeString()}</div>
    </div>
  );
};
